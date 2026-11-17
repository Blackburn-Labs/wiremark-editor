// @ts-check
/**
 * Error-monitoring (Sentry) configuration and privacy scrubbers.
 *
 * Deliberately framework-free and side-effect-free (no `@sentry/react` import)
 * so it is unit-testable in isolation, mirroring `utils/analytics.js`. The SDK is
 * initialized in `src/instrument.js`, which feeds these helpers into
 * `Sentry.init`.
 *
 * Monitoring is gated on the build-time env var `VITE_SENTRY_DSN`. It is set in
 * the Netlify build (and optionally in a developer's git-ignored `.env.local`);
 * in unit tests and Storybook it is absent, so nothing is ever sent. The DSN is
 * public (it ships in client JS), so the gate is about not recording
 * test/Storybook/fork traffic -- not secrecy.
 *
 * PRIVACY (maximum): the app must never send wireframe content, file names, IP
 * addresses or any identity. The SDK's own `dataCollection` switches handle the
 * documented categories (see `SENTRY_DATA_COLLECTION`); the scrubbers below close
 * the remaining gaps we found in the SDK:
 *  - DOM selectors (breadcrumbs, web-vital/interaction spans) embed `aria-label`
 *    and `title` attributes -- e.g. the app bar's file-name tooltip.
 *  - `WiremarkError` messages from `@wiremark/core` quote document text.
 *  - Console breadcrumbs could carry anything the app logged.
 */

/**
 * The Sentry DSN for this build, or '' when monitoring is disabled. Read at call
 * time so tests can toggle it via `vi.stubEnv('VITE_SENTRY_DSN', ...)`.
 * @returns {string}
 */
export function sentryDsn() {
  return import.meta.env.VITE_SENTRY_DSN || '';
}

/**
 * Whether error monitoring should run. False in unit tests / Storybook (no DSN).
 * @returns {boolean}
 */
export function isMonitoringEnabled() {
  return Boolean(sentryDsn());
}

/**
 * Sentry release name for an app version. Must match the release the source-map
 * upload uses so production stack traces resolve.
 * @param {string} version
 * @returns {string}
 */
export function sentryRelease(version) {
  return `wiremark-editor@${version}`;
}

/**
 * Sentry environment. Only a real Netlify PRODUCTION deploy reports as
 * `production`, so production-only alerts never fire for test builds:
 *  - Netlify build: its `CONTEXT` (`production`, `deploy-preview`,
 *    `branch-deploy`, `dev`).
 *  - Local dev server: `development`.
 *  - Local production build (`npm run build`/`vite preview`, no CONTEXT): `local`.
 * @param {string} deployContext Netlify's build-time `CONTEXT` ('' when absent)
 * @param {string} mode `import.meta.env.MODE`
 * @returns {string}
 */
export function sentryEnvironment(deployContext, mode) {
  if (deployContext) return deployContext;
  return mode === 'production' ? 'local' : mode || 'development';
}

/**
 * Trace sample rate by Vite mode: everything locally (so a trace is always
 * there to inspect), 10% in production.
 * @param {string} mode `import.meta.env.MODE`
 * @returns {number}
 */
export function tracesSampleRate(mode) {
  return mode === 'production' ? 0.1 : 1.0;
}

/**
 * `Sentry.init({ dataCollection })` -- the most private settings. No user
 * identity or IP (`userInfo: false` also makes the SDK tell Sentry to never
 * infer the IP from the connection), no cookies, bodies, query strings or local
 * variables, and only the User-Agent header (browser/OS, needed to debug
 * browser-specific bugs; the Referer is dropped).
 */
export const SENTRY_DATA_COLLECTION = Object.freeze({
  userInfo: false,
  cookies: false,
  httpHeaders: { request: { allow: ['User-Agent'] }, response: false },
  httpBodies: [],
  urlQueryParams: false,
  stackFrameVariables: false,
});

/**
 * Breadcrumb categories we keep. Everything else -- notably `console` (arbitrary
 * logged values) and `ui.click` / `ui.input` (DOM selectors that include
 * aria-label/title text such as the file name) -- is dropped.
 */
const KEPT_BREADCRUMB_CATEGORIES = new Set(['navigation', 'fetch', 'xhr']);

/**
 * `beforeBreadcrumb`: keep only navigation/network breadcrumbs (plus Sentry's
 * own internal ones), and strip query strings/hashes from their URLs.
 * @template {{ category?: string, data?: Record<string, any> }} B
 * @param {B} breadcrumb
 * @returns {B | null}
 */
export function scrubBreadcrumb(breadcrumb) {
  const category = breadcrumb?.category ?? '';
  if (!KEPT_BREADCRUMB_CATEGORIES.has(category) && !category.startsWith('sentry.')) return null;
  if (breadcrumb.data) {
    for (const key of ['url', 'from', 'to']) {
      if (typeof breadcrumb.data[key] === 'string') {
        breadcrumb.data[key] = stripQueryAndHash(breadcrumb.data[key]);
      }
    }
  }
  return breadcrumb;
}

/**
 * Remove `?query` and `#hash` from a URL string.
 * @param {string} url
 * @returns {string}
 */
export function stripQueryAndHash(url) {
  return url.replace(/[?#].*$/, '');
}

/**
 * Attribute keys that carry DOM selectors (LCP element, CLS sources, INP
 * targets) or identity (user.*, referer).
 */
const SENSITIVE_ATTRIBUTE_RE = /(^|\.)element$|(^|\.)source\.\d+$|selector|target|^user\.|referer/i;

/**
 * Delete sensitive keys from a span attribute/data bag, in place.
 * @param {Record<string, unknown> | undefined} bag
 */
function scrubAttributeBag(bag) {
  if (!bag || typeof bag !== 'object') return;
  for (const key of Object.keys(bag)) {
    if (SENSITIVE_ATTRIBUTE_RE.test(key)) delete bag[key];
  }
}

/**
 * Read an attribute value that may be raw or wrapped as `{ value, type }`.
 * @param {unknown} attr
 * @returns {unknown}
 */
function attrValue(attr) {
  return attr && typeof attr === 'object' && 'value' in attr ? /** @type {any} */ (attr).value : attr;
}

/**
 * `beforeSendSpan`: strip selector/identity attributes, and replace the name of
 * UI-interaction spans (whose name IS the clicked element's selector) with the
 * span op. Handles both the streamed (`attributes`/`name`) and static
 * (`data`/`description`) span shapes. Must return the span (cannot drop).
 * @template {Record<string, any>} S
 * @param {S} span
 * @returns {S}
 */
export function scrubSpan(span) {
  if (!span) return span;
  const s = /** @type {Record<string, any>} */ (span);
  const op = String(attrValue(s.attributes?.['sentry.op']) ?? s.op ?? s.data?.['sentry.op'] ?? '');
  if (op.startsWith('ui.')) {
    if ('name' in s) s.name = op;
    if ('description' in s) s.description = op;
  }
  scrubAttributeBag(s.attributes);
  scrubAttributeBag(s.data);
  return span;
}

/** Placeholder for a redacted `WiremarkError` message. */
export const REDACTED_WIREMARK_MESSAGE = '[wiremark syntax error: message redacted]';

/**
 * `WiremarkError` messages quote the user's document text (component names,
 * prop values). Keep only the "(line N)" suffix, which is not content.
 * @param {string | undefined} message
 * @returns {string}
 */
export function redactWiremarkMessage(message) {
  const line = /\(line (\d+)\)\s*$/.exec(message ?? '');
  return line ? `${REDACTED_WIREMARK_MESSAGE} (line ${line[1]})` : REDACTED_WIREMARK_MESSAGE;
}

/**
 * `beforeSend` for error events: remove any user/identity data, request
 * extras and non-allowlisted headers, redact `WiremarkError` messages, and
 * re-filter breadcrumbs as a backstop.
 * @template {Record<string, any>} E
 * @param {E} event
 * @returns {E}
 */
export function scrubEvent(event) {
  if (!event) return event;
  const e = /** @type {Record<string, any>} */ (event);

  delete e.user;
  delete e.server_name;
  // Browser timezone + locale: coarse location/fingerprint signal, not needed.
  if (e.contexts) delete e.contexts.culture;

  if (e.request) {
    if (typeof e.request.url === 'string') e.request.url = stripQueryAndHash(e.request.url);
    delete e.request.cookies;
    delete e.request.query_string;
    delete e.request.data;
    const ua = e.request.headers?.['User-Agent'];
    if (ua) e.request.headers = { 'User-Agent': ua };
    else delete e.request.headers;
  }

  for (const ex of e.exception?.values ?? []) {
    if (ex?.type === 'WiremarkError') ex.value = redactWiremarkMessage(ex.value);
  }

  if (Array.isArray(e.breadcrumbs)) {
    e.breadcrumbs = e.breadcrumbs.map((b) => scrubBreadcrumb(b)).filter(Boolean);
  }

  scrubAttributeBag(e.contexts?.trace?.data);

  return event;
}
