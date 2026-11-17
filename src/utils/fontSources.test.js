// @ts-check
import { describe, it, expect } from 'vitest';
import {
  FONT_SOURCES,
  isFontSourceId,
  getFontSource,
  fontRequest,
  latinWoff2FromCss,
} from './fontSources.js';

const KALAM = { id: 'kalam', family: 'Kalam' };
const PATRICK = { id: 'patrick-hand', family: 'Patrick Hand' };

describe('font sources', () => {
  it('lists Bunny first, then Fontsource, then Google', () => {
    expect(FONT_SOURCES.map((s) => s.id)).toEqual(['bunny', 'fontsource', 'google']);
    expect(isFontSourceId('google')).toBe(true);
    expect(isFontSourceId('cdn')).toBe(false);
    expect(getFontSource('bunny')?.label).toBe('Bunny Fonts');
  });

  it('builds Bunny and Fontsource file URLs from the shared id', () => {
    expect(fontRequest('bunny', PATRICK, 400)).toEqual({
      url: 'https://fonts.bunny.net/patrick-hand/files/patrick-hand-latin-400-normal.woff2',
      kind: 'font',
    });
    expect(fontRequest('fontsource', KALAM, 700)).toEqual({
      url: 'https://cdn.jsdelivr.net/fontsource/fonts/kalam@latest/latin-700-normal.woff2',
      kind: 'font',
    });
  });

  it('asks Google for CSS by family name', () => {
    expect(fontRequest('google', PATRICK, 400)).toEqual({
      url: 'https://fonts.googleapis.com/css2?family=Patrick+Hand:wght@400',
      kind: 'css',
    });
  });
});

describe('latinWoff2FromCss', () => {
  const CSS = `/* devanagari */
@font-face {
  font-family: 'Kalam';
  src: url(https://fonts.gstatic.com/s/kalam/v18/deva.woff2) format('woff2');
}
/* latin-ext */
@font-face {
  font-family: 'Kalam';
  src: url(https://fonts.gstatic.com/s/kalam/v18/ext.woff2) format('woff2');
}
/* latin */
@font-face {
  font-family: 'Kalam';
  src: url(https://fonts.gstatic.com/s/kalam/v18/latin.woff2) format('woff2');
}`;

  it('picks the latin block', () => {
    expect(latinWoff2FromCss(CSS)).toBe('https://fonts.gstatic.com/s/kalam/v18/latin.woff2');
  });

  it('falls back to the only woff2 when there are no subset comments', () => {
    expect(latinWoff2FromCss("@font-face{src:url('https://fonts.gstatic.com/s/x/a.woff2') format('woff2')}"))
      .toBe('https://fonts.gstatic.com/s/x/a.woff2');
  });

  it('rejects other hosts and non-woff2 files', () => {
    expect(latinWoff2FromCss('/* latin */ @font-face { src: url(https://evil.example/a.woff2); }')).toBeNull();
    expect(latinWoff2FromCss('@font-face { src: url(https://fonts.gstatic.com/a.ttf); }')).toBeNull();
    expect(latinWoff2FromCss(undefined)).toBeNull();
  });
});
