import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Summary } from './openrouter';
import { cachedSummary, clearSummaries, pruneSummaries, saveSummary, summaryVariant } from './summary-cache';

const KEY = 'ai-summaries';
const HOUR = 60 * 60 * 1000;

function summary(text: string): Summary {
  return { text, cutOff: false, sources: [{ title: 'A page', url: 'https://example.com/' }] };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
  clearSummaries();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('summaryVariant', () => {
  it('is empty for the server defaults', () => {
    expect(summaryVariant({ safesearch: '', language: '' })).toBe('');
    expect(summaryVariant({ safesearch: '', language: '', engines: [] })).toBe('');
  });

  it('differs for each setting', () => {
    const variants = [
      summaryVariant({ safesearch: '', language: '' }),
      summaryVariant({ safesearch: '2', language: '' }),
      summaryVariant({ safesearch: '', language: 'de' }),
      summaryVariant({ safesearch: '', language: '', engines: ['brave'] }),
      summaryVariant({ safesearch: '', language: '', engines: ['brave', 'duckduckgo'] }),
    ];
    expect(new Set(variants).size).toBe(variants.length);
  });

  it('ignores the order of the engines', () => {
    expect(summaryVariant({ safesearch: '', language: '', engines: ['b', 'a'] })).toBe(
      summaryVariant({ safesearch: '', language: '', engines: ['a', 'b'] }),
    );
  });
});

describe('saved summaries', () => {
  it('are found again whatever the spacing and case of the query', () => {
    saveSummary('  Mount   Everest ', '', summary('tall'), true);
    expect(cachedSummary('mount everest', '')?.text).toBe('tall');
  });

  it('are kept apart by search settings', () => {
    const german = summaryVariant({ safesearch: '', language: 'de' });
    saveSummary('everest', '', summary('english'), true);
    saveSummary('everest', german, summary('deutsch'), true);
    expect(cachedSummary('everest', '')?.text).toBe('english');
    expect(cachedSummary('everest', german)?.text).toBe('deutsch');
    expect(cachedSummary('everest', summaryVariant({ safesearch: '2', language: '' }))).toBeUndefined();
  });

  it('replace an older summary of the same search', () => {
    saveSummary('everest', '', summary('old'), true);
    saveSummary('everest', '', summary('new'), true);
    expect(cachedSummary('everest', '')?.text).toBe('new');
    expect(JSON.parse(localStorage.getItem(KEY)!)).toHaveLength(1);
  });

  it('expire after a day', () => {
    saveSummary('everest', '', summary('tall'), true);
    vi.advanceTimersByTime(23 * HOUR);
    expect(cachedSummary('everest', '')).toBeDefined();
    vi.advanceTimersByTime(2 * HOUR);
    expect(cachedSummary('everest', '')).toBeUndefined();
    pruneSummaries();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('stay out of storage when they are not to be kept', () => {
    saveSummary('everest', '', summary('tall'), false);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(cachedSummary('everest', '')?.text).toBe('tall');
  });

  it('are limited to the newest fifty', () => {
    for (let index = 0; index < 55; index += 1) saveSummary(`query ${index}`, '', summary(String(index)), true);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toHaveLength(50);
    clearMemory();
    expect(cachedSummary('query 4', '')).toBeUndefined();
    expect(cachedSummary('query 54', '')?.text).toBe('54');
  });

  it('count as the default settings when saved before settings were tracked', () => {
    localStorage.setItem(KEY, JSON.stringify([{ query: 'everest', savedAt: Date.now(), summary: summary('old') }]));
    expect(cachedSummary('everest', '')?.text).toBe('old');
    expect(cachedSummary('everest', summaryVariant({ safesearch: '', language: 'de' }))).toBeUndefined();
  });

  it('skip damaged entries in storage', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify([
        { query: 'broken', savedAt: Date.now(), summary: { text: 'x', cutOff: false, sources: [{ title: 1 }] } },
        { query: 'everest', savedAt: Date.now(), summary: summary('tall') },
      ]),
    );
    expect(cachedSummary('broken', '')).toBeUndefined();
    expect(cachedSummary('everest', '')?.text).toBe('tall');

    localStorage.setItem(KEY, '{not json');
    expect(cachedSummary('everest', '')).toBeUndefined();
  });
});

// Empties this tab's copy while leaving storage as it is.
function clearMemory() {
  const stored = localStorage.getItem(KEY);
  clearSummaries();
  if (stored) localStorage.setItem(KEY, stored);
}
