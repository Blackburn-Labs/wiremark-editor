// @ts-check
/**
 * wmRender -- the ONLY entry point into `@wiremark/core`'s `render()`.
 *
 * Why this exists: the editor is live, so users
 * type invalid wiremark constantly. `render()` THROWS a `WiremarkError` on every
 * hard error (unknown component, unquoted text, etc.). The preview must never
 * crash, so every call into core is guarded here.
 *
 * On a hard error we surface the error's line as a single `error` diagnostic and
 * return the LAST GOOD svg (kept in a module-level variable) so the preview
 * degrades gracefully instead of blanking out.
 */

import { render } from '@wiremark/core';

/**
 * @typedef {{ line: number|undefined, severity: 'error'|'warning', message: string }} Diagnostic
 * @typedef {{ svg: string, diagnostics: Diagnostic[], error: Error|null }} RenderResult
 */

/**
 * Module-level cache of the most recent successfully-rendered svg, kept SEPARATE
 * for plain vs interactive output. The live preview renders INTERACTIVE markup
 * (each element wrapped in a `<g data-wm-line ...>` handle) while exporters render
 * CLEAN markup; a degraded fallback must hand back the matching flavour so an
 * exporter never leaks interactive handles (nor the preview lose its handles).
 * When a render throws we fall back to the relevant cache so the view keeps
 * showing the last valid drawing rather than going blank.
 * @type {{ plain: string, interactive: string }}
 */
const lastGood = { plain: '', interactive: '' };

/**
 * Render wiremark source to an SVG, never throwing.
 *
 * @param {string} source the wiremark text
 * @param {'light'|'dark'} [theme] render theme (defaults to 'light')
 * @param {{ interactive?: boolean }} [options] when `interactive` is true, core
 *   wraps each element and frame in a `<g>` carrying `data-wm-line` (plus
 *   `data-wm-id`/`data-wm-component`/`data-wm-to`) so the host can map a click
 *   back to the source line. Off by default, so exporters keep producing clean,
 *   byte-for-byte-identical markup.
 * @returns {RenderResult} on success `{ svg, diagnostics, error: null }`; on a
 *   hard error `{ svg: lastGood|'', diagnostics: [errorDiagnostic], error }`.
 */
export function safeRender(source, theme = 'light', options = {}) {
  const interactive = options.interactive === true;
  const key = interactive ? 'interactive' : 'plain';
  try {
    const result = render(source, { theme, interactive });
    const svg = result && typeof result.svg === 'string' ? result.svg : '';
    lastGood[key] = svg;
    /** @type {Diagnostic[]} */
    const diagnostics = normalizeDiagnostics(result && result.diagnostics);
    return { svg, diagnostics, error: null };
  } catch (err) {
    const error = /** @type {Error & { loc?: { line?: number }, message: string }} */ (err);
    /** @type {Diagnostic} */
    const diagnostic = {
      line: error && error.loc ? error.loc.line : undefined,
      severity: 'error',
      message: error && error.message ? error.message : String(error),
    };
    return { svg: lastGood[key] || '', diagnostics: [diagnostic], error };
  }
}

/**
 * Coerce core's soft-warning diagnostics into our `Diagnostic` shape. Core's
 * warnings already carry `{ line, severity, message }`-ish data, but be
 * defensive: this is the only place the editor reads them.
 * @param {unknown} raw
 * @returns {Diagnostic[]}
 */
function normalizeDiagnostics(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((d) => {
    const item = /** @type {Record<string, unknown>} */ (d || {});
    const line = typeof item.line === 'number' ? item.line : undefined;
    const severity = item.severity === 'error' ? 'error' : 'warning';
    const message = typeof item.message === 'string' ? item.message : String(item.message ?? '');
    return { line, severity, message };
  });
}

/**
 * Reset the module-level last-good svg caches (both flavours). Primarily for
 * tests and for the "New document" flow so a fresh session does not flash a
 * stale drawing.
 * @returns {void}
 */
export function resetLastGoodSvg() {
  lastGood.plain = '';
  lastGood.interactive = '';
}

/**
 * Read the current last-good svg (mostly for tests/diagnostics).
 * @param {boolean} [interactive] read the interactive cache instead of the plain one.
 * @returns {string}
 */
export function getLastGoodSvg(interactive = false) {
  return interactive ? lastGood.interactive : lastGood.plain;
}
