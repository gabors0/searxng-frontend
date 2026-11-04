import type { Category } from './searxng';

export interface Route {
  q: string;
  category: Category;
  page: number;
}

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'images', label: 'Images' },
  { id: 'news', label: 'News' },
];

export function readRoute(search: string): Route {
  const params = new URLSearchParams(search);
  const category = params.get('category');
  const page = Number(params.get('page'));
  return {
    q: params.get('q')?.trim() ?? '',
    category: CATEGORIES.find((c) => c.id === category)?.id ?? 'general',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function hrefFor(route: Route): string {
  if (!route.q) return '/';
  const params = new URLSearchParams({ q: route.q });
  if (route.category !== 'general') params.set('category', route.category);
  if (route.page > 1) params.set('page', String(route.page));
  return `/?${params}`;
}
