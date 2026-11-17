// @ts-check
/**
 * fontLoader -- download a picked online font, make it usable in the page (for
 * the live preview), and hand its bytes to core for exports.
 *
 * Privacy rules (see PrivacyDialog / tasks/FONT-UI.md):
 *  - Nothing is fetched unless the user has chosen a font source; callers pass
 *    that source explicitly.
 *  - Only the picked font's Latin woff2 (regular, plus bold when needed) is
 *    requested, with no cookies and no referrer.
 *
 * Downloads are cached per source/font/weight for the session; in production
 * the PWA service worker also keeps them (vite.config.js runtimeCaching), so a
 * font downloaded once keeps working offline and in exports.
 *
 * All browser access is guarded: under Node/jsdom without FontFace these
 * functions resolve to "not available" instead of throwing.
 *
 * @typedef {import('./fontCatalog.js').CatalogFont} CatalogFont
 * @typedef {import('./fontSources.js').FontSourceId} FontSourceId
 */

import { fontRequest, latinWoff2FromCss } from './fontSources.js';

/** @type {RequestInit} */
const FETCH_OPTIONS = { credentials: 'omit', referrerPolicy: 'no-referrer', mode: 'cors' };

/** @type {Map<string, Promise<Uint8Array|null>>} */
const bytesCache = new Map();
/** @type {Map<string, Promise<boolean>>} family (lowercase) -> registered */
const registered = new Map();
/** @type {Set<string>} families (lowercase) whose regular face loaded */
const ready = new Set();

/**
 * Download one weight of a font. Resolves null when the source has no such
 * weight (404); rejects on network/other errors.
 * @param {FontSourceId} source
 * @param {CatalogFont} font
 * @param {number} weight
 * @returns {Promise<Uint8Array|null>}
 */
export function fetchFontBytes(source, font, weight) {
  const key = `${source}|${font.id}|${weight}`;
  if (!bytesCache.has(key)) {
    const p = (async () => {
      const g = /** @type {*} */ (globalThis);
      if (typeof g.fetch !== 'function') throw new Error('fetch unavailable');
      const req = fontRequest(source, font, weight);
      let url = req.url;
      if (req.kind === 'css') {
        const cssRes = await g.fetch(url, FETCH_OPTIONS);
        if (cssRes.status === 400 || cssRes.status === 404) return null;
        if (!cssRes.ok) throw new Error(`font CSS request failed (${cssRes.status})`);
        const woff2 = latinWoff2FromCss(await cssRes.text());
        if (!woff2) return null;
        url = woff2;
      }
      const res = await g.fetch(url, FETCH_OPTIONS);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`font request failed (${res.status})`);
      return new Uint8Array(await res.arrayBuffer());
    })();
    // Don't cache failures: a retry (back online) should try again.
    p.catch(() => bytesCache.delete(key));
    bytesCache.set(key, p);
  }
  return /** @type {Promise<Uint8Array|null>} */ (bytesCache.get(key));
}

/**
 * Register bytes as a FontFace in the page under `family`.
 * @param {string} family
 * @param {Uint8Array} bytes
 * @param {string} weight CSS weight, e.g. '400'
 * @returns {Promise<void>}
 */
async function addFace(family, bytes, weight) {
  const g = /** @type {*} */ (globalThis);
  const face = new g.FontFace(family, bytes, { weight, style: 'normal' });
  await face.load();
  g.document.fonts.add(face);
}

/**
 * Download a catalog font (regular, plus bold when it has one) and register it
 * in the page so the inline preview SVG draws with it. Resolves to the size in
 * bytes of the regular face (for the "embedded in exports" note), or rejects.
 * @param {FontSourceId} source
 * @param {CatalogFont} font
 * @returns {Promise<{ bytes: number }>}
 */
export async function loadPreviewFont(source, font) {
  const g = /** @type {*} */ (globalThis);
  if (typeof g.FontFace !== 'function' || !g.document?.fonts) throw new Error('FontFace unavailable');
  const key = font.family.toLowerCase();
  const regular = await fetchFontBytes(source, font, font.weight);
  if (!regular) throw new Error(`${font.family} is not available from this source`);
  if (!registered.has(key)) {
    const p = (async () => {
      await addFace(font.family, regular, '400');
      ready.add(key);
      if (font.hasBold) {
        // Bold is a nicety for the preview; failures fall back to faux bold.
        fetchFontBytes(source, font, 700)
          .then((bold) => (bold ? addFace(font.family, bold, '700') : undefined))
          .catch(() => {});
      }
      return true;
    })();
    p.catch(() => registered.delete(key));
    registered.set(key, p);
  }
  await registered.get(key);
  return { bytes: regular.byteLength };
}

/**
 * Whether this session already downloaded and registered the family.
 * @param {string} family
 * @returns {boolean}
 */
export function isFontLoaded(family) {
  return typeof family === 'string' && ready.has(family.toLowerCase());
}

/**
 * Whether a font with this name is installed on the computer (not one we
 * registered). Measures a sample string as `"Family", <generic>` and as the
 * generic alone, for three generics: if any pair differs, the family resolved to
 * a real installed face. Browsers may hide user-installed fonts from
 * pages (Safari only exposes fonts that ship with the OS), which reads as "not
 * installed".
 * @param {string} family
 * @returns {boolean}
 */
export function isFontInstalled(family) {
  const g = /** @type {*} */ (globalThis);
  if (typeof family !== 'string' || !family.trim()) return false;
  if (!g.document || typeof g.document.createElement !== 'function') return false;
  if (isFontLoaded(family)) return false;
  let ctx;
  try {
    ctx = g.document.createElement('canvas').getContext('2d');
  } catch {
    return false;
  }
  if (!ctx || typeof ctx.measureText !== 'function') return false;
  const sample = 'mmmmmmmmmmlli WWW 0123456789 AaBbQq';
  const quoted = `"${family.replace(/["\\]/g, '')}"`;
  return ['monospace', 'serif', 'sans-serif'].some((generic) => {
    ctx.font = `48px ${generic}`;
    const base = ctx.measureText(sample).width;
    ctx.font = `48px ${quoted}, ${generic}`;
    return Math.abs(ctx.measureText(sample).width - base) > 0.5;
  });
}

/**
 * The `fontFace` render option for an export: the regular face, plus bold when
 * the drawing has bold text and the font has a real bold.
 * @param {FontSourceId} source
 * @param {CatalogFont} font
 * @param {boolean} needBold
 * @returns {Promise<Array<{ family: string, weight: number, data: Uint8Array }>>}
 */
export async function exportFontFaces(source, font, needBold) {
  const regular = await fetchFontBytes(source, font, font.weight);
  if (!regular) throw new Error(`${font.family} is not available from this source`);
  const faces = [{ family: font.family, weight: 400, data: regular }];
  if (needBold && font.hasBold) {
    const bold = await fetchFontBytes(source, font, 700).catch(() => null);
    if (bold) faces.push({ family: font.family, weight: 700, data: bold });
  }
  return faces;
}

/** Test hook: forget every cached download and registration. */
export function resetFontLoader() {
  bytesCache.clear();
  registered.clear();
  ready.clear();
}
