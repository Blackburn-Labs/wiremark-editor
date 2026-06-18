// @ts-check
/**
 * Application router. A single route tree under the App layout shell.
 * `basename` honors Vite's configured base so the app works when hosted under
 * a sub-path as well as at the Netlify root.
 */
import { createBrowserRouter } from 'react-router-dom';
import App from '../App.jsx';
import EditorScreen from '../screens/EditorScreen.jsx';
import ErrorScreen from '../screens/ErrorScreen.jsx';

export const router = createBrowserRouter(
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
