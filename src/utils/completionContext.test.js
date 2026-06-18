// @ts-check
import { describe, it, expect } from 'vitest';
import { analyzeCompletion } from './completionContext.js';
import {
  componentNames,
  iconNames,
  keylessSlotsFor,
} from './registryAdapter.js';
import { getComponent } from '@wiremark/core';

/**
 * Helper: build input where the cursor sits at the end of `lineText`.
 * @param {string} lineText
 * @param {string} [docText]
 */
const atEnd = (lineText, docText = '') => ({
  lineText,
  columnInLine: lineText.length,
  docText,
});

describe('analyzeCompletion -- component kind', () => {
  it.each([
    ['empty line', ''],
    ['indentation only', '  '],
    ['deep indentation only', '      '],
  ])('line start (%s) -> component with all names', (_label, lineText) => {
    const r = analyzeCompletion(atEnd(lineText));
    expect(r.kind).toBe('component');
    expect(r.token).toBe('');
    expect(r.options).toEqual(componentNames());
  });

  it('partial leading word -> still component, token is the fragment', () => {
    const r = analyzeCompletion(atEnd('  But'));
    expect(r.kind).toBe('component');
    expect(r.token).toBe('But');
    expect(r.options).toEqual(componentNames());
  });

  it('cursor mid-indentation before any text -> component', () => {
    const r = analyzeCompletion({ lineText: '    Button', columnInLine: 2 });
    expect(r.kind).toBe('component');
  });
});

describe('analyzeCompletion -- keyless kind', () => {
  it('bare word after a known component -> keyless with enum values', () => {
    const r = analyzeCompletion(atEnd('  Button con'));
    expect(r.kind).toBe('keyless');
    expect(r.componentName).toBe('Button');
    expect(r.token).toBe('con');
    // Button has enum keyless slots variant/size/background.
    expect(r.options).toEqual(expect.arrayContaining(['contained', 'outlined', 'text']));
  });

  it('includes boolean-flag prop names', () => {
    const r = analyzeCompletion(atEnd('  Button '));
    expect(r.kind).toBe('keyless');
    // Button has boolean props disabled / fullWidth / denseBackground.
    expect(r.options).toEqual(expect.arrayContaining(['disabled', 'fullWidth']));
  });

  it('includes icon names when the component has an icon prop (Button)', () => {
    const r = analyzeCompletion(atEnd('  Button '));
    const icons = iconNames();
    expect(r.options).toEqual(expect.arrayContaining([icons[0]]));
  });

  it('includes icon names for a component whose keyless slot targets an icon prop (Icon)', () => {
    // Confirm Icon's keyless slot points at an icon-typed prop.
    const def = getComponent('Icon');
    const slot = keylessSlotsFor('Icon')[0];
    expect(def.props[slot.to].type).toBe('icon');

    const r = analyzeCompletion(atEnd('  Icon Sea'));
    expect(r.kind).toBe('keyless');
    expect(r.componentName).toBe('Icon');
    expect(r.options).toEqual(expect.arrayContaining([iconNames()[0]]));
  });

  it('no icon names when component has no icon slot (Typography)', () => {
    const def = getComponent('Typography');
    const hasIcon = Object.values(def.props).some((p) => p.type === 'icon');
    expect(hasIcon).toBe(false);

    const r = analyzeCompletion(atEnd('  Typography bo'));
    expect(r.kind).toBe('keyless');
    const icons = new Set(iconNames());
    expect(r.options.some((o) => icons.has(o))).toBe(false);
  });

  it('options are deduplicated', () => {
    const r = analyzeCompletion(atEnd('  Button '));
    expect(new Set(r.options).size).toBe(r.options.length);
  });

  it('unknown (non-PascalCase / fake) component -> none', () => {
    const r = analyzeCompletion(atEnd('  notacomponent foo'));
    expect(r.kind).toBe('none');
    expect(r.options).toEqual([]);
  });

  it('unknown PascalCase component -> none', () => {
    const r = analyzeCompletion(atEnd('  Frobnicator bar'));
    expect(r.kind).toBe('none');
  });
});

describe('analyzeCompletion -- propValue kind', () => {
  it('key= -> propValue with that enum prop values', () => {
    const r = analyzeCompletion(atEnd('  Button variant='));
    expect(r.kind).toBe('propValue');
    expect(r.propName).toBe('variant');
    expect(r.componentName).toBe('Button');
    expect(r.token).toBe('');
    expect(r.options).toEqual(['text', 'outlined', 'contained']);
  });

  it('key=partial -> propValue, token is the partial value', () => {
    const r = analyzeCompletion(atEnd('  Button size=sm'));
    expect(r.kind).toBe('propValue');
    expect(r.propName).toBe('size');
    expect(r.token).toBe('sm');
    expect(r.options).toEqual(['small', 'medium', 'large']);
  });

  it('non-enum prop (string) -> propValue with empty options', () => {
    const r = analyzeCompletion(atEnd('  Button label='));
    expect(r.kind).toBe('propValue');
    expect(r.propName).toBe('label');
    expect(r.options).toEqual([]);
  });

  it('alias key resolves to canonical enum prop', () => {
    // 'pad' aliases to 'padding' (a number, not enum) -> empty options but still propValue.
    const r = analyzeCompletion(atEnd('  Button pad='));
    expect(r.kind).toBe('propValue');
    expect(r.propName).toBe('pad');
  });

  it('unknown prop on a known component -> propValue, empty options', () => {
    const r = analyzeCompletion(atEnd('  Button bogus='));
    expect(r.kind).toBe('propValue');
    expect(r.options).toEqual([]);
  });
});

describe('analyzeCompletion -- idref kind', () => {
  const doc = [
    'Wireframe #home',
    '  Button "Go" to=#next',
    'Wireframe #next',
    '  Stack',
    '    Button "Back"',
    'Wireframe #settings',
  ].join('\n');

  it('to=# -> idref with #-prefixed document ids', () => {
    const r = analyzeCompletion(atEnd('  Button to=#', doc));
    expect(r.kind).toBe('idref');
    expect(r.propName).toBe('to');
    expect(r.options).toEqual(expect.arrayContaining(['#home', '#next', '#settings']));
    expect(r.options.every((o) => o.startsWith('#'))).toBe(true);
  });

  it('href=# (alias) -> idref', () => {
    const r = analyzeCompletion(atEnd('  Button href=#se', doc));
    expect(r.kind).toBe('idref');
    expect(r.propName).toBe('href');
    expect(r.token).toBe('#se');
    expect(r.options).toContain('#settings');
  });

  it('any value starting with # -> idref', () => {
    const r = analyzeCompletion(atEnd('  Wireframe background=#ho', doc));
    expect(r.kind).toBe('idref');
    expect(r.options).toContain('#home');
  });

  it('bare #fragment (e.g. Wireframe #id) -> idref', () => {
    const r = analyzeCompletion(atEnd('  Wireframe #ho', doc));
    expect(r.kind).toBe('idref');
    expect(r.token).toBe('#ho');
    expect(r.options).toContain('#home');
  });

  it('idref with empty doc -> empty options', () => {
    const r = analyzeCompletion(atEnd('  Button to=#', ''));
    expect(r.kind).toBe('idref');
    expect(r.options).toEqual([]);
  });
});

describe('analyzeCompletion -- robustness', () => {
  it('missing input fields default safely', () => {
    // @ts-expect-error intentional empty input
    const r = analyzeCompletion({});
    expect(r.kind).toBe('component');
    expect(r.options).toEqual(componentNames());
  });

  it('undefined input does not throw', () => {
    // @ts-expect-error intentional undefined
    const r = analyzeCompletion(undefined);
    expect(r.kind).toBe('component');
  });

  it('columnInLine clamps within line bounds', () => {
    const r = analyzeCompletion({ lineText: '  Button con', columnInLine: 999 });
    expect(r.kind).toBe('keyless');
    expect(r.token).toBe('con');
  });

  it('cursor before end keeps only the text to its left', () => {
    // Cursor right after "Button " (col 9) -> empty fragment, keyless.
    const r = analyzeCompletion({ lineText: '  Button contained', columnInLine: 9 });
    expect(r.kind).toBe('keyless');
    expect(r.token).toBe('');
  });
});
