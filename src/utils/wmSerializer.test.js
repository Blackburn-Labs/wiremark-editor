// @ts-check
import { describe, it, expect } from 'vitest';
import { parse } from './wmParser.js';
import { serialize } from './wmSerializer.js';

/**
 * Structural comparison: parse output without diagnostics (which serialize does
 * not reproduce -- e.g. tab warnings vanish once tabs are normalized).
 * @param {string} src
 */
function struct(src) {
  const { frames, trailingTrivia } = parse(src);
  return { frames, trailingTrivia };
}

describe('wmSerializer.serialize - basics', () => {
  it('emits a single component line with a trailing newline', () => {
    const out = serialize(parse('Wireframe #home\n'));
    expect(out).toBe('Wireframe #home\n');
  });

  it('indents children two spaces per level', () => {
    const src = 'Wireframe\n  Stack\n    Button "OK"\n';
    expect(serialize(parse(src))).toBe(src);
  });

  it('re-quotes quoted values', () => {
    expect(serialize(parse('Typography "Hello world"\n'))).toBe('Typography "Hello world"\n');
  });

  it('rebuilds keyed tokens', () => {
    const src = 'TextField label="Email" type=email\n';
    expect(serialize(parse(src))).toBe(src);
  });

  it('rebuilds a trailing comment', () => {
    const src = 'Button "OK" // primary\n';
    expect(serialize(parse(src))).toBe(src);
  });

  it('preserves an empty-string label', () => {
    const src = 'Button ""\n';
    expect(serialize(parse(src))).toBe(src);
  });

  it('emits leading trivia at the element indent', () => {
    const src = 'Wireframe\n  // a note\n  Button "OK"\n';
    expect(serialize(parse(src))).toBe(src);
  });

  it('serializes a comment-only document', () => {
    const src = '// just a comment\n';
    expect(serialize(parse(src))).toBe(src);
  });

  it('serializes a blank-only document', () => {
    const out = serialize(parse('\n\n'));
    // Two blank trivia lines + the guaranteed trailing newline.
    expect(out).toBe('\n\n');
  });

  it('serializes an empty document to a single newline', () => {
    expect(serialize(parse(''))).toBe('\n');
  });
});

describe('wmSerializer - idempotency guarantee (3.3)', () => {
  const samples = [
    'Wireframe #home\n  Stack column gap=2\n    Typography h4 "Sign in"\n    TextField "Email" type=email\n    Button "Sign in" contained to=#dashboard\n',
    'Wireframe\n  Box 240px * dotted #editor\n    Typography subtitle1 "Editor" align=center\n',
    'Wireframe #a\n  Button "x"\nWireframe #b\n  Button "y"\n',
    'Button "OK" // a comment\n',
    'Typography "has  multiple  internal  spaces"\n',
    '// leading comment\nWireframe\n\n  // inner note\n  Button ""\n\n// trailing\n',
    'this is not a component\n',
  ];

  for (const src of samples) {
    it(`parse(serialize(parse(x))) is structurally equal to parse(x): ${JSON.stringify(src).slice(0, 40)}`, () => {
      const once = struct(src);
      const round = struct(serialize(parse(src)));
      expect(round).toEqual(once);
    });

    it(`serialize is stable on its own output: ${JSON.stringify(src).slice(0, 40)}`, () => {
      const first = serialize(parse(src));
      const second = serialize(parse(first));
      expect(second).toBe(first);
    });
  }

  it('normalizes multiple spaces and trailing whitespace (not byte-identity)', () => {
    const messy = 'Button    "OK"     contained   \n';
    const clean = serialize(parse(messy));
    expect(clean).toBe('Button "OK" contained\n');
    // But stable thereafter.
    expect(serialize(parse(clean))).toBe(clean);
  });

  it('normalizes tabs to spaces and is stable afterward', () => {
    const tabbed = 'Wireframe\n\tButton "OK"\n';
    const clean = serialize(parse(tabbed));
    expect(clean).toBe('Wireframe\n  Button "OK"\n');
    expect(serialize(parse(clean))).toBe(clean);
  });
});
