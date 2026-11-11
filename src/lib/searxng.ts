// Shapes come from JSON captured from searxng 2026.11.2-cccbc9e15, trimmed to the
// fields this app reads. That version sends no number_of_results or paging field.
// corrections and suggestions were empty in every capture; their types come from
// get_json_response in searx/webutils.py at the same commit.

export type Category = 'general' | 'images' | 'news';
export type TimeRange = 'any' | 'day' | 'week' | 'month' | 'year';

export interface SearchResult {
  url: string;
  title: string;
  content: string;
  engine: string;
  engines: string[];
  publishedDate: string | null;
  metadata?: string;
  img_src: string;
  // Not in the captures, which had no pictures on General results. From MainResult in searx/result_types/_base.py.
  thumbnail?: string;
  // Only on image results.
  thumbnail_src?: string;
  resolution?: string;
  source?: string;
}

export interface Answer {
  answer: string;
  engine: string;
  url: string | null;
}

export interface InfoboxLink {
  title: string;
  url: string;
  official?: boolean;
}

export interface InfoboxAttribute {
  label: string;
  value?: string;
}

export interface Infobox {
  infobox: string;
  id: string;
  content: string;
  img_src: string | null;
  engine: string;
  urls?: InfoboxLink[];
  attributes?: InfoboxAttribute[];
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  answers: Answer[];
  corrections: string[];
  infoboxes: Infobox[];
  suggestions: string[];
  // Pairs of engine name and reason.
  unresponsive_engines: [string, string][];
}

const UNREACHABLE =
  "Couldn't reach the search service. If this tab has been open a while, your sign-in may have expired, so try reloading.";

// Completions for a partial query. They're optional, so any failure just means none.
export async function suggest(q: string, language: string, signal: AbortSignal): Promise<string[]> {
  const params = new URLSearchParams({ q });
  if (language) params.set('language', language);
  try {
    const response = await fetch(`/api/autocompleter?${params}`, { signal });
    if (!response.ok || !response.headers.get('content-type')?.includes('json')) return [];
    // OpenSearch's format: [query, completions, descriptions, urls, extras].
    const body: unknown = await response.json();
    const list = Array.isArray(body) ? body[1] : undefined;
    return Array.isArray(list) ? list.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export async function search(
  query: { q: string; category: Category; page: number; time: TimeRange },
  prefs: { safesearch: string; language: string; engines?: readonly string[] },
  signal: AbortSignal,
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q: query.q,
    format: 'json',
    pageno: String(query.page),
    categories: query.category,
  });
  // An explicit engine list replaces the category's engines, as long as no category is sent with it.
  if (prefs.engines?.length) {
    params.delete('categories');
    params.set('engines', prefs.engines.join(','));
  }
  // Anything left out falls back to the server's settings.yml.
  if (query.time !== 'any') params.set('time_range', query.time);
  if (prefs.safesearch) params.set('safesearch', prefs.safesearch);
  if (prefs.language) params.set('language', prefs.language);

  let response: Response;
  try {
    response = await fetch(`/api/search?${params}`, { signal });
  } catch (error) {
    // An expired Access session redirects cross-origin, which fetch reports this way.
    if (signal.aborted) throw error;
    throw new Error(UNREACHABLE);
  }

  // Tunnel and Access error pages are HTML.
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(UNREACHABLE);
  }

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? `Search failed with status ${response.status}.`);
  }
  return body;
}

export interface EngineInfo {
  name: string;
  categories: string[];
  enabled: boolean;
  shortcut: string;
}

// The server's engine list. It's about 100 kB, so only the engines page asks for it.
export async function fetchEngines(signal: AbortSignal): Promise<EngineInfo[]> {
  let response: Response;
  try {
    response = await fetch('/api/config', { signal });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error(UNREACHABLE);
  }
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(UNREACHABLE);
  }
  const body = await response.json();
  return (body.engines as EngineInfo[]).map(({ name, categories, enabled, shortcut }) => ({
    name,
    categories,
    enabled,
    shortcut,
  }));
}

// Result URLs come from third-party engines, so block schemes like javascript:.
export function safeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url, location.href);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}
