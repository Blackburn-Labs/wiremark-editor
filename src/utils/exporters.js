// @ts-check
/**
 * exporters -- export a rendered wiremark SVG as SVG / PNG / PDF.
 *
 * The only pure, unit-tested piece is `parseSvgSize`. Everything else touches
 * the DOM / browser APIs; all such access is guarded so the module imports and
 * the pure logic runs even under a non-browser test environment, and so tests
 * can stub `globalThis`.
 */

/**
 * @typedef {{ width: number, height: number }} SvgSize
 */

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

/**
 * Parse the intrinsic pixel size of an SVG from its root element attributes.
 *
 * Resolution order:
 *  1. numeric `width`/`height` attributes (units like `px` stripped; `%` ignored),
 *  2. the `viewBox` (`min-x min-y width height`) for any dimension still missing,
 *  3. sensible defaults.
 *
 * Pure: no DOM, no globals. Uses a regex scan of the opening `<svg ...>` tag.
 *
 * @param {string} svgString the SVG markup
 * @returns {SvgSize} resolved `{ width, height }` in pixels
 */
export function parseSvgSize(svgString) {
  const svg = typeof svgString === 'string' ? svgString : '';
  // Isolate the opening <svg ...> tag so attributes on inner elements are ignored.
  const openTagMatch = svg.match(/<svg\b[^>]*>/i);
  const openTag = openTagMatch ? openTagMatch[0] : svg;

  let width = readLengthAttr(openTag, 'width');
  let height = readLengthAttr(openTag, 'height');

  if (width === null || height === null) {
    const vb = readViewBox(openTag);
    if (vb) {
      if (width === null) width = vb.width;
      if (height === null) height = vb.height;
    }
  }

  return {
    width: width !== null && width > 0 ? width : DEFAULT_WIDTH,
    height: height !== null && height > 0 ? height : DEFAULT_HEIGHT,
  };
}

/**
 * Read a length-valued attribute (e.g. `width="375"` or `width="100px"`) as a
 * number. Percentage and other non-pixel values return null so the caller can
 * fall back to the viewBox.
 * @param {string} tag the opening svg tag text
 * @param {string} name attribute name
 * @returns {number|null}
 */
function readLengthAttr(tag, name) {
  const re = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"|\\b${name}\\s*=\\s*'([^']*)'`, 'i');
  const m = tag.match(re);
  if (!m) return null;
  const raw = (m[1] !== undefined ? m[1] : m[2]).trim();
  if (raw.endsWith('%')) return null;
  const num = parseFloat(raw.replace(/px$/i, ''));
  return Number.isFinite(num) ? num : null;
}

/**
 * Read the viewBox `width`/`height` (3rd and 4th numbers).
 * @param {string} tag the opening svg tag text
 * @returns {SvgSize|null}
 */
function readViewBox(tag) {
  const m = tag.match(/\bviewBox\s*=\s*["']([^"']*)["']/i);
  if (!m) return null;
  const parts = m[1].trim().split(/[\s,]+/).map(Number);
  if (parts.length < 4 || parts.some((n) => !Number.isFinite(n))) return null;
  return { width: parts[2], height: parts[3] };
}

/**
 * Resolve the DOM `document`, or throw a clear error if unavailable.
 * @returns {Document}
 */
function getDocument() {
  const doc = /** @type {{ document?: Document }} */ (globalThis).document;
  if (!doc) throw new Error('exporters: no document available (not in a browser environment)');
  return doc;
}

/**
 * Trigger a browser download of a Blob (or string) under `name`.
 * @param {Blob|string} data the data to download
 * @param {string} name the file name
 * @param {string} [type] MIME type when `data` is a string
 * @returns {void}
 */
function downloadBlob(data, name, type = 'application/octet-stream') {
  const doc = getDocument();
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = (globalThis.URL || /** @type {*} */ (globalThis).webkitURL).createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = url;
  a.download = name;
  // Some browsers require the anchor to be in the document to honor a click.
  if (doc.body) doc.body.appendChild(a);
  a.click();
  if (doc.body && a.parentNode === doc.body) doc.body.removeChild(a);
  (globalThis.URL || /** @type {*} */ (globalThis).webkitURL).revokeObjectURL(url);
}

/**
 * Ensure a file name carries the given extension (adds it if missing).
 * @param {string} name
 * @param {string} ext extension without the dot, e.g. 'svg'
 * @returns {string}
 */
function withExtension(name, ext) {
  const base = (name && String(name).trim()) || 'wireframe';
  const lower = base.toLowerCase();
  return lower.endsWith(`.${ext}`) ? base : `${base}.${ext}`;
}

/**
 * Download the SVG markup as a `.svg` file.
 * @param {string} svgString the SVG markup
 * @param {string} [name] file name (extension added if missing)
 * @returns {void}
 */
export function exportSvg(svgString, name = 'wireframe.svg') {
  downloadBlob(String(svgString ?? ''), withExtension(name, 'svg'), 'image/svg+xml;charset=utf-8');
}

/**
 * Rasterize an SVG string into a PNG Blob by drawing it (via a data-URL `<img>`)
 * onto a canvas scaled by `scale`.
 * @param {string} svgString the SVG markup
 * @param {{ scale?: number }} [opts] `scale` multiplies the intrinsic size (default 2)
 * @returns {Promise<Blob>} the PNG blob
 */
export function svgToPngBlob(svgString, opts = {}) {
  const scale = opts.scale && opts.scale > 0 ? opts.scale : 2;
  const doc = getDocument();
  const { width, height } = parseSvgSize(String(svgString ?? ''));

  return new Promise((resolve, reject) => {
    try {
      const svg = String(svgString ?? '');
      // Encode as a UTF-8-safe data URL (handles non-ASCII in the markup).
      const encoder = /** @type {{ btoa?: (s: string) => string }} */ (globalThis).btoa;
      let dataUrl;
      if (encoder) {
        const bytes = new TextEncoder().encode(svg);
        let binary = '';
        for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
        dataUrl = `data:image/svg+xml;base64,${encoder(binary)}`;
      } else {
        dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      }

      const ImageCtor = /** @type {{ Image?: new () => HTMLImageElement }} */ (globalThis).Image;
      if (!ImageCtor) {
        reject(new Error('exporters: Image constructor unavailable'));
        return;
      }
      const img = new ImageCtor();
      img.onload = () => {
        try {
          const canvas = doc.createElement('canvas');
          canvas.width = Math.max(1, Math.round(width * scale));
          canvas.height = Math.max(1, Math.round(height * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('exporters: 2d canvas context unavailable'));
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('exporters: canvas.toBlob produced no blob'));
          }, 'image/png');
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error('exporters: failed to load SVG into image'));
      img.src = dataUrl;
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Export an SVG as a downloaded PNG file.
 * @param {string} svgString the SVG markup
 * @param {string} [name] file name (extension added if missing)
 * @param {{ scale?: number }} [opts] passed to {@link svgToPngBlob}
 * @returns {Promise<void>}
 */
export async function exportPng(svgString, name = 'wireframe.png', opts = {}) {
  const blob = await svgToPngBlob(svgString, opts);
  downloadBlob(blob, withExtension(name, 'png'), 'image/png');
}

/**
 * Export an SVG as a downloaded PDF using jsPDF + svg2pdf.js. The parsed `<svg>`
 * element is temporarily attached offscreen because svg2pdf reads computed
 * layout from a live DOM node.
 * @param {string} svgString the SVG markup
 * @param {string} [name] file name (extension added if missing)
 * @returns {Promise<void>}
 */
export async function exportPdf(svgString, name = 'wireframe.pdf') {
  const doc = getDocument();
  const svg = String(svgString ?? '');
  const { width, height } = parseSvgSize(svg);

  // Lazy-load so the (DOM-heavy) PDF deps never run at module import time.
  const { jsPDF } = await import('jspdf');
  await import('svg2pdf.js');

  const pdf = new jsPDF({
    orientation: width >= height ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [width, height],
  });

  // Parse the markup into a live SVG element and attach offscreen.
  const container = doc.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  container.innerHTML = svg;
  const svgEl = container.querySelector('svg');
  if (!svgEl) throw new Error('exporters: could not parse SVG element for PDF export');
  if (doc.body) doc.body.appendChild(container);

  try {
    // jsPDF >=2 exposes an async `.svg()` method (provided by svg2pdf.js).
    await /** @type {{ svg: (el: Element, opts: object) => Promise<unknown> }} */ (
      /** @type {*} */ (pdf)
    ).svg(svgEl, { x: 0, y: 0, width, height });
    pdf.save(withExtension(name, 'pdf'));
  } finally {
    if (doc.body && container.parentNode === doc.body) doc.body.removeChild(container);
  }
}
