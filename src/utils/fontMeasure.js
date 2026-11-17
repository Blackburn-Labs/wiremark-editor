// @ts-check
/**
 * fontMeasure -- how wide a picked font runs compared with the font core sizes
 * text for, written as `width=` on the `Font` line so boxes fit their labels.
 *
 * Core measures text for Comic Neue drawn at 110% (its built-in face carries
 * `size-adjust: 110%`), while a custom face is drawn at its nominal size. So the
 * ratio for one label is: width in the font at 16px / width in Comic Neue at
 * 17.6px. Over a corpus of typical labels (the quoted strings in core's test
 * fixtures, src/data/measureLabels.json), the 99th-percentile ratio, rounded UP to
 * two decimals and clamped to core's 0.3-3 range, errs on the side of fitting.
 *
 * Core has its own numbers for Patrick Hand and Architects Daughter; for those
 * the editor writes no `width=` (see documentProps.hasCoreWidthPreset).
 *
 * `widthFromRatios` / `labelRatios` are pure and unit-tested; `measureFontWidth`
 * needs a canvas and the fonts loaded in the page.
 */

import { WIDTH_MAX, WIDTH_MIN } from './documentProps.js';

/** Font size the candidate is measured at, and Comic Neue at 110% of it. */
export const MEASURE_SIZE = 16;
export const BASELINE_SCALE = 1.1;

/**
 * The 99th-percentile ratio, rounded up to 2 decimals, clamped to core's range.
 * Null when there is nothing usable to measure.
 * @param {number[]} ratios
 * @returns {number|null}
 */
export function widthFromRatios(ratios) {
  const usable = (Array.isArray(ratios) ? ratios : []).filter((r) => Number.isFinite(r) && r > 0);
  if (usable.length === 0) return null;
  usable.sort((a, b) => a - b);
  const p99 = usable[Math.min(usable.length - 1, Math.floor(usable.length * 0.99))];
  // Round up to 2 decimals, with an epsilon so float noise (1.0300000001)
  // doesn't bump a value to the next step.
  const up = Math.ceil(p99 * 100 - 1e-6) / 100;
  return Math.min(WIDTH_MAX, Math.max(WIDTH_MIN, up));
}

/**
 * Per-label width ratios given a measuring function.
 * @param {string[]} labels
 * @param {(text: string) => number} measureCandidate width in the picked font
 * @param {(text: string) => number} measureBaseline width in Comic Neue at 110%
 * @returns {number[]}
 */
export function labelRatios(labels, measureCandidate, measureBaseline) {
  /** @type {number[]} */
  const out = [];
  for (const label of Array.isArray(labels) ? labels : []) {
    if (typeof label !== 'string' || label.trim() === '') continue;
    const base = measureBaseline(label);
    if (!(base > 0)) continue;
    out.push(measureCandidate(label) / base);
  }
  return out;
}

/** Private family name the baseline Comic Neue is registered under. */
const BASELINE_FAMILY = 'wiremark-measure-baseline';
let baselinePromise = null;

/**
 * Register Comic Neue (bundled with the editor via @fontsource) once, under a
 * private family name, for measuring against.
 * @returns {Promise<boolean>}
 */
function loadBaseline() {
  if (!baselinePromise) {
    baselinePromise = (async () => {
      const g = /** @type {*} */ (globalThis);
      if (typeof g.FontFace !== 'function' || !g.document?.fonts) return false;
      const { default: url } = await import('@fontsource/comic-neue/files/comic-neue-latin-400-normal.woff2?url');
      const face = new g.FontFace(BASELINE_FAMILY, `url(${url})`, { weight: '400' });
      await face.load();
      g.document.fonts.add(face);
      return true;
    })().catch(() => {
      baselinePromise = null;
      return false;
    });
  }
  return baselinePromise;
}

/**
 * Measure a family that is already usable in the page (a downloaded FontFace or
 * an installed font). Returns the width to write, or null when it can't be
 * measured (no canvas, baseline failed to load).
 * @param {string} family
 * @returns {Promise<number|null>}
 */
export async function measureFontWidth(family) {
  const g = /** @type {*} */ (globalThis);
  if (!g.document || typeof g.document.createElement !== 'function') return null;
  if (!(await loadBaseline())) return null;
  const ctx = g.document.createElement('canvas').getContext('2d');
  if (!ctx) return null;
  const { default: labels } = await import('../data/measureLabels.json');
  const quoted = `"${String(family).replace(/["\\]/g, '')}"`;
  const width = (/** @type {string} */ font, /** @type {string} */ text) => {
    ctx.font = font;
    return ctx.measureText(text).width;
  };
  const ratios = labelRatios(
    labels,
    (t) => width(`${MEASURE_SIZE}px ${quoted}, monospace`, t),
    (t) => width(`${MEASURE_SIZE * BASELINE_SCALE}px "${BASELINE_FAMILY}", monospace`, t),
  );
  return widthFromRatios(ratios);
}
