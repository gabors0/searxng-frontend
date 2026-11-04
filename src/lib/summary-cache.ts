import type { Summary } from './openrouter';

const KEY = 'ai-summaries';
const MAX_SAVED = 50;
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface Saved {
  query: string;
  savedAt: number;
  summary: Summary;
}

// Storage can be blocked or full, so this tab also keeps its own copy.
let memory: Saved[] = [];

function normalize(query: string): string {
  return query.trim().replace(/\s+/g, ' ').toLowerCase();
}

function isFresh(saved: Saved): boolean {
  const age = Date.now() - saved.savedAt;
  return age >= 0 && age < MAX_AGE_MS;
}

function isSaved(value: any): value is Saved {
  return (
    typeof value?.query === 'string' &&
    typeof value.savedAt === 'number' &&
    typeof value.summary?.text === 'string' &&
    typeof value.summary.cutOff === 'boolean' &&
    Array.isArray(value.summary.sources) &&
    value.summary.sources.every((source: any) => typeof source?.title === 'string' && typeof source.url === 'string')
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

export function cachedSummary(query: string): Summary | undefined {
  const key = normalize(query);
  return [...read(), ...memory].find((saved) => saved.query === key && isFresh(saved))?.summary;
}

export function saveSummary(query: string, summary: Summary) {
  const entry = { query: normalize(query), savedAt: Date.now(), summary };
  const withEntry = (entries: Saved[]) =>
    [...entries.filter((saved) => saved.query !== entry.query), entry].slice(-MAX_SAVED);
  memory = withEntry(memory);
  write(withEntry(read()));
}

export function pruneSummaries() {
  write(read());
}

export function clearSummaries() {
  memory = [];
  write([]);
}
