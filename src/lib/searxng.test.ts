import { describe, expect, it } from 'vitest';
import { faviconUrl, resultImage, safeUrl } from './searxng';

describe('safeUrl', () => {
  it('keeps http and https addresses', () => {
    expect(safeUrl('https://example.com/a?b=c')).toBe('https://example.com/a?b=c');
    expect(safeUrl('http://example.com')).toBe('http://example.com/');
  });

  it('blocks other schemes and missing values', () => {
    for (const url of ['javascript:alert(1)', 'data:image/png;base64,AAAA', 'file:///etc/passwd', '', null, undefined]) {
      expect(safeUrl(url)).toBeUndefined();
    }
  });
});

describe('resultImage', () => {
  it('takes the first picture field that is filled', () => {
    expect(resultImage({ thumbnail: 'https://a.test/t.png', img_src: 'https://a.test/full.png' })).toBe(
      'https://a.test/t.png',
    );
    expect(resultImage({ thumbnail: '', img_src: 'https://a.test/full.png' })).toBe('https://a.test/full.png');
    expect(resultImage({ img_src: '', thumbnail_src: 'https://a.test/small.png' })).toBe('https://a.test/small.png');
  });

  it('gives nothing without a usable picture', () => {
    expect(resultImage({ img_src: '' })).toBeUndefined();
    expect(resultImage({ img_src: 'data:image/png;base64,AAAA' })).toBeUndefined();
  });
});

describe('faviconUrl', () => {
  it('points at the icon on the page\'s own origin', () => {
    expect(faviconUrl('https://www.example.com:8443/a/b?c=d')).toBe('https://www.example.com:8443/favicon.ico');
  });

  it('gives nothing for an unsafe address', () => {
    expect(faviconUrl('javascript:alert(1)')).toBeUndefined();
    expect(faviconUrl(undefined)).toBeUndefined();
  });
});
