// @ts-check
import { describe, it, expect } from 'vitest';
import { REGISTRY, getComponent } from '@wiremark/core';
import {
  componentNames,
  categoryOf,
  componentsByCategory,
  flagsFor,
  fieldsFor,
  keylessSlotsFor,
  iconNames,
  idsInDocument,
} from './registryAdapter.js';
import { iconNames as curatedIconNames } from './iconNames.js';

describe('componentNames', () => {
  it('returns sorted Object.keys(REGISTRY)', () => {
    const names = componentNames();
    const expected = Object.keys(REGISTRY).sort();
    expect(names).toEqual(expected);
  });

  it('is sorted ascending', () => {
    const names = componentNames();
    const copy = [...names].sort();
    expect(names).toEqual(copy);
  });

  it('includes known components', () => {
    const names = componentNames();
    expect(names).toContain('Button');
    expect(names).toContain('Box');
    expect(names).toContain('Card');
  });
});

describe('categoryOf', () => {
  it('matches getComponent(name).category', () => {
    for (const name of componentNames()) {
      expect(categoryOf(name)).toBe(getComponent(name).category);
    }
  });

  it('Button is in the content category', () => {
    expect(categoryOf('Button')).toBe('content');
  });
});

describe('componentsByCategory', () => {
  it('groups every component into its category', () => {
    const byCat = componentsByCategory();
    const total = Object.values(byCat).reduce((n, arr) => n + arr.length, 0);
    expect(total).toBe(componentNames().length);
  });

  it('places each component under the right category', () => {
    const byCat = componentsByCategory();
    expect(byCat[categoryOf('Button')]).toContain('Button');
    expect(byCat[categoryOf('Box')]).toContain('Box');
  });

  it('each category list is sorted', () => {
    const byCat = componentsByCategory();
    for (const list of Object.values(byCat)) {
      expect(list).toEqual([...list].sort());
    }
  });
});

describe('flagsFor', () => {
  it('coerces sparse flags to plain booleans for Box', () => {
    expect(flagsFor('Box')).toEqual({ container: true, sizing: true, text: false });
  });

  it('Button has no container/sizing/text', () => {
    expect(flagsFor('Button')).toEqual({ container: false, sizing: false, text: false });
  });

  it('always returns booleans (never undefined)', () => {
    for (const name of componentNames()) {
      const f = flagsFor(name);
      expect(typeof f.container).toBe('boolean');
      expect(typeof f.sizing).toBe('boolean');
      expect(typeof f.text).toBe('boolean');
    }
  });
});

describe('fieldsFor', () => {
  it('produces one field per prop', () => {
    const def = getComponent('Button');
    const fields = fieldsFor('Button');
    expect(fields.length).toBe(Object.keys(def.props).length);
  });

  it('maps prop types to the right controls', () => {
    const fields = fieldsFor('Button');
    const byName = Object.fromEntries(fields.map((f) => [f.name, f]));
    // string -> text
    expect(byName.label.control).toBe('text');
    // enum -> select (seeded with values)
    expect(byName.variant.control).toBe('select');
    expect(byName.variant.values).toEqual(['text', 'outlined', 'contained']);
    // boolean -> switch
    expect(byName.disabled.control).toBe('switch');
    // number -> number
    expect(byName.padding.control).toBe('number');
    // icon -> icon
    expect(byName.startIcon.control).toBe('icon');
    // ref -> idref
    expect(byName.to.control).toBe('idref');
  });

  it('groups universal props as universal and others as component', () => {
    const fields = fieldsFor('Button');
    const byName = Object.fromEntries(fields.map((f) => [f.name, f]));
    const universal = ['to', 'scrollbar', 'scrollbarValue', 'scrollbarHandle', 'padding', 'background', 'denseBackground', 'opaque'];
    for (const u of universal) {
      if (byName[u]) expect(byName[u].group).toBe('universal');
    }
    // component-specific props are 'component'
    expect(byName.label.group).toBe('component');
    expect(byName.variant.group).toBe('component');
  });

  it('carries through prop defaults when present', () => {
    const byName = Object.fromEntries(fieldsFor('Button').map((f) => [f.name, f]));
    expect(byName.variant.default).toBe('text');
    expect(byName.disabled.default).toBe(false);
    // string label has no default
    expect('default' in byName.label).toBe(false);
  });

  it('maps id-typed props (where present) to idref control', () => {
    // Scan all components for an `id`-typed prop and confirm the control.
    for (const name of componentNames()) {
      for (const f of fieldsFor(name)) {
        if (f.type === 'id' || f.type === 'ref') expect(f.control).toBe('idref');
        if (f.type === 'ratio') expect(f.control).toBe('number');
      }
    }
  });
});

describe('keylessSlotsFor', () => {
  it('returns the Button keyless array as-is', () => {
    const slots = keylessSlotsFor('Button');
    expect(slots).toEqual([
      { kind: 'literal', to: 'label' },
      { kind: 'enum', to: 'variant' },
      { kind: 'enum', to: 'size' },
      { kind: 'enum', to: 'background' },
    ]);
  });

  it('returns [] for Card (undefined keyless)', () => {
    expect(getComponent('Card').keyless).toBeUndefined();
    expect(keylessSlotsFor('Card')).toEqual([]);
  });

  it('never returns undefined for any component', () => {
    for (const name of componentNames()) {
      expect(Array.isArray(keylessSlotsFor(name))).toBe(true);
    }
  });
});

describe('iconNames', () => {
  it('re-exports the curated list', () => {
    expect(iconNames()).toBe(curatedIconNames);
    expect(iconNames().length).toBeGreaterThanOrEqual(150);
  });
});

describe('idsInDocument', () => {
  it('returns [] for null/empty docs', () => {
    expect(idsInDocument(null)).toEqual([]);
    expect(idsInDocument(undefined)).toEqual([]);
    expect(idsInDocument({})).toEqual([]);
    expect(idsInDocument({ frames: [] })).toEqual([]);
  });

  it('collects wmId() from a duck-typed tree, depth-first', () => {
    /** @param {string|null} id @param {Array<*>} [children] */
    const node = (id, children = []) => ({
      wmId: () => id,
      children,
    });
    const doc = {
      frames: [
        node('layout', [
          node(null, [node('editor')]),
          node('sidebar'),
        ]),
        node('dialog', [node('aboutWiremark')]),
      ],
    };
    expect(idsInDocument(doc)).toEqual([
      'layout',
      'editor',
      'sidebar',
      'dialog',
      'aboutWiremark',
    ]);
  });

  it('skips nodes whose wmId() returns null/empty', () => {
    const node = (id) => ({ wmId: () => id, children: [] });
    const doc = { frames: [node(null), node(''), node('keep')] };
    expect(idsInDocument(doc)).toEqual(['keep']);
  });

  it('tolerates nodes without children', () => {
    const doc = { frames: [{ wmId: () => 'a' }] };
    expect(idsInDocument(doc)).toEqual(['a']);
  });

  it('tolerates nodes without a wmId function', () => {
    const doc = { frames: [{ children: [{ wmId: () => 'deep' }] }] };
    expect(idsInDocument(doc)).toEqual(['deep']);
  });
});

describe('unknown/partial component tolerance (regression: live-edit crash)', () => {
  // While typing "AppBar" the component is briefly "A". The adapter must not
  // throw (getComponent returns undefined for unknown/blank names).
  for (const name of ['A', 'Appba', '', 'NotAComponent']) {
    it(`does not throw for ${JSON.stringify(name)}`, () => {
      expect(() => fieldsFor(name)).not.toThrow();
      expect(fieldsFor(name)).toEqual([]);
      expect(() => flagsFor(name)).not.toThrow();
      expect(flagsFor(name)).toEqual({ container: false, sizing: false, text: false });
      expect(() => keylessSlotsFor(name)).not.toThrow();
      expect(keylessSlotsFor(name)).toEqual([]);
      expect(() => categoryOf(name)).not.toThrow();
    });
  }
});
