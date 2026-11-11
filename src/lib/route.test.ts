import { describe, expect, it } from 'vitest';
import { hrefFor, readRoute, searchText, wantsSummary, type Route } from './route';

describe('readRoute', () => {
  it('falls back to the defaults for an empty query string', () => {
    expect(readRoute('')).toEqual({ q: '', category: 'general', page: 1, time: 'any' });
  });

  it('reads every part of the address', () => {
    expect(readRoute('?q=%20cats%20&category=images&time=week&page=3')).toEqual({
      q: 'cats',
      category: 'images',
      page: 3,
      time: 'week',
    });
  });

  it('ignores values it does not know', () => {
    for (const page of ['0', '-2', '1.5', 'abc']) {
      expect(readRoute(`?q=a&category=videos&time=decade&page=${page}`)).toEqual({
        q: 'a',
        category: 'general',
        page: 1,
        time: 'any',
      });
    }
  });
});

describe('hrefFor', () => {
  it('leaves the defaults out of the address', () => {
    expect(hrefFor({ q: '', category: 'general', page: 1, time: 'any' })).toBe('/');
    expect(hrefFor({ q: 'cats', category: 'general', page: 1, time: 'any' })).toBe('/?q=cats');
  });

  it('round-trips through readRoute', () => {
    const route: Route = { q: '- a&b=c ?', category: 'news', page: 4, time: 'month' };
    expect(readRoute(hrefFor(route).slice(1))).toEqual(route);
  });
});

describe('the summary prefix', () => {
  it('asks for a summary and is removed from the search', () => {
    expect(wantsSummary('- tallest mountain')).toBe(true);
    expect(searchText('- tallest mountain')).toBe('tallest mountain');
    expect(searchText('-tallest')).toBe('tallest');
  });

  it('leaves other searches alone', () => {
    expect(wantsSummary('cats -dogs')).toBe(false);
    expect(searchText('cats -dogs')).toBe('cats -dogs');
    expect(searchText('-')).toBe('');
  });
});
