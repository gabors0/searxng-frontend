import type { Summary } from './openrouter';

const KEY = 'ai-summaries';
const MAX_SAVED = 50;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface Saved {
  query: string;
  // The search settings the results came from; see summaryVariant. Missing on summaries saved before it was tracked.
  variant?: string;
  savedAt: number;
  summary: Summary;
}

// Storage can be blocked or full, and summaries asked for with the setting off stay out of it.
// This tab's copy still covers back and forward in all of those cases.
let memory: Saved[] = [];

function normalize(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLowerCase();
}

function isFresh(saved: Saved): boolean {
  const age = Date.now() - saved.savedAt;
  return age >= 0 && age < MAX_AGE_MS;
}

function isSource(value: any): boolean {
  return (
    typeof value?.title === 'string' &&
    typeof value.url === 'string' &&
    (value.snippet === undefined || typeof value.snippet === 'string') &&
    (value.image === undefined || typeof value.image === 'string')
  );
}

function isFollowUp(value: any): boolean {
  const search = value?.search;
  return (
    typeof value?.question === 'string' &&
    typeof value.text === 'string' &&
    typeof value.cutOff === 'boolean' &&
    (search === undefined ||
      (typeof search?.query === 'string' && Array.isArray(search.sources) && search.sources.every(isSource)))
  );
}

function isSaved(value: any): value is Saved {
  const followUps = value?.summary?.followUps;
  return (
    typeof value?.query === 'string' &&
    (value.variant === undefined || typeof value.variant === 'string') &&
    typeof value.savedAt === 'number' &&
    typeof value.summary?.text === 'string' &&
    typeof value.summary.cutOff === 'boolean' &&
    Array.isArray(value.summary.sources) &&
    value.summary.sources.every(isSource) &&
    (followUps === undefined || (Array.isArray(followUps) && followUps.every(isFollowUp)))
  );
}

function read(): Saved[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(saved) ? saved.filter(isSaved).filter(isFresh) : [];
  } catch {
    // Storage can be blocked, or the saved value can be damaged.
    return [];
  }
}

function write(entries: Saved[]) {
  try {
    if (entries.length) localStorage.setItem(KEY, JSON.stringify(entries));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage can be blocked or full, which leaves this tab's copy.
  }
}

// Results depend on these settings, so a summary only stands in for a search made with the same ones.
// The server's defaults give '', which also matches summaries saved before settings were tracked.
export function summaryVariant(prefs: { safesearch: string; language: string; engines?: readonly string[] }): string {
  const engines = [...(prefs.engines ?? [])].sort();
  if (!prefs.safesearch && !prefs.language && !engines.length) return '';
  return JSON.stringify([prefs.safesearch, prefs.language, engines]);
}

function matches(saved: Saved, query: string, variant: string): boolean {
  return saved.query === query && (saved.variant ?? '') === variant;
}

export function cachedSummary(query: string, variant: string): Summary | undefined {
  const key = normalize(query);
  return [...read(), ...memory].find((saved) => matches(saved, key, variant) && isFresh(saved))?.summary;
}

export function saveSummary(query: string, variant: string, summary: Summary, keep: boolean) {
  const entry: Saved = { query: normalize(query), variant, savedAt: Date.now(), summary };
  const withEntry = (entries: Saved[]) =>
    [...entries.filter((saved) => !matches(saved, entry.query, variant)), entry].slice(-MAX_SAVED);
  memory = withEntry(memory);
  if (keep) write(withEntry(read()));
}

export function pruneSummaries() {
  write(read());
}

export function clearSummaries() {
  memory = [];
  write([]);
}
