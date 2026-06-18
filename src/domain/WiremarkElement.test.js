// @ts-check
import { describe, it, expect } from 'vitest';
import WiremarkElement from './WiremarkElement.js';
import WiremarkElementList from './WiremarkElementList.js';

describe('WiremarkElement - construction & toJSON', () => {
  it('defaults to a blank element', () => {
    const el = new WiremarkElement();
    expect(el.id).toBe(null);
    expect(el.component).toBe('');
    expect(el.tokens).toEqual([]);
    expect(el.comment).toBe(null);
    expect(el.leadingTrivia).toEqual([]);
    expect(el.children).toBeInstanceOf(WiremarkElementList);
    expect(el.children).toHaveLength(0);
  });

  it('round-trips through toJSON/constructor', () => {
    const payload = {
      id: '0.1',
      component: 'Button',
      tokens: [
        { kind: 'keyless', value: 'OK', quoted: true },
        { kind: 'keyed', key: 'to', value: 'home', quoted: false },
      ],
      comment: 'note',
      leadingTrivia: ['// before'],
      children: [],
    };
    const el = new WiremarkElement(payload);
    expect(el.toJSON()).toEqual(payload);
    expect(el.clone().toJSON()).toEqual(payload);
  });

  it('hydrates nested children', () => {
    const el = new WiremarkElement({
      component: 'Stack',
      children: [{ component: 'Button', tokens: [], comment: null, leadingTrivia: [], children: [] }],
    });
    expect(el.children).toHaveLength(1);
    expect(el.children[0]).toBeInstanceOf(WiremarkElement);
    expect(el.children[0].component).toBe('Button');
  });
});

describe('WiremarkElement - wmId', () => {
  it('reads the #id keyless token sans #', () => {
    const el = new WiremarkElement({ component: 'Wireframe', tokens: [{ kind: 'keyless', value: '#home', quoted: false }] });
    expect(el.wmId()).toBe('home');
  });

  it('returns null when no #id token', () => {
    const el = new WiremarkElement({ component: 'Button', tokens: [{ kind: 'keyless', value: 'OK', quoted: true }] });
    expect(el.wmId()).toBe(null);
  });
});

describe('WiremarkElement - def / allowsChildren', () => {
  it('resolves a known component def', () => {
    const el = new WiremarkElement({ component: 'Stack' });
    expect(el.def()?.name).toBe('Stack');
  });

  it('returns undefined for an unknown component', () => {
    const el = new WiremarkElement({ component: 'Nope' });
    expect(el.def()).toBeUndefined();
  });

  it('returns undefined def for a blank component', () => {
    const el = new WiremarkElement({ component: '' });
    expect(el.def()).toBeUndefined();
  });

  it('allowsChildren true for a container (Stack)', () => {
    expect(new WiremarkElement({ component: 'Stack' }).allowsChildren()).toBe(true);
  });

  it('allowsChildren false for a leaf (Button)', () => {
    expect(new WiremarkElement({ component: 'Button' }).allowsChildren()).toBe(false);
  });
});

describe('WiremarkElement - getToken / getValue', () => {
  it('getToken finds a keyed token (alias-aware)', () => {
    const el = new WiremarkElement({
      component: 'Button',
      tokens: [{ kind: 'keyed', key: 'href', value: 'home', quoted: false }],
    });
    // href is an alias for `to` on Button.
    expect(el.getToken('to')?.value).toBe('home');
    expect(el.getToken('href')?.value).toBe('home');
  });

  it('getValue reads a keyed token first', () => {
    const el = new WiremarkElement({
      component: 'Button',
      tokens: [{ kind: 'keyed', key: 'variant', value: 'contained', quoted: false }],
    });
    expect(el.getValue('variant')).toBe('contained');
  });

  it('getValue resolves a keyless literal label slot', () => {
    const el = new WiremarkElement({
      component: 'Button',
      tokens: [{ kind: 'keyless', value: 'Save', quoted: true }],
    });
    // Button's first keyless slot is the literal -> label.
    expect(el.getValue('label')).toBe('Save');
  });

  it('getValue resolves a keyless enum slot in order', () => {
    const el = new WiremarkElement({
      component: 'Button',
      tokens: [
        { kind: 'keyless', value: 'Save', quoted: true },
        { kind: 'keyless', value: 'contained', quoted: false },
      ],
    });
    expect(el.getValue('variant')).toBe('contained');
  });

  it('getValue returns undefined for an unset prop', () => {
    const el = new WiremarkElement({ component: 'Button', tokens: [] });
    expect(el.getValue('variant')).toBeUndefined();
  });

  it('getValue resolves keyless tokens by type/value, not position (enum before literal)', () => {
    // Typography slots are [literal->label, enum->variant, enum->align] but the
    // user typed the enum (h4) BEFORE the literal ("Hi"). Resolution is by
    // type/value, so label="Hi" and variant="h4" regardless of token order.
    const el = new WiremarkElement({
      component: 'Typography',
      tokens: [
        { kind: 'keyless', value: 'h4', quoted: false },
        { kind: 'keyless', value: 'Hi', quoted: true },
      ],
    });
    expect(el.getValue('label')).toBe('Hi');
    expect(el.getValue('variant')).toBe('h4');
  });

  it('getValue resolves the Wireframe id + preset slots by characteristic', () => {
    const el = new WiremarkElement({
      component: 'Wireframe',
      tokens: [
        { kind: 'keyless', value: '#home', quoted: false },
        { kind: 'keyless', value: 'mobile', quoted: false },
      ],
    });
    expect(el.getValue('id')).toBe('home');
    expect(el.getValue('preset')).toBe('mobile');
  });
});

describe('WiremarkElement - keylessIndexFor', () => {
  it('returns the index of the keyless token filling a prop slot', () => {
    // `Typography "Test!!" body2` -- body2 (index 1) fills the variant slot.
    const el = new WiremarkElement({
      component: 'Typography',
      tokens: [
        { kind: 'keyless', value: 'Test!!', quoted: true },
        { kind: 'keyless', value: 'body2', quoted: false },
      ],
    });
    expect(el.keylessIndexFor('variant')).toBe(1);
    expect(el.keylessIndexFor('label')).toBe(0);
  });

  it('returns -1 for an unset prop', () => {
    const el = new WiremarkElement({ component: 'Typography', tokens: [] });
    expect(el.keylessIndexFor('variant')).toBe(-1);
  });

  it('returns -1 when the prop is set only by a keyed token', () => {
    const el = new WiremarkElement({
      component: 'Typography',
      tokens: [{ kind: 'keyed', key: 'variant', value: 'h4', quoted: false }],
    });
    expect(el.keylessIndexFor('variant')).toBe(-1);
  });

  it('reports the keyless token even when a keyed token also sets the prop', () => {
    // The buggy duplicate state -- keylessIndexFor still locates the keyless
    // `body2` so the form can heal it.
    const el = new WiremarkElement({
      component: 'Typography',
      tokens: [
        { kind: 'keyless', value: 'body2', quoted: false },
        { kind: 'keyed', key: 'variant', value: 'h4', quoted: false },
      ],
    });
    expect(el.keylessIndexFor('variant')).toBe(0);
  });
});

describe('WiremarkElement - hasFlag', () => {
  it('detects a bare boolean flag (which getValue cannot resolve)', () => {
    const el = new WiremarkElement({
      component: 'Button',
      tokens: [
        { kind: 'keyless', value: 'Get started', quoted: true },
        { kind: 'keyless', value: 'contained', quoted: false },
        { kind: 'keyed', key: 'to', value: '#home', quoted: false },
        { kind: 'keyless', value: 'fullWidth', quoted: false },
        { kind: 'keyless', value: 'disabled', quoted: false },
      ],
    });
    expect(el.hasFlag('disabled')).toBe(true);
    expect(el.hasFlag('fullWidth')).toBe(true);
    // getValue returns undefined for flags -- this is exactly why hasFlag exists.
    expect(el.getValue('disabled')).toBeUndefined();
  });

  it('returns false when the flag is absent', () => {
    const el = new WiremarkElement({
      component: 'Button',
      tokens: [{ kind: 'keyless', value: 'OK', quoted: true }],
    });
    expect(el.hasFlag('disabled')).toBe(false);
  });

  it('does not treat the #id token as a flag', () => {
    const el = new WiremarkElement({
      component: 'Button',
      tokens: [{ kind: 'keyless', value: '#disabled', quoted: false }],
    });
    expect(el.hasFlag('disabled')).toBe(false);
  });

  it('ignores a quoted literal that happens to equal the flag name', () => {
    const el = new WiremarkElement({
      component: 'Button',
      tokens: [{ kind: 'keyless', value: 'disabled', quoted: true }],
    });
    // A quoted "disabled" is a label, not the bare boolean flag.
    expect(el.hasFlag('disabled')).toBe(false);
  });
});
