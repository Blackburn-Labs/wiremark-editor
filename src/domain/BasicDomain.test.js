// @ts-check
import { describe, it, expect } from 'vitest';
import BasicDomain from './BasicDomain.js';

/** A minimal concrete subclass for exercising the base contract. */
class Point extends BasicDomain {
  constructor(data = {}) {
    super(data);
    this.x = data.x ?? 0;
    this.y = data.y ?? 0;
  }
}

describe('BasicDomain', () => {
  it('cannot be instantiated directly', () => {
    // @ts-expect-error -- intentionally instantiating the abstract base
    expect(() => new BasicDomain()).toThrow(TypeError);
  });

  it('rejects a non-object payload', () => {
    // @ts-expect-error -- intentionally wrong type
    expect(() => new Point(42)).toThrow(TypeError);
  });

  it('round-trips through toJSON/constructor', () => {
    const p = new Point({ x: 1, y: 2 });
    expect(p.toJSON()).toEqual({ x: 1, y: 2 });
    expect(new Point(p.toJSON())).toEqual(p);
  });

  it('clone() produces an equal, independent instance of the same type', () => {
    const p = new Point({ x: 3, y: 4 });
    const c = p.clone();
    expect(c).toBeInstanceOf(Point);
    expect(c).not.toBe(p);
    expect(c.equals(p)).toBe(true);
  });

  it('with() returns a new instance and does not mutate the original', () => {
    const p = new Point({ x: 1, y: 1 });
    const moved = p.with({ x: 9 });
    expect(moved.x).toBe(9);
    expect(moved.y).toBe(1);
    expect(p.x).toBe(1);
    expect(moved).not.toBe(p);
  });

  it('equals() is type-aware and order-independent', () => {
    const a = new Point({ x: 1, y: 2 });
    const b = new Point({ y: 2, x: 1 });
    expect(a.equals(b)).toBe(true);
    expect(a.equals({ x: 1, y: 2 })).toBe(false);
  });
});
