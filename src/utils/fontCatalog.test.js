// @ts-check
import { describe, it, expect } from 'vitest';
import { parseCatalog, findFont, searchFonts, loadCatalog } from './fontCatalog.js';
import { FAMILY_PATTERN } from './documentProps.js';

const ROWS = [
  ['kalam', 'Kalam', 'h', 400, 1],
  ['kaushan-script', 'Kaushan Script', 'h', 400, 0],
  ['karla', 'Karla', 's', 400, 1],
  ['open-sans', 'Open Sans', 's', 400, 1],
  ['patrick-hand', 'Patrick Hand', 'h', 400, 0],
  ['buda', 'Buda', 'd', 300, 0],
  ['bad'], // malformed rows are skipped
  ['x', 'X', '?', 400, 0],
];

describe('parseCatalog', () => {
  it('expands rows and skips malformed ones', () => {
    const cat = parseCatalog(ROWS);
    expect(cat).toHaveLength(6);
    expect(cat[0]).toEqual({ id: 'kalam', family: 'Kalam', category: 'handwriting', weight: 400, hasBold: true });
    expect(cat.find((f) => f.id === 'buda')?.weight).toBe(300);
    expect(parseCatalog(null)).toEqual([]);
  });
});

describe('findFont / searchFonts', () => {
  const cat = parseCatalog(ROWS);

  it('finds a family case-insensitively', () => {
    expect(findFont(cat, ' patrick hand ')?.id).toBe('patrick-hand');
    expect(findFont(cat, 'Nope')).toBeUndefined();
    expect(findFont(cat, '')).toBeUndefined();
  });

  it('ranks exact, then prefix, then word prefix, then substring; handwriting first within a rank', () => {
    expect(searchFonts(cat, 'ka').map((f) => f.family)).toEqual(['Kalam', 'Kaushan Script', 'Karla']);
    expect(searchFonts(cat, 'hand').map((f) => f.family)).toEqual(['Patrick Hand']);
    expect(searchFonts(cat, 'an').map((f) => f.family)).toEqual(['Kaushan Script', 'Patrick Hand', 'Open Sans']);
    expect(searchFonts(cat, 'kalam')[0].family).toBe('Kalam');
  });

  it('lists handwriting fonts first for an empty query, and honors the limit', () => {
    const r = searchFonts(cat, '', 2);
    expect(r).toHaveLength(2);
    expect(r.every((f) => f.category === 'handwriting')).toBe(true);
  });
});

describe('the bundled catalog', () => {
  it("loads, is large, and every family passes core's family-name rule", async () => {
    const cat = await loadCatalog();
    expect(cat.length).toBeGreaterThan(1500);
    expect(cat.every((f) => FAMILY_PATTERN.test(f.family))).toBe(true);
    expect(findFont(cat, 'Kalam')).toMatchObject({ id: 'kalam', hasBold: true });
    expect(findFont(cat, 'Patrick Hand')).toMatchObject({ id: 'patrick-hand', hasBold: false });
  });
});
