// @ts-check
/**
 * fillerFormat -- pure helpers mapping wiremark "filler amount" tokens
 * (`~3`, `~5w`, `~2l`, and `_`/`__`/`___`) to/from a structured `{ unit, amount }`
 * and back.
 *
 * This MIRRORS `@wiremark/core`'s internal `parseFiller` (src/resolve.js) -- core
 * does NOT export it -- so the editor can recognize and build filler tokens
 * without importing core internals. Keep the two regexes in sync with core.
 *
 * Units:
 *  - `sentences` (`~N`, no suffix; core names this 'units', glossed
 *    "sentences/lines"), `words` (`~Nw`), `lines` (`~Nl`) -- each carries a
 *    numeric `amount`.
 *  - `short` (`_`), `medium` (`__`), `long` (`___` or more) -- buckets, no `amount`.
 *
 * @typedef {'sentences'|'words'|'lines'|'short'|'medium'|'long'} FillerUnit
 * @typedef {{ unit: FillerUnit, amount?: number }} Filler
 */

/** Numeric forms: `~N`, `~Nw`, `~Nl`. Mirrors `@wiremark/core` resolve.js. */
const NUMERIC_RE = /^~(\d+)([wl])?$/;
/** Bucket forms: `_`, `__`, `___`+. Mirrors `@wiremark/core` resolve.js. */
const BUCKET_RE = /^_+$/;

const NUMERIC_UNITS = new Set(['sentences', 'words', 'lines']);

/**
 * Parse a token value as a filler amount; `null` if it is not a filler token.
 * @param {string} value
 * @returns {Filler|null}
 */
export function parseFiller(value) {
  if (typeof value !== 'string') return null;
  const m = NUMERIC_RE.exec(value);
  if (m) {
    const unit = m[2] === 'w' ? 'words' : m[2] === 'l' ? 'lines' : 'sentences';
    return { unit, amount: Number(m[1]) };
  }
  if (BUCKET_RE.test(value)) {
    const n = value.length;
    return { unit: n <= 1 ? 'short' : n === 2 ? 'medium' : 'long' };
  }
  return null;
}

/**
 * Build a filler token string from a structured value. Numeric units coerce
 * `amount` to a positive integer (defaulting to 1); buckets ignore `amount`.
 * Returns `''` for an unknown unit.
 * @param {Filler} filler
 * @returns {string}
 */
export function formatFiller({ unit, amount } = /** @type {Filler} */ ({})) {
  switch (unit) {
    case 'short':
      return '_';
    case 'medium':
      return '__';
    case 'long':
      return '___';
    case 'sentences':
    case 'words':
    case 'lines': {
      const n = Number.isFinite(amount) && Number(amount) >= 1 ? Math.floor(Number(amount)) : 1;
      const suffix = unit === 'words' ? 'w' : unit === 'lines' ? 'l' : '';
      return `~${n}${suffix}`;
    }
    default:
      return '';
  }
}

/**
 * Whether a token value is a valid filler amount token.
 * @param {string} value
 * @returns {boolean}
 */
export function isFiller(value) {
  return parseFiller(value) !== null;
}

/**
 * Whether a unit carries a numeric `amount` (vs. being a bucket).
 * @param {string} unit
 * @returns {boolean}
 */
export function isNumericUnit(unit) {
  return NUMERIC_UNITS.has(unit);
}
