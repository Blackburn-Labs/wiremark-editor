// @ts-check
/**
 * tokenEdit -- pure helpers for editing a `Token[]`.
 *
 * These power the property form: set/clear a keyed prop, toggle a boolean flag,
 * set the keyless literal label, and set the `#id` keyless token. Every function
 * is pure -- it returns a NEW token array and never mutates its input.
 *
 * @typedef {import('./wmParser.js').Token} Token
 */

import { isFiller } from './fillerFormat.js';

/**
 * Deep-copy a token.
 * @param {Token} t
 * @returns {Token}
 */
function copy(t) {
  /** @type {Token} */
  const out = { kind: t.kind, value: t.value, quoted: !!t.quoted };
  if (t.kind === 'keyed' && t.key !== undefined) out.key = t.key;
  return out;
}

/**
 * Set a keyed prop to a value. Updates an existing `key=...` token in place
 * (preserving its position), else appends a new one. Pass `quoted` for string
 * values that may contain spaces.
 * @param {Token[]} tokens
 * @param {string} key
 * @param {string} value
 * @param {{ quoted?: boolean }} [opts]
 * @returns {Token[]}
 */
export function setKeyedProp(tokens, key, value, opts = {}) {
  const quoted = !!opts.quoted;
  const next = tokens.map(copy);
  const idx = next.findIndex((t) => t.kind === 'keyed' && t.key === key);
  /** @type {Token} */
  const token = { kind: 'keyed', key, value, quoted };
  if (idx >= 0) {
    next[idx] = token;
  } else {
    next.push(token);
  }
  return next;
}

/**
 * Remove any keyed token with this key.
 * @param {Token[]} tokens
 * @param {string} key
 * @returns {Token[]}
 */
export function clearKeyedProp(tokens, key) {
  return tokens.filter((t) => !(t.kind === 'keyed' && t.key === key)).map(copy);
}

/**
 * Set a prop value, reconciling with any keyless token that already fills the
 * same slot. `keylessIndex` is that token's position, or -1 when none (get it
 * from `WiremarkElement.keylessIndexFor`):
 *  - keylessIndex < 0: behaves exactly like `setKeyedProp` (update/append keyed).
 *  - keepKeyless: replace the keyless token's value IN PLACE (bare), preserving
 *    the user's keyless style (`Typography "Hi" body2` -> `... h4`), and drop any
 *    stale keyed token for the same prop so it is never set twice.
 *  - otherwise: drop the keyless token and write a keyed one (the new value can't
 *    be expressed at that keyless slot).
 *
 * Without this, changing a keyless-valued prop appended a conflicting `key=value`
 * token (`body2 variant=h4`), which core rejects as a duplicate prop.
 * @param {Token[]} tokens
 * @param {string} key
 * @param {string} value
 * @param {{ quoted?: boolean, keylessIndex?: number, keepKeyless?: boolean }} [opts]
 * @returns {Token[]}
 */
export function setProp(tokens, key, value, opts = {}) {
  const keylessIndex = opts.keylessIndex ?? -1;
  if (keylessIndex < 0 || keylessIndex >= tokens.length) {
    return setKeyedProp(tokens, key, value, opts);
  }
  if (opts.keepKeyless) {
    return tokens
      .map((t, i) => (i === keylessIndex ? { kind: 'keyless', value, quoted: false } : copy(t)))
      .filter((t) => !(t.kind === 'keyed' && t.key === key));
  }
  // The value cannot live at the keyless slot -> remove it, then write keyed.
  const without = tokens.filter((_, i) => i !== keylessIndex);
  return setKeyedProp(without, key, value, opts);
}

/**
 * Clear a prop set EITHER way: drop any keyed `key=...` token AND the keyless
 * token at `keylessIndex` (from `WiremarkElement.keylessIndexFor`; -1 to skip).
 * Without the keyless removal, clearing an enum whose value is keyless (e.g.
 * `Typography "Hi" body2`) would silently leave `body2` behind.
 * @param {Token[]} tokens
 * @param {string} key
 * @param {number} [keylessIndex]
 * @returns {Token[]}
 */
export function clearProp(tokens, key, keylessIndex = -1) {
  return tokens
    .filter((t, i) => i !== keylessIndex && !(t.kind === 'keyed' && t.key === key))
    .map(copy);
}

/**
 * Toggle a bare boolean flag (a keyless token whose value equals `flag`). When
 * `on` is provided, force that state; otherwise flip.
 * @param {Token[]} tokens
 * @param {string} flag
 * @param {boolean} [on]
 * @returns {Token[]}
 */
export function toggleFlag(tokens, flag, on) {
  // A boolean flag is a BARE (unquoted) keyless token. A quoted `"disabled"` is
  // a literal label, not the flag -- never match or remove it (mirrors
  // WiremarkElement.hasFlag).
  const isFlagToken = (t) => t.kind === 'keyless' && !t.quoted && !t.value.startsWith('#') && t.value === flag;
  const present = tokens.some(isFlagToken);
  const shouldBeOn = on === undefined ? !present : on;
  if (shouldBeOn && !present) {
    return [...tokens.map(copy), { kind: 'keyless', value: flag, quoted: false }];
  }
  if (!shouldBeOn && present) {
    return tokens.filter((t) => !isFlagToken(t)).map(copy);
  }
  return tokens.map(copy);
}

/**
 * Set the keyless literal label -- the first quoted keyless token. An empty
 * string is a valid label (renders as `""`). Passing null removes the label.
 * Preserves position when one already exists, else inserts right after a
 * leading `#id` token (or at the front) so labels read naturally.
 * @param {Token[]} tokens
 * @param {string|null} label
 * @returns {Token[]}
 */
export function setKeylessLabel(tokens, label) {
  const next = tokens.map(copy);
  const idx = next.findIndex((t) => t.kind === 'keyless' && t.quoted);

  if (label === null) {
    if (idx >= 0) next.splice(idx, 1);
    return next;
  }

  /** @type {Token} */
  const token = { kind: 'keyless', value: label, quoted: true };
  if (idx >= 0) {
    next[idx] = token;
    return next;
  }
  // Insert after a leading #id token if present, else at the front.
  const idIdx = next.findIndex((t) => t.kind === 'keyless' && t.value.startsWith('#'));
  const insertAt = idIdx >= 0 ? idIdx + 1 : 0;
  next.splice(insertAt, 0, token);
  return next;
}

/**
 * Set (or clear, with null/empty) the `#id` keyless token. The stored value
 * includes the leading `#`. An existing id token is replaced in place; a new one
 * is inserted at the front (ids conventionally lead the line).
 * @param {Token[]} tokens
 * @param {string|null} id id WITHOUT the leading `#` (e.g. `"home"`)
 * @returns {Token[]}
 */
export function setIdToken(tokens, id) {
  const next = tokens.map(copy);
  const idx = next.findIndex((t) => t.kind === 'keyless' && t.value.startsWith('#'));

  if (id === null || id === '') {
    if (idx >= 0) next.splice(idx, 1);
    return next;
  }

  const value = id.startsWith('#') ? id : `#${id}`;
  /** @type {Token} */
  const token = { kind: 'keyless', value, quoted: false };
  if (idx >= 0) {
    next[idx] = token;
  } else {
    next.unshift(token);
  }
  return next;
}

/**
 * A keyless, BARE (unquoted) token whose value is a filler amount (`~3`, `~5w`,
 * `~2l`, `_`/`__`/`___`). Guards mirror `toggleFlag`: a quoted `"~2l"` is a
 * literal label and a `#id` is an id -- neither is filler.
 * @param {Token} t
 * @returns {boolean}
 */
function isFillerToken(t) {
  return t.kind === 'keyless' && !t.quoted && !t.value.startsWith('#') && isFiller(t.value);
}

/**
 * The element's keyless filler amount token value (`~3`, `~5w`, `~2l`,
 * `_`/`__`/`___`), or null when it has none.
 * @param {Token[]} tokens
 * @returns {string|null}
 */
export function getKeylessFiller(tokens) {
  const t = tokens.find(isFillerToken);
  return t ? t.value : null;
}

/**
 * Set (or clear, with null/empty) the keyless filler amount token. Replaces an
 * existing filler token in place; otherwise inserts one after a quoted label (so
 * `"Email" ~2w` reads naturally), else after a leading `#id`, else appends. The
 * token is ALWAYS bare (`quoted:false`) -- that is what makes core treat it as
 * filler rather than literal text. Never creates a second filler token and never
 * matches/replaces a non-filler bare token.
 * @param {Token[]} tokens
 * @param {string|null} value filler token string (e.g. `~2l`), or null to clear
 * @returns {Token[]}
 */
export function setKeylessFiller(tokens, value) {
  const next = tokens.map(copy);
  const idx = next.findIndex(isFillerToken);

  if (value === null || value === '') {
    if (idx >= 0) next.splice(idx, 1);
    return next;
  }

  /** @type {Token} */
  const token = { kind: 'keyless', value, quoted: false };
  if (idx >= 0) {
    next[idx] = token;
    return next;
  }
  // No filler yet -- insert after a quoted label if present, else after a
  // leading #id token, else append at the end.
  const labelIdx = next.findIndex((t) => t.kind === 'keyless' && t.quoted);
  if (labelIdx >= 0) {
    next.splice(labelIdx + 1, 0, token);
    return next;
  }
  const idIdx = next.findIndex((t) => t.kind === 'keyless' && t.value.startsWith('#'));
  next.splice(idIdx >= 0 ? idIdx + 1 : next.length, 0, token);
  return next;
}
