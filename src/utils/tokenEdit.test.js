// @ts-check
import { describe, it, expect } from 'vitest';
import {
  setKeyedProp, clearKeyedProp, setProp, clearProp, toggleFlag, setKeylessLabel,
  setIdToken, getKeylessFiller, setKeylessFiller,
} from './tokenEdit.js';

describe('setKeyedProp', () => {
  it('appends a new keyed token', () => {
    const out = setKeyedProp([], 'variant', 'contained');
    expect(out).toEqual([{ kind: 'keyed', key: 'variant', value: 'contained', quoted: false }]);
  });

  it('updates an existing keyed token in place', () => {
    const tokens = [
      { kind: 'keyless', value: 'OK', quoted: true },
      { kind: 'keyed', key: 'variant', value: 'text', quoted: false },
    ];
    const out = setKeyedProp(tokens, 'variant', 'contained');
    expect(out[1]).toEqual({ kind: 'keyed', key: 'variant', value: 'contained', quoted: false });
    expect(out).toHaveLength(2);
  });

  it('supports quoted values', () => {
    const out = setKeyedProp([], 'label', 'Save the file', { quoted: true });
    expect(out[0]).toEqual({ kind: 'keyed', key: 'label', value: 'Save the file', quoted: true });
  });

  it('does not mutate input', () => {
    const tokens = [];
    setKeyedProp(tokens, 'a', 'b');
    expect(tokens).toEqual([]);
  });
});

describe('clearKeyedProp', () => {
  it('removes the matching keyed token', () => {
    const tokens = [
      { kind: 'keyed', key: 'variant', value: 'contained', quoted: false },
      { kind: 'keyless', value: 'OK', quoted: true },
    ];
    expect(clearKeyedProp(tokens, 'variant')).toEqual([
      { kind: 'keyless', value: 'OK', quoted: true },
    ]);
  });

  it('is a no-op when absent', () => {
    const tokens = [{ kind: 'keyless', value: 'OK', quoted: true }];
    expect(clearKeyedProp(tokens, 'variant')).toEqual(tokens);
  });
});

describe('setProp', () => {
  // `Typography "Test!!" body2` -- body2 is the keyless token filling `variant`.
  const keylessVariant = () => [
    { kind: 'keyless', value: 'Test!!', quoted: true },
    { kind: 'keyless', value: 'body2', quoted: false },
  ];

  it('falls back to setKeyedProp when no keyless token holds the prop', () => {
    const out = setProp([], 'variant', 'contained', { keylessIndex: -1 });
    expect(out).toEqual([{ kind: 'keyed', key: 'variant', value: 'contained', quoted: false }]);
  });

  it('updates a keyless token in place instead of appending a keyed token', () => {
    // The bug: changing `variant` used to yield `"Test!!" body2 variant=h4`.
    const out = setProp(keylessVariant(), 'variant', 'h4', { keylessIndex: 1, keepKeyless: true });
    expect(out).toEqual([
      { kind: 'keyless', value: 'Test!!', quoted: true },
      { kind: 'keyless', value: 'h4', quoted: false },
    ]);
  });

  it('drops a stale keyed token when keeping the prop keyless (self-heals duplicates)', () => {
    const tokens = [
      { kind: 'keyless', value: 'Test!!', quoted: true },
      { kind: 'keyless', value: 'body2', quoted: false },
      { kind: 'keyed', key: 'variant', value: 'h4', quoted: false },
    ];
    const out = setProp(tokens, 'variant', 'h5', { keylessIndex: 1, keepKeyless: true });
    expect(out).toEqual([
      { kind: 'keyless', value: 'Test!!', quoted: true },
      { kind: 'keyless', value: 'h5', quoted: false },
    ]);
  });

  it('converts keyless to keyed when the value cannot stay keyless', () => {
    const out = setProp(keylessVariant(), 'variant', 'contained', { keylessIndex: 1, keepKeyless: false });
    expect(out).toEqual([
      { kind: 'keyless', value: 'Test!!', quoted: true },
      { kind: 'keyed', key: 'variant', value: 'contained', quoted: false },
    ]);
  });

  it('does not mutate input', () => {
    const tokens = keylessVariant();
    setProp(tokens, 'variant', 'h4', { keylessIndex: 1, keepKeyless: true });
    expect(tokens).toEqual(keylessVariant());
  });
});

describe('clearProp', () => {
  it('removes the keyless token filling the prop', () => {
    const tokens = [
      { kind: 'keyless', value: 'Test!!', quoted: true },
      { kind: 'keyless', value: 'body2', quoted: false },
    ];
    expect(clearProp(tokens, 'variant', 1)).toEqual([
      { kind: 'keyless', value: 'Test!!', quoted: true },
    ]);
  });

  it('removes both a keyed token and a keyless token for the prop', () => {
    const tokens = [
      { kind: 'keyless', value: 'body2', quoted: false },
      { kind: 'keyed', key: 'variant', value: 'h4', quoted: false },
    ];
    expect(clearProp(tokens, 'variant', 0)).toEqual([]);
  });

  it('only removes the keyed token when keylessIndex is -1', () => {
    const tokens = [
      { kind: 'keyed', key: 'variant', value: 'contained', quoted: false },
      { kind: 'keyless', value: 'OK', quoted: true },
    ];
    expect(clearProp(tokens, 'variant')).toEqual([
      { kind: 'keyless', value: 'OK', quoted: true },
    ]);
  });
});

describe('toggleFlag', () => {
  it('adds a flag when absent', () => {
    expect(toggleFlag([], 'disabled')).toEqual([
      { kind: 'keyless', value: 'disabled', quoted: false },
    ]);
  });

  it('removes a flag when present', () => {
    const tokens = [{ kind: 'keyless', value: 'disabled', quoted: false }];
    expect(toggleFlag(tokens, 'disabled')).toEqual([]);
  });

  it('forces on with on=true', () => {
    const tokens = [{ kind: 'keyless', value: 'disabled', quoted: false }];
    expect(toggleFlag(tokens, 'disabled', true)).toEqual(tokens);
  });

  it('forces off with on=false', () => {
    expect(toggleFlag([], 'disabled', false)).toEqual([]);
  });

  it('does not treat the #id token as a flag', () => {
    const tokens = [{ kind: 'keyless', value: '#home', quoted: false }];
    const out = toggleFlag(tokens, 'home');
    // #home should not be matched/removed; a new 'home' flag is added.
    expect(out).toContainEqual({ kind: 'keyless', value: '#home', quoted: false });
    expect(out).toContainEqual({ kind: 'keyless', value: 'home', quoted: false });
  });
});

describe('setKeylessLabel', () => {
  it('inserts a quoted label at the front when none exists', () => {
    expect(setKeylessLabel([], 'Hello')).toEqual([
      { kind: 'keyless', value: 'Hello', quoted: true },
    ]);
  });

  it('inserts the label after a leading #id token', () => {
    const tokens = [{ kind: 'keyless', value: '#home', quoted: false }];
    expect(setKeylessLabel(tokens, 'Hello')).toEqual([
      { kind: 'keyless', value: '#home', quoted: false },
      { kind: 'keyless', value: 'Hello', quoted: true },
    ]);
  });

  it('replaces an existing quoted label in place', () => {
    const tokens = [
      { kind: 'keyless', value: 'Old', quoted: true },
      { kind: 'keyless', value: 'contained', quoted: false },
    ];
    expect(setKeylessLabel(tokens, 'New')).toEqual([
      { kind: 'keyless', value: 'New', quoted: true },
      { kind: 'keyless', value: 'contained', quoted: false },
    ]);
  });

  it('supports an empty-string label', () => {
    expect(setKeylessLabel([], '')).toEqual([
      { kind: 'keyless', value: '', quoted: true },
    ]);
  });

  it('removes the label with null', () => {
    const tokens = [
      { kind: 'keyless', value: 'Old', quoted: true },
      { kind: 'keyless', value: 'contained', quoted: false },
    ];
    expect(setKeylessLabel(tokens, null)).toEqual([
      { kind: 'keyless', value: 'contained', quoted: false },
    ]);
  });
});

describe('setIdToken', () => {
  it('prepends a #id token when none exists', () => {
    expect(setIdToken([{ kind: 'keyless', value: 'OK', quoted: true }], 'home')).toEqual([
      { kind: 'keyless', value: '#home', quoted: false },
      { kind: 'keyless', value: 'OK', quoted: true },
    ]);
  });

  it('replaces an existing #id token in place', () => {
    const tokens = [
      { kind: 'keyless', value: '#old', quoted: false },
      { kind: 'keyless', value: 'OK', quoted: true },
    ];
    expect(setIdToken(tokens, 'new')).toEqual([
      { kind: 'keyless', value: '#new', quoted: false },
      { kind: 'keyless', value: 'OK', quoted: true },
    ]);
  });

  it('accepts an id that already carries the #', () => {
    expect(setIdToken([], '#home')).toEqual([
      { kind: 'keyless', value: '#home', quoted: false },
    ]);
  });

  it('removes the id token with null or empty', () => {
    const tokens = [
      { kind: 'keyless', value: '#home', quoted: false },
      { kind: 'keyless', value: 'OK', quoted: true },
    ];
    expect(setIdToken(tokens, null)).toEqual([{ kind: 'keyless', value: 'OK', quoted: true }]);
    expect(setIdToken(tokens, '')).toEqual([{ kind: 'keyless', value: 'OK', quoted: true }]);
  });
});

describe('getKeylessFiller', () => {
  it('reads each bare filler form', () => {
    for (const v of ['~3', '~5w', '~2l', '_', '__', '___']) {
      expect(getKeylessFiller([{ kind: 'keyless', value: v, quoted: false }])).toBe(v);
    }
  });

  it('ignores a quoted token that looks like filler (literal "~2l")', () => {
    expect(getKeylessFiller([{ kind: 'keyless', value: '~2l', quoted: true }])).toBeNull();
  });

  it('ignores #id and non-filler bare tokens', () => {
    const tokens = [
      { kind: 'keyless', value: '#home', quoted: false },
      { kind: 'keyless', value: 'contained', quoted: false },
    ];
    expect(getKeylessFiller(tokens)).toBeNull();
  });

  it('returns null when absent', () => {
    expect(getKeylessFiller([])).toBeNull();
  });

  it('finds the filler token among others', () => {
    const tokens = [
      { kind: 'keyless', value: '#home', quoted: false },
      { kind: 'keyless', value: 'Email', quoted: true },
      { kind: 'keyless', value: '~2w', quoted: false },
    ];
    expect(getKeylessFiller(tokens)).toBe('~2w');
  });
});

describe('setKeylessFiller', () => {
  it('appends a bare filler token when none exists', () => {
    expect(setKeylessFiller([], '~3')).toEqual([
      { kind: 'keyless', value: '~3', quoted: false },
    ]);
  });

  it('inserts after a quoted label so "Email" ~2w reads naturally', () => {
    const tokens = [{ kind: 'keyless', value: 'Email', quoted: true }];
    expect(setKeylessFiller(tokens, '~2w')).toEqual([
      { kind: 'keyless', value: 'Email', quoted: true },
      { kind: 'keyless', value: '~2w', quoted: false },
    ]);
  });

  it('inserts after a leading #id when there is no label', () => {
    const tokens = [{ kind: 'keyless', value: '#home', quoted: false }];
    expect(setKeylessFiller(tokens, '~3')).toEqual([
      { kind: 'keyless', value: '#home', quoted: false },
      { kind: 'keyless', value: '~3', quoted: false },
    ]);
  });

  it('replaces an existing filler token in place (never a second one)', () => {
    const tokens = [
      { kind: 'keyless', value: 'subtitle1', quoted: false },
      { kind: 'keyless', value: '~3', quoted: false },
    ];
    const out = setKeylessFiller(tokens, '~5w');
    expect(out).toEqual([
      { kind: 'keyless', value: 'subtitle1', quoted: false },
      { kind: 'keyless', value: '~5w', quoted: false },
    ]);
  });

  it('removes the filler token with null or empty', () => {
    const tokens = [
      { kind: 'keyless', value: 'Email', quoted: true },
      { kind: 'keyless', value: '~2w', quoted: false },
    ];
    const expected = [{ kind: 'keyless', value: 'Email', quoted: true }];
    expect(setKeylessFiller(tokens, null)).toEqual(expected);
    expect(setKeylessFiller(tokens, '')).toEqual(expected);
  });

  it('never quotes the filler token', () => {
    expect(setKeylessFiller([], '__')[0].quoted).toBe(false);
  });

  it('does not touch a non-filler bare token (no false replace)', () => {
    const tokens = [{ kind: 'keyless', value: 'contained', quoted: false }];
    expect(setKeylessFiller(tokens, '~3')).toEqual([
      { kind: 'keyless', value: 'contained', quoted: false },
      { kind: 'keyless', value: '~3', quoted: false },
    ]);
  });

  it('does not mutate input', () => {
    const tokens = [{ kind: 'keyless', value: '~3', quoted: false }];
    setKeylessFiller(tokens, '~5w');
    expect(tokens).toEqual([{ kind: 'keyless', value: '~3', quoted: false }]);
  });
});
