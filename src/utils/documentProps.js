// @ts-check
/**
 * documentProps -- read and format the Document properties carried by the
 * top-level `Font` and `Flow` lines (see utils/directives.js).
 *
 *   Font "Family" [width=N] [leading=N]   custom text font (core 0.2.0)
 *   Flow LR                                left-to-right flow chart (TD = default)
 *
 * The file is the only place these live: the Document properties form reads
 * them from here and writes them back through `treeOps.setDocument*`. Pure: no
 * React/Redux/MUI; never throws.
 *
 * @typedef {import('./wmParser.js').Token} Token
 * @typedef {{ family: string, width: number|null, leading: number|null }} FontSetting
 *   `width`/`leading` null = not written (core's default or preset applies).
 * @typedef {'TD'|'LR'} FlowDirection
 * @typedef {{ font: FontSetting|null, flow: FlowDirection }} DocumentProps
 */

import { FLOW_DEFAULT } from './directives.js';

/** The built-in font core embeds by default. `Font "Comic Neue"` means the same. */
export const BUILTIN_FAMILY = 'Comic Neue';

/** Core's accepted ranges (font.js); out-of-range values are a hard error. */
export const WIDTH_MIN = 0.3;
export const WIDTH_MAX = 3;
export const LEADING_MIN = 0.8;
export const LEADING_MAX = 4;
export const LEADING_DEFAULT = 1.4;

/**
 * Core's family-name rule (font.js): letters, digits, space, `_`, `.`, `-`;
 * starts with a letter or digit; at most 64 characters. Anything else is a hard
 * render error, so the editor never writes it.
 */
export const FAMILY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _.-]{0,63}$/;

/**
 * Width numbers core already has for two faces (core `font.js` WIDTH_PRESETS,
 * which core does not export). For these the editor leaves `width=` off so
 * core's own measurement applies.
 */
export const CORE_WIDTH_PRESETS = Object.freeze({
  'patrick hand': 0.77,
  'architects daughter': 1.07,
});

/**
 * Trim a typed family name and collapse inner whitespace.
 * @param {unknown} name
 * @returns {string}
 */
export function cleanFamily(name) {
  return typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
}

/**
 * Whether core will accept this family name.
 * @param {unknown} name
 * @returns {boolean}
 */
export function isValidFamily(name) {
  return typeof name === 'string' && FAMILY_PATTERN.test(name);
}

/**
 * Whether a family names the built-in default (case-insensitive).
 * @param {unknown} name
 * @returns {boolean}
 */
export function isBuiltinFamily(name) {
  return cleanFamily(name).toLowerCase() === BUILTIN_FAMILY.toLowerCase();
}

/**
 * Whether core has its own width number for this family.
 * @param {unknown} name
 * @returns {boolean}
 */
export function hasCoreWidthPreset(name) {
  return Object.prototype.hasOwnProperty.call(CORE_WIDTH_PRESETS, cleanFamily(name).toLowerCase());
}

/**
 * Parse a number and clamp it into [min, max], rounded to 2 decimals. Returns
 * null for blank / non-numeric / non-positive input ("not set").
 * @param {unknown} value
 * @param {number} min
 * @param {number} max
 * @returns {number|null}
 */
function clampNumber(value, min, max) {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(Math.min(max, Math.max(min, n)) * 100) / 100;
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
export function normalizeWidth(value) {
  return clampNumber(value, WIDTH_MIN, WIDTH_MAX);
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
export function normalizeLeading(value) {
  return clampNumber(value, LEADING_MIN, LEADING_MAX);
}

/**
 * Format a number the way it is written in the file: no trailing zeros.
 * @param {number} n
 * @returns {string}
 */
export function formatNumber(n) {
  return String(Math.round(n * 100) / 100);
}

/**
 * @typedef {{ component: string, firstValue?: () => string|null, keyedValue?: (key: string) => string|null, tokens?: Token[] }} DirectiveLike
 */

/**
 * First keyless token value of a directive-like object.
 * @param {DirectiveLike} d
 * @returns {string|null}
 */
function firstValueOf(d) {
  if (typeof d.firstValue === 'function') return d.firstValue();
  const t = (d.tokens || []).find((x) => x.kind === 'keyless');
  return t ? t.value : null;
}

/**
 * @param {DirectiveLike} d
 * @param {string} key
 * @returns {string|null}
 */
function keyedValueOf(d, key) {
  if (typeof d.keyedValue === 'function') return d.keyedValue(key);
  const t = (d.tokens || []).find((x) => x.kind === 'keyed' && x.key === key);
  return t ? t.value : null;
}

/**
 * Read a `Font` directive into a FontSetting (null when absent or blank).
 * @param {DirectiveLike|null|undefined} directive
 * @returns {FontSetting|null}
 */
export function readFont(directive) {
  if (!directive || directive.component !== 'Font') return null;
  const family = cleanFamily(firstValueOf(directive));
  if (!family) return null;
  return {
    family,
    width: normalizeWidth(keyedValueOf(directive, 'width')),
    leading: normalizeLeading(keyedValueOf(directive, 'leading')),
  };
}

/**
 * Read a `Flow` directive's direction; anything but LR is the default (TD).
 * @param {DirectiveLike|null|undefined} directive
 * @returns {FlowDirection}
 */
export function readFlow(directive) {
  if (!directive || directive.component !== 'Flow') return FLOW_DEFAULT;
  return String(firstValueOf(directive) || '').toUpperCase() === 'LR' ? 'LR' : 'TD';
}

/**
 * The Document properties of a parsed document. Core uses the FIRST `Font` /
 * `Flow` line when there are duplicates, so this does too.
 * @param {{ directives?: DirectiveLike[] }|null|undefined} doc
 * @returns {DocumentProps}
 */
export function readDocumentProps(doc) {
  const directives = doc && Array.isArray(doc.directives) ? doc.directives : [];
  return {
    font: readFont(directives.find((d) => d.component === 'Font')),
    flow: readFlow(directives.find((d) => d.component === 'Flow')),
  };
}

/**
 * The tokens of a `Font` line for a setting: quoted family, then `width=` and
 * `leading=` only when set (leading also omitted at its default).
 * @param {FontSetting} font
 * @returns {Token[]}
 */
export function fontTokens(font) {
  /** @type {Token[]} */
  const tokens = [{ kind: 'keyless', value: cleanFamily(font.family), quoted: true }];
  const width = normalizeWidth(font.width);
  if (width !== null) tokens.push({ kind: 'keyed', key: 'width', value: formatNumber(width), quoted: false });
  const leading = normalizeLeading(font.leading);
  if (leading !== null && leading !== LEADING_DEFAULT) {
    tokens.push({ kind: 'keyed', key: 'leading', value: formatNumber(leading), quoted: false });
  }
  return tokens;
}

/**
 * The tokens of a `Flow` line.
 * @param {FlowDirection} flow
 * @returns {Token[]}
 */
export function flowTokens(flow) {
  return [{ kind: 'keyless', value: flow === 'LR' ? 'LR' : 'TD', quoted: false }];
}

/**
 * Whether two Document property sets would write the same lines.
 * @param {DocumentProps} a
 * @param {DocumentProps} b
 * @returns {boolean}
 */
export function samePropsInFile(a, b) {
  if (a.flow !== b.flow) return false;
  if (!a.font || !b.font) return !a.font && !b.font;
  const ta = fontTokens(a.font).map((t) => `${t.key ?? ''}=${t.value}`).join(' ');
  const tb = fontTokens(b.font).map((t) => `${t.key ?? ''}=${t.value}`).join(' ');
  return ta === tb;
}
