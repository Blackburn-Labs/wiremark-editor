// @ts-check
/**
 * exportFonts -- render the SVG an export uses, embedding the document's online
 * font so a standalone SVG (and the PNG rasterized from it, which can't see the
 * page's fonts) shows the right face.
 *
 * Only catalog (online) fonts can be embedded: a font installed on the computer
 * can't be read by a web page, so its exports reference it by name and fall
 * back to Comic Neue elsewhere. If the download fails the export still goes
 * ahead, without the font, and the caller shows a notice.
 *
 * `hasBoldText` is pure and unit-tested; `renderForExport` fetches.
 *
 * @typedef {import('./fontSources.js').FontSourceId} FontSourceId
 */

import WiremarkDocument from '../domain/WiremarkDocument.js';
import { safeRender } from './wmRender.js';
import { readDocumentProps, isBuiltinFamily } from './documentProps.js';
import { findFont, loadCatalog } from './fontCatalog.js';
import { exportFontFaces } from './fontLoader.js';

/**
 * Whether a rendered SVG draws any text at weight 600 or above (core only
 * embeds a bold face then, so the export only needs the bold file then).
 * @param {string} svg
 * @returns {boolean}
 */
export function hasBoldText(svg) {
  if (typeof svg !== 'string') return false;
  for (const m of svg.matchAll(/font-weight="([^"]+)"/g)) {
    const w = m[1].trim().toLowerCase();
    if (w === 'bold' || w === 'bolder' || Number(w) >= 600) return true;
  }
  return false;
}

/**
 * @param {string} source wiremark text
 * @param {{ fontSource: FontSourceId|null, theme?: 'light'|'dark' }} opts
 * @returns {Promise<{ svg: string, notice: string|null }>}
 */
export async function renderForExport(source, { fontSource, theme = 'light' }) {
  const plain = safeRender(source, theme);
  const { font } = readDocumentProps(WiremarkDocument.parse(source));
  if (!plain.svg || !font || isBuiltinFamily(font.family)) return { svg: plain.svg, notice: null };

  const entry = findFont(await loadCatalog(), font.family);
  if (!entry) return { svg: plain.svg, notice: null }; // installed font: referenced by name
  if (!fontSource) {
    return {
      svg: plain.svg,
      notice: `Exported without ${font.family}: online fonts are off, so text uses Comic Neue.`,
    };
  }
  try {
    const fontFace = await exportFontFaces(fontSource, entry, hasBoldText(plain.svg));
    const embedded = safeRender(source, theme, { fontFace });
    if (embedded.error) return { svg: plain.svg, notice: null };
    return { svg: embedded.svg, notice: null };
  } catch {
    return {
      svg: plain.svg,
      notice: `Exported without ${font.family}: it couldn't be downloaded, so text uses Comic Neue.`,
    };
  }
}
