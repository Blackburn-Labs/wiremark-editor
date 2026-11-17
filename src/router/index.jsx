// @ts-check
/**
 * Application router. A single route tree under the App layout shell.
 * `basename` honors Vite's configured base so the app works when hosted under
 * a sub-path as well as at the Netlify root.
 *
 * When Sentry is enabled, `createBrowserRouter` is wrapped so navigations become
 * parameterized traces. This module must load after `instrument.js` has called
 * `Sentry.init` (main.jsx imports it first).
 */
import { createBrowserRouter } from 'react-router-dom';
import { wrapCreateBrowserRouter } from '@sentry/react';
import App from '../App.jsx';
import EditorScreen from '../screens/EditorScreen.jsx';
import ErrorScreen from '../screens/ErrorScreen.jsx';
import { isMonitoringEnabled } from '../utils/monitoring.js';

const createRouter = isMonitoringEnabled()
  ? wrapCreateBrowserRouter(createBrowserRouter)
  : createBrowserRouter;

export const router = createRouter(
  [
    {
      path: '/',
      element: <App />,
      errorElement: <ErrorScreen />,
      children: [{ index: true, element: <EditorScreen />, errorElement: <ErrorScreen /> }],
    },
  ],
  { basename: import.meta.env.BASE_URL?.replace(/\/$/, '') || '/' },
);

export default router;
