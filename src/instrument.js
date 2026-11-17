// @ts-check
/**
 * Sentry error monitoring bootstrap. Imported FIRST in `main.jsx` so the SDK is
 * initialized before the router is created and before any app code runs.
 *
 * No-ops entirely unless `VITE_SENTRY_DSN` is set (see `utils/monitoring.js`),
 * so unit tests, Storybook and DSN-less dev builds send nothing. All privacy
 * settings and scrubbers live in `utils/monitoring.js` -- read its header before
 * changing anything here. Never add Session Replay, the Redux enhancer, or the
 * console-logging integration: each would ship wireframe content.
 */
import { useEffect } from 'react';
import * as Sentry from '@sentry/react';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';
import {
  SENTRY_DATA_COLLECTION,
  isMonitoringEnabled,
  scrubBreadcrumb,
  scrubEvent,
  scrubSpan,
  sentryDsn,
  sentryEnvironment,
  sentryRelease,
  tracesSampleRate,
} from './utils/monitoring.js';

// eslint-disable-next-line no-undef
const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
// Netlify's build-time CONTEXT, injected by vite.config.js ('' outside Netlify).
// eslint-disable-next-line no-undef
const deployContext = typeof __DEPLOY_CONTEXT__ !== 'undefined' ? __DEPLOY_CONTEXT__ : '';

if (isMonitoringEnabled()) {
  Sentry.init({
    dsn: sentryDsn(),
    environment: sentryEnvironment(deployContext, import.meta.env.MODE),
    release: sentryRelease(appVersion),
    dataCollection: { ...SENTRY_DATA_COLLECTION },
    integrations: [
      Sentry.reactRouterBrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
        // INP spans are named by the clicked element's selector, which includes
        // aria-label/title text (e.g. the open file's name). Off for privacy.
        enableInp: false,
      }),
    ],
    tracesSampleRate: tracesSampleRate(import.meta.env.MODE),
    // Only explicit Sentry.logger calls are sent (no console integration).
    enableLogs: true,
    beforeBreadcrumb: scrubBreadcrumb,
    beforeSend: scrubEvent,
    beforeSendSpan: scrubSpan,
  });
}
