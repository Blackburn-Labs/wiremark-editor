// @ts-check
/**
 * fontSources -- where a picked online font is downloaded from.
 *
 * The user chooses the source once (the "Load online fonts from" prompt); the
 * choice is a browser preference (uiSlice), never written into the document.
 * Whichever source serves a font sees the user's IP address, so the editor
 * fetches NOTHING until a source is chosen, and only the one font picked.
 *
 * All three serve the same Google Fonts library: Bunny Fonts and Fontsource
 * use the same ids (`patrick-hand`); Google is addressed by family name through
 * its CSS API, whose `/* latin *\/` block names the woff2 file.
 *
 * Pure: builds URLs and parses CSS; the fetching lives in fontLoader.js.
 *
 * @typedef {'bunny'|'fontsource'|'google'} FontSourceId
 * @typedef {{ id: FontSourceId, label: string, host: string, note: string }} FontSource
 * @typedef {import('./fontCatalog.js').CatalogFont} CatalogFont
 */

/** @type {ReadonlyArray<FontSource>} Listed in the prompt in this order. */
export const FONT_SOURCES = Object.freeze([
  {
    id: 'bunny',
    label: 'Bunny Fonts',
    host: 'fonts.bunny.net',
    note: 'EU company that says it keeps no visitor logs.',
  },
  {
    id: 'fontsource',
    label: 'Fontsource',
    host: 'cdn.jsdelivr.net',
    note: 'Served through several commercial CDNs.',
  },
  {
    id: 'google',
    label: 'Google Fonts',
    host: 'fonts.gstatic.com',
    note: 'Sends your IP address to Google.',
  },
]);

/**
 * @param {unknown} id
 * @returns {id is FontSourceId}
 */
export function isFontSourceId(id) {
  return FONT_SOURCES.some((s) => s.id === id);
}

/**
 * @param {unknown} id
 * @returns {FontSource|undefined}
 */
export function getFontSource(id) {
  return FONT_SOURCES.find((s) => s.id === id);
}

/**
 * The URL to request for one weight of a font. For Bunny and Fontsource this is
 * the Latin woff2 itself; for Google it is the CSS that names the woff2 (see
 * {@link latinWoff2FromCss}).
 * @param {FontSourceId} source
 * @param {Pick<CatalogFont, 'id'|'family'>} font
 * @param {number} weight
 * @returns {{ url: string, kind: 'font'|'css' }}
 */
export function fontRequest(source, font, weight) {
  const w = Math.round(Number(weight)) || 400;
  const id = encodeURIComponent(font.id);
  if (source === 'google') {
    const family = encodeURIComponent(font.family).replace(/%20/g, '+');
    return { url: `https://fonts.googleapis.com/css2?family=${family}:wght@${w}`, kind: 'css' };
  }
  if (source === 'fontsource') {
    return { url: `https://cdn.jsdelivr.net/fontsource/fonts/${id}@latest/latin-${w}-normal.woff2`, kind: 'font' };
  }
  return { url: `https://fonts.bunny.net/${id}/files/${id}-latin-${w}-normal.woff2`, kind: 'font' };
}

/**
 * From a Google Fonts CSS response, the woff2 URL of the `latin` subset (the
 * block commented `/* latin *\/`), falling back to the only/first woff2 when the
 * CSS has no subset comments. Only https URLs on fonts.gstatic.com are accepted.
 * @param {string} css
 * @returns {string|null}
 */
export function latinWoff2FromCss(css) {
  if (typeof css !== 'string') return null;
  const urlIn = (/** @type {string} */ block) => {
    const m = /src:\s*url\((['"]?)(https:\/\/fonts\.gstatic\.com\/[^)'"\s]+\.woff2)\1\)/.exec(block);
    return m ? m[2] : null;
  };
  const latin = /\/\*\s*latin\s*\*\/\s*@font-face\s*\{([^}]*)\}/.exec(css);
  if (latin) return urlIn(latin[1]);
  return urlIn(css);
}
