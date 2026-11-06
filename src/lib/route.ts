import type { Category, TimeRange } from './searxng';

export interface Route {
  q: string;
  category: Category;
  page: number;
  time: TimeRange;
}

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'images', label: 'Images' },
  { id: 'news', label: 'News' },
];

export const TIME_RANGES: { id: TimeRange; label: string }[] = [
  { id: 'any', label: 'Any time' },
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

// A leading "-" asks for an AI summary of that search, even with the setting off. It's removed before searching,
// because engines read "-word" as leaving that word out.
const SUMMARY_PREFIX = /^-\s*/;

export function wantsSummary(q: string): boolean {
  return SUMMARY_PREFIX.test(q);
}

export function searchText(q: string): string {
  return q.replace(SUMMARY_PREFIX, '');
}

export function readRoute(search: string): Route {
  const params = new URLSearchParams(search);
  const category = params.get('category');
  const time = params.get('time');
  const page = Number(params.get('page'));
  return {
    q: params.get('q')?.trim() ?? '',
    category: CATEGORIES.find((c) => c.id === category)?.id ?? 'general',
    page: Number.isInteger(page) && page > 0 ? page : 1,
    time: TIME_RANGES.find((t) => t.id === time)?.id ?? 'any',
  };
}

export function hrefFor(route: Route): string {
  const params = new URLSearchParams();
  if (route.q) params.set('q', route.q);
  if (route.category !== 'general') params.set('category', route.category);
  if (route.time !== 'any') params.set('time', route.time);
  if (route.page > 1) params.set('page', String(route.page));
  const query = params.toString();
  return query ? `/?${query}` : '/';
}
