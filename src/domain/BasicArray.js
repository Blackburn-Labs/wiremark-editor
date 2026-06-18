// @ts-check
/**
 * BasicArray -- an immutable, type-aware collection of BasicDomain items.
 *
 * Extends the native Array so it reads naturally (`map`, `filter`, indexing,
 * `for..of`, `length`), but every mutating-by-convention operation returns a NEW
 * BasicArray instead of mutating in place -- the same discipline BasicDomain
 * enforces for objects, so collections are safe to hold in the Redux store.
 *
 * Subclass it and set `static itemType = SomeDomainClass` to get automatic
 * (de)hydration of items from plain payloads in `from()` / `toJSON()`.
 *
 * @template {import('./BasicDomain.js').default} T
 * @extends {Array<T>}
 */
export default class BasicArray extends Array {
  /** Concrete subclasses override with their item's domain class. @type {*} */
  static itemType = null;

  /**
   * Build a typed array from raw items or plain payloads. Prefer this over the
   * constructor (Array's constructor treats a single number as a length).
   * @template {import('./BasicDomain.js').default} U
   * @this {new (...items: U[]) => BasicArray<U>}
   * @param {Iterable<U | Record<string, unknown>>} [items]
   * @returns {BasicArray<U>}
   */
  static from(items = []) {
    const Cls = /** @type {*} */ (this);
    const ItemType = Cls.itemType;
    const instance = new Cls();
    for (const item of items) {
      instance.push(hydrate(item, ItemType));
    }
    return instance;
  }

  /** @returns {Array<Record<string, unknown>>} plain payloads of every item */
  toJSON() {
    return this.map((item) => (item && typeof (/** @type {*} */ (item)).toJSON === 'function'
      ? /** @type {*} */ (item).toJSON()
      : item));
  }

  /** @returns {this} a deep, type-preserving copy */
  clone() {
    const Cls = /** @type {*} */ (this.constructor);
    return Cls.from(this.toJSON());
  }

  /**
   * Return a new collection with `item` appended.
   * @param {T | Record<string, unknown>} item
   * @returns {BasicArray<T>}
   */
  add(item) {
    return fromArray(this.constructor, [...this.toJSON(), hydratePayload(item)]);
  }

  /**
   * Return a new collection with `item` inserted at `index`.
   * @param {number} index
   * @param {T | Record<string, unknown>} item
   * @returns {BasicArray<T>}
   */
  insertAt(index, item) {
    const next = [...this.toJSON()];
    next.splice(clampInsert(index, next.length), 0, hydratePayload(item));
    return fromArray(this.constructor, next);
  }

  /**
   * Return a new collection with the item at `index` removed.
   * @param {number} index
   * @returns {BasicArray<T>}
   */
  removeAt(index) {
    const next = [...this.toJSON()];
    if (index >= 0 && index < next.length) next.splice(index, 1);
    return fromArray(this.constructor, next);
  }

  /**
   * Return a new collection with the item at `index` replaced.
   * @param {number} index
   * @param {T | Record<string, unknown>} item
   * @returns {BasicArray<T>}
   */
  replaceAt(index, item) {
    const next = [...this.toJSON()];
    if (index >= 0 && index < next.length) next[index] = hydratePayload(item);
    return fromArray(this.constructor, next);
  }

  /**
   * Return a new collection with the items at `from` and `to` swapped order:
   * the item moves from `from` to `to`, shifting the rest.
   * @param {number} from
   * @param {number} to
   * @returns {BasicArray<T>}
   */
  move(from, to) {
    const next = [...this.toJSON()];
    if (from < 0 || from >= next.length || to < 0 || to >= next.length) {
      return fromArray(this.constructor, next);
    }
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return fromArray(this.constructor, next);
  }
}

/**
 * @param {*} item
 * @param {*} ItemType
 * @returns {*}
 */
function hydrate(item, ItemType) {
  if (!ItemType) return item;
  if (item instanceof ItemType) return item;
  return new ItemType(item);
}

/** Strip an item down to its plain payload for re-hydration. @param {*} item */
function hydratePayload(item) {
  return item && typeof item.toJSON === 'function' ? item.toJSON() : item;
}

/**
 * @param {*} Cls
 * @param {Array<*>} payloads
 * @returns {*}
 */
function fromArray(Cls, payloads) {
  return Cls.from(payloads);
}

/**
 * @param {number} index
 * @param {number} length
 * @returns {number}
 */
function clampInsert(index, length) {
  if (index < 0) return 0;
  if (index > length) return length;
  return index;
}
