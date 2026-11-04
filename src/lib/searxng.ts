// Shapes come from JSON captured from searxng 2026.11.2-cccbc9e15, trimmed to the
// fields this app reads. That version sends no number_of_results or paging field.
// corrections and suggestions were empty in every capture; their types come from
// get_json_response in searx/webutils.py at the same commit.

export type Category = 'general' | 'images' | 'news';

export interface SearchResult {
  url: string;
  title: string;
  content: string;
  engine: string;
  engines: string[];
  publishedDate: string | null;
  metadata?: string;
  img_src: string;
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

export async function search(
  query: { q: string; category: Category; page: number },
  signal: AbortSignal,
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q: query.q,
    format: 'json',
    pageno: String(query.page),
    categories: query.category,
  });

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
