// @ts-check
import { getComponent } from '@wiremark/core';
import BasicDomain from './BasicDomain.js';
import WiremarkElementList from './WiremarkElementList.js';

/**
 * WiremarkElement -- one node in the editable outline.
 *
 * Pure domain object: NO React/Redux/MUI. Read-only accessors only; all
 * structural editing lives in `utils/treeOps`. The token model mirrors what the
 * user typed (keyless vs keyed, quoting) so the serializer can round-trip it.
 *
 * @typedef {import('../utils/wmParser.js').Token} Token
 */
export default class WiremarkElement extends BasicDomain {
  /**
   * @param {{
   *   id?: string|null,
   *   line?: number|null,
   *   component?: string,
   *   tokens?: Token[],
   *   comment?: string|null,
   *   leadingTrivia?: string[],
   *   children?: Array<Record<string, unknown>>|WiremarkElementList,
   * }} [data]
   */
  constructor(data = {}) {
    super(data);
    /** @type {string|null} path id assigned by WiremarkDocument.parse */
    this.id = data.id ?? null;
    /**
     * @type {number|null} 1-based source line of this element's content line,
     * for editor cursor <-> selection sync. Positional/derived (re-assigned on
     * every parse), so it is intentionally OMITTED from toJSON().
     */
    this.line = typeof data.line === 'number' ? data.line : null;
    /** @type {string} component name; '' for an unrecognized/blank line */
    this.component = data.component ?? '';
    /** @type {Token[]} ordered tokens, keyless-vs-keyed + quoting preserved */
    this.tokens = Array.isArray(data.tokens) ? data.tokens.map(cloneToken) : [];
    /** @type {string|null} trailing `//` comment text (without `//`) */
    this.comment = data.comment ?? null;
    /** @type {string[]} verbatim blank/comment lines preceding this element */
    this.leadingTrivia = Array.isArray(data.leadingTrivia) ? [...data.leadingTrivia] : [];
    /** @type {WiremarkElementList} */
    this.children = data.children instanceof WiremarkElementList
      ? data.children
      : WiremarkElementList.from(/** @type {*} */ (data.children) ?? []);
  }

  /**
   * Serialize to the plain ElementPayload shape (round-trips the constructor).
   * @returns {{ id: string|null, component: string, tokens: Token[], comment: string|null, leadingTrivia: string[], children: Array<Record<string, unknown>> }}
   */
  toJSON() {
    return {
      id: this.id,
      component: this.component,
      tokens: this.tokens.map(cloneToken),
      comment: this.comment,
      leadingTrivia: [...this.leadingTrivia],
      children: this.children.toJSON(),
    };
  }

  /**
   * The wiremark `#id` (sans `#`): the value of a keyless token starting with
   * `#`. Returns null when the element has none.
   * @returns {string|null}
   */
  wmId() {
    for (const token of this.tokens) {
      if (token.kind === 'keyless' && typeof token.value === 'string' && token.value.startsWith('#')) {
        return token.value.slice(1);
      }
    }
    return null;
  }

  /**
   * The live component definition from the registry, or undefined for an
   * unknown/blank component.
   * @returns {ReturnType<typeof getComponent>|undefined}
   */
  def() {
    if (!this.component) return undefined;
    try {
      return getComponent(this.component);
    } catch {
      return undefined;
    }
  }

  /**
   * Whether this element may contain children (its def is a container).
   * @returns {boolean}
   */
  allowsChildren() {
    return !!this.def()?.container;
  }

  /**
   * Find a keyed token by its key (alias-aware via the def's `aliases`).
   * @param {string} key
   * @returns {Token|undefined}
   */
  getToken(key) {
    const canonical = this.#canonicalKey(key);
    for (const token of this.tokens) {
      if (token.kind === 'keyed' && token.key !== undefined) {
        if (token.key === key || this.#canonicalKey(token.key) === canonical) {
          return token;
        }
      }
    }
    return undefined;
  }

  /**
   * Resolve the value of a prop by name: the keyed token first, else the
   * keyless token that resolves to that prop's slot. Returns undefined when the
   * prop is unset.
   * @param {string} propName
   * @returns {string|undefined}
   */
  getValue(propName) {
    const canonical = this.#canonicalKey(propName);
    const keyed = this.getToken(canonical);
    if (keyed) return keyed.value;
    return this.#resolveKeyless()[canonical]?.value;
  }

  /**
   * The index in `this.tokens` of the keyless token that currently resolves to
   * `propName`'s slot, or -1 when none does. Reports the keyless token
   * regardless of whether a keyed token also sets the prop. Alias-aware.
   *
   * The property form uses this to update a keyless value IN PLACE (`body2` ->
   * `h4`) instead of appending a conflicting `variant=h4` keyed token -- a line
   * with the same prop set keyless AND keyed makes core throw.
   * @param {string} propName
   * @returns {number}
   */
  keylessIndexFor(propName) {
    const canonical = this.#canonicalKey(propName);
    const resolved = this.#resolveKeyless()[canonical];
    return resolved ? resolved.index : -1;
  }

  /**
   * Whether a boolean flag is present -- a bare keyless token whose value equals
   * the flag name (e.g. `disabled`, `fullWidth`). Boolean props in wiremark are
   * bare flags, NOT keyless slots, so they are invisible to `getValue`; the
   * property form's switches read presence through here. Mirrors the presence
   * test in `utils/tokenEdit.toggleFlag` so toggling round-trips.
   * @param {string} flag
   * @returns {boolean}
   */
  hasFlag(flag) {
    const canonical = this.#canonicalKey(flag);
    return this.tokens.some(
      (t) =>
        t.kind === 'keyless'
        && !t.quoted
        && typeof t.value === 'string'
        && !t.value.startsWith('#')
        && (t.value === flag || this.#canonicalKey(t.value) === canonical),
    );
  }

  /**
   * Resolve every keyless token to its slot by TYPE/VALUE (not position) --
   * mirroring wiremark's keyless resolution (SPEC ss.3.2.2): keyless values
   * resolve by type/value alone in any order. A `#`-prefixed token fills the
   * id slot, a quoted token fills the literal slot, a numeric token fills a
   * number/sizing slot, and a bare word fills the enum/preset slot whose prop
   * `values` contain it. Each slot is consumed at most once.
   * @returns {Record<string, { value: string, index: number }>} propName ->
   *   resolved value (sans `#` for ids) and the index of the token that filled it
   */
  #resolveKeyless() {
    const def = this.def();
    const slots = def?.keyless ?? [];
    /** @type {Record<string, { values?: string[] }>} */
    const props = /** @type {*} */ (def?.props ?? {});
    /** @type {Record<string, { value: string, index: number }>} */
    const result = {};
    if (slots.length === 0) return result;
    const filled = new Set();
    /** @param {(s: {kind: string, to: string}) => boolean} pred */
    const take = (pred) => slots.find((s) => !filled.has(s.to) && pred(s));

    this.tokens.forEach((tok, index) => {
      if (tok.kind !== 'keyless' || typeof tok.value !== 'string') return;
      const v = tok.value;
      let slot;
      if (v.startsWith('#')) {
        slot = take((s) => s.kind === 'id' || s.kind === 'preset');
        if (slot) { result[slot.to] = { value: v.slice(1), index }; filled.add(slot.to); return; }
      }
      if (tok.quoted) {
        slot = take((s) => s.kind === 'literal');
        if (slot) { result[slot.to] = { value: v, index }; filled.add(slot.to); return; }
      }
      if (v !== '' && !Number.isNaN(Number(v))) {
        slot = take((s) => s.kind === 'number' || s.kind === 'sizing');
        if (slot) { result[slot.to] = { value: v, index }; filled.add(slot.to); return; }
      }
      slot = take((s) => (s.kind === 'enum' || s.kind === 'preset')
        && Array.isArray(props[s.to]?.values) && props[s.to].values.includes(v));
      if (slot) { result[slot.to] = { value: v, index }; filled.add(slot.to); return; }
      // Unquoted bare text where a literal is still expected (forgiving fallback).
      slot = take((s) => s.kind === 'literal');
      if (slot) { result[slot.to] = { value: v, index }; filled.add(slot.to); }
    });
    return result;
  }

  /**
   * Map an alias to its canonical prop name using the def's `aliases`.
   * @param {string} key
   * @returns {string}
   */
  #canonicalKey(key) {
    const aliases = this.def()?.aliases;
    if (aliases && Object.prototype.hasOwnProperty.call(aliases, key)) {
      return aliases[key];
    }
    return key;
  }
}

// Wire the list's item type now that WiremarkElement is fully defined. This
// breaks the WiremarkElement <-> WiremarkElementList import cycle regardless of
// which module is imported first.
WiremarkElementList.itemType = WiremarkElement;

/**
 * @param {Token} token
 * @returns {Token}
 */
function cloneToken(token) {
  /** @type {Token} */
  const out = { kind: token.kind, value: token.value, quoted: !!token.quoted };
  if (token.kind === 'keyed' && token.key !== undefined) out.key = token.key;
  return out;
}

export { WiremarkElement };
