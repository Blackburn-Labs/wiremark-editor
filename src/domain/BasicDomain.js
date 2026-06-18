// @ts-check
/**
 * BasicDomain -- the abstract parent of every domain object in the app.
 *
 * Why this exists (see /src/domain/README.md): in React + Redux you must never
 * mutate an object that lives in the store. Instead you clone it, mutate the
 * clone, and put the clone back. Routing every store value through a common
 * base gives us one consistent, enforceable way to do that (`clone`, `with`)
 * plus serialization (`toJSON`) and structural equality (`equals`).
 *
 * Concrete domain objects extend this class, declare their fields in the
 * constructor from a plain-object payload, and (when they hold nested domain
 * objects or need custom (de)serialization) override `toJSON`.
 *
 * @abstract
 */
export default class BasicDomain {
  /**
   * @param {Record<string, unknown>} [data] plain-object payload (typically the
   *   output of another instance's `toJSON()`), used to (re)hydrate the object.
   */
  constructor(data = {}) {
    if (new.target === BasicDomain) {
      throw new TypeError('BasicDomain is abstract and cannot be instantiated directly.');
    }
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      throw new TypeError(
        `${new.target.name} expects a plain-object payload, received: ${describe(data)}`,
      );
    }
  }

  /**
   * Serialize to a plain, JSON-safe object. The default reflects the instance's
   * own enumerable fields, recursively converting nested BasicDomain/BasicArray
   * values. Subclasses with computed/derived state or non-plain fields should
   * override and return exactly the payload their constructor accepts so that
   * `new Cls(instance.toJSON())` round-trips.
   * @returns {Record<string, unknown>}
   */
  toJSON() {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const key of Object.keys(this)) {
      out[key] = toPlain(/** @type {*} */ (this)[key]);
    }
    return out;
  }

  /**
   * Produce a deep, type-preserving copy. The cornerstone of safe Redux updates:
   * clone, mutate the clone, dispatch the clone. Uses `this.constructor` so a
   * subclass instance clones back into the SAME subclass, and routes through
   * `toJSON()` so each level customizes its own copying.
   * @returns {this}
   */
  clone() {
    const Cls = /** @type {new (data: Record<string, unknown>) => this} */ (this.constructor);
    return new Cls(this.toJSON());
  }

  /**
   * Immutable update helper: clone, shallow-apply `patch` to the clone's payload,
   * and rehydrate. Returns a new instance; `this` is untouched. Ideal inside
   * reducers/selectors.
   * @param {Record<string, unknown>} patch fields to override
   * @returns {this}
   */
  with(patch) {
    if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
      throw new TypeError(`with() expects a plain-object patch, received: ${describe(patch)}`);
    }
    const Cls = /** @type {new (data: Record<string, unknown>) => this} */ (this.constructor);
    return new Cls({ ...this.toJSON(), ...patch });
  }

  /**
   * Structural equality by serialized form. Two instances are equal when they
   * are the same concrete type and their `toJSON()` payloads match.
   * @param {unknown} other
   * @returns {boolean}
   */
  equals(other) {
    if (this === other) return true;
    if (!(other instanceof BasicDomain)) return false;
    if (this.constructor !== other.constructor) return false;
    return stableStringify(this.toJSON()) === stableStringify(other.toJSON());
  }
}

/**
 * Recursively convert a value to its JSON-safe plain form, honoring the
 * `toJSON()` contract of nested domain objects/arrays.
 * @param {*} value
 * @returns {*}
 */
function toPlain(value) {
  if (value === null || typeof value !== 'object') return value;
  if (typeof value.toJSON === 'function') return value.toJSON();
  if (Array.isArray(value)) return value.map(toPlain);
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of Object.keys(value)) out[key] = toPlain(value[key]);
  return out;
}

/**
 * Deterministic JSON stringify (object keys sorted at every level) so that
 * field declaration order never affects equality.
 * @param {*} value
 * @returns {string}
 */
function stableStringify(value) {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      /** @type {Record<string, unknown>} */
      const sorted = {};
      for (const k of Object.keys(val).sort()) sorted[k] = val[k];
      return sorted;
    }
    return val;
  });
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function describe(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}
