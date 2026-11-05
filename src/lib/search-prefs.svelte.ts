import { load, save } from './storage';

// '' leaves the choice to the server's settings.yml, so nothing is sent.
export type SafeSearch = '' | '0' | '1' | '2';

export const SAFE_SEARCH: { id: SafeSearch; label: string }[] = [
  { id: '', label: 'Default' },
  { id: '0', label: 'Off' },
  { id: '1', label: 'Moderate' },
  { id: '2', label: 'Strict' },
];

// searxng rejects codes outside xx or xx-XX, which rules out some of the locales its /config lists.
const CODES = [
  'en', 'en-US', 'en-GB', 'de', 'de-DE', 'fr', 'es', 'it', 'nl', 'pt', 'pt-BR', 'pl', 'cs', 'sk', 'hu', 'ro',
  'bg', 'el', 'sv', 'da', 'nb', 'fi', 'et', 'lv', 'lt', 'uk', 'ru', 'tr', 'ar', 'he', 'fa', 'hi', 'id', 'vi',
  'th', 'ja', 'ko', 'zh-CN', 'zh-TW',
];

const names = new Intl.DisplayNames(['en'], { type: 'language' });

export const LANGUAGES: { id: string; label: string }[] = [
  { id: '', label: 'Default' },
  { id: 'all', label: 'All languages' },
  { id: 'auto', label: 'Detect from query' },
  ...CODES.map((id) => ({ id, label: names.of(id) ?? id })).sort((a, b) => a.label.localeCompare(b.label)),
];

export const searchPrefs = $state({
  safesearch: load<SafeSearch>('safesearch', '', ['0', '1', '2']),
  language: load<string>(
    'language',
    '',
    LANGUAGES.map((language) => language.id),
  ),
});

export function setSafeSearch(safesearch: SafeSearch) {
  searchPrefs.safesearch = safesearch;
  save('safesearch', safesearch);
}

export function setLanguage(language: string) {
  searchPrefs.language = language;
  save('language', language);
}
