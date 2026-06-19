// @ts-check
/**
 * Analytics event names and small pure helpers for Aptabase.
 *
 * Deliberately framework-free and side-effect-free so it is unit-testable in
 * isolation. The React glue lives in `hooks/useTrack.js` and the provider is
 * mounted in `main.jsx`; components never import the SDK directly -- they always
 * go through `useTrack()`.
 *
 * Analytics is PRODUCTION-ONLY: it is gated on the build-time env var
 * `VITE_APTABASE_KEY`, which is set only in the Netlify build. In dev, unit
 * tests, and Storybook the var is absent, so `isAnalyticsEnabled()` is false and
 * nothing is ever sent. The Aptabase app key is public (it ships in client JS),
 * so this gate is about NOT recording dev/fork/Storybook traffic -- not secrecy.
 *
 * Aptabase collects no cookies, no IP, no device ids and no personal data; we
 * additionally never send any wireframe content -- only the flat scalar props
 * declared on the events below.
 */
import { isStandalone } from './pwaInstall.js';

/**
 * The Aptabase app key for this build, or '' when analytics is disabled.
 * Read at call time (not captured in a module const) so tests can toggle it via
 * `vi.stubEnv('VITE_APTABASE_KEY', ...)`.
 * @returns {string}
 */
export function aptabaseKey() {
  return import.meta.env.VITE_APTABASE_KEY || '';
}

/**
 * Whether analytics should run. False in dev / unit tests / Storybook (no key).
 * @returns {boolean}
 */
export function isAnalyticsEnabled() {
  return Boolean(aptabaseKey());
}

/**
 * Coarse runtime surface for the `app_opened` event: distinguishes an installed
 * standalone PWA from an in-browser visit (installed launches always start at
 * `/` with no referrer, so this prop is the only signal that separates them).
 * Reuses `pwaInstall.isStandalone()`.
 * @returns {'pwa'|'browser'}
 */
export function surfaceTag() {
  return isStandalone() ? 'pwa' : 'browser';
}

/**
 * Analytics event names. Aptabase has no automatic events and custom property
 * values must be scalars (string | number | boolean), so every event below is
 * fired manually with flat props.
 * @type {Readonly<Record<string, string>>}
 */
export const EVENTS = Object.freeze({
  /** Pageview-equivalent: fired once when the app shell mounts. props: { surface } */
  APP_OPENED: 'app_opened',
  /** A wireframe was exported. props: { format: 'svg'|'png'|'pdf' } */
  EXPORT: 'export',
  /** A .wiremark file was opened. */
  FILE_OPEN: 'file_open',
  /** The document was saved. props: { mode: 'save'|'save_as'|'download' } */
  FILE_SAVE: 'file_save',
  /** A new document was started. */
  FILE_NEW: 'file_new',
  /** View mode changed. props: { mode: 'text'|'split'|'render' } */
  VIEW_MODE: 'view_mode',
});
