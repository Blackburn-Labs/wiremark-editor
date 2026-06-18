// @ts-check
import { describe, it, expect } from 'vitest';
import {
  parseFiller, formatFiller, isFiller, isNumericUnit,
} from './fillerFormat.js';

describe('parseFiller', () => {
  it('parses numeric forms', () => {
    expect(parseFiller('~3')).toEqual({ unit: 'sentences', amount: 3 });
    expect(parseFiller('~5w')).toEqual({ unit: 'words', amount: 5 });
    expect(parseFiller('~2l')).toEqual({ unit: 'lines', amount: 2 });
    expect(parseFiller('~10')).toEqual({ unit: 'sentences', amount: 10 });
  });

  it('parses bucket forms', () => {
    expect(parseFiller('_')).toEqual({ unit: 'short' });
    expect(parseFiller('__')).toEqual({ unit: 'medium' });
    expect(parseFiller('___')).toEqual({ unit: 'long' });
    expect(parseFiller('____')).toEqual({ unit: 'long' }); // 4+ underscores -> long
  });

  it('returns null for non-filler tokens', () => {
    for (const v of ['hello', '#id', '240px', '3', '~', '~w', '~2x', '', 'lorem']) {
      expect(parseFiller(v)).toBeNull();
    }
  });

  it('returns null for non-string input', () => {
    // @ts-expect-error -- exercising the runtime guard
    expect(parseFiller(null)).toBeNull();
    // @ts-expect-error -- exercising the runtime guard
    expect(parseFiller(undefined)).toBeNull();
  });
});

describe('formatFiller', () => {
  it('formats numeric units', () => {
    expect(formatFiller({ unit: 'sentences', amount: 3 })).toBe('~3');
    expect(formatFiller({ unit: 'words', amount: 5 })).toBe('~5w');
    expect(formatFiller({ unit: 'lines', amount: 2 })).toBe('~2l');
  });

  it('formats buckets and ignores amount', () => {
    expect(formatFiller({ unit: 'short' })).toBe('_');
    expect(formatFiller({ unit: 'medium', amount: 9 })).toBe('__');
    expect(formatFiller({ unit: 'long' })).toBe('___');
  });

  it('coerces a missing/invalid numeric amount to 1', () => {
    expect(formatFiller({ unit: 'lines' })).toBe('~1l');
    expect(formatFiller({ unit: 'sentences', amount: 0 })).toBe('~1');
    expect(formatFiller({ unit: 'words', amount: -2 })).toBe('~1w');
  });

  it('returns empty string for an unknown unit', () => {
    // @ts-expect-error -- exercising the default branch
    expect(formatFiller({ unit: 'bogus' })).toBe('');
    expect(formatFiller()).toBe('');
  });
});

describe('parse/format round-trip', () => {
  for (const v of ['~3', '~5w', '~2l', '~1', '~12w', '_', '__', '___']) {
    it(`round-trips ${v}`, () => {
      const parsed = parseFiller(v);
      expect(parsed).not.toBeNull();
      expect(formatFiller(/** @type {import('./fillerFormat.js').Filler} */(parsed))).toBe(v);
    });
  }
});

describe('isFiller', () => {
  it('is true for filler tokens, false otherwise', () => {
    expect(isFiller('~2l')).toBe(true);
    expect(isFiller('__')).toBe(true);
    expect(isFiller('hello')).toBe(false);
    expect(isFiller('#id')).toBe(false);
  });
});

describe('isNumericUnit', () => {
  it('distinguishes numeric units from buckets', () => {
    expect(isNumericUnit('sentences')).toBe(true);
    expect(isNumericUnit('words')).toBe(true);
    expect(isNumericUnit('lines')).toBe(true);
    expect(isNumericUnit('short')).toBe(false);
    expect(isNumericUnit('long')).toBe(false);
  });
});
