// @ts-check
/**
 * Application entry point. Mounts the provider stack:
 *   [AptabaseProvider] -> Redux <Provider> -> ThemeModeProvider -> Router.
 *
 * AptabaseProvider wraps the tree only when analytics is enabled (a production
 * build with VITE_APTABASE_KEY set); otherwise the tree renders without it and
 * `useTrack()` no-ops. See utils/analytics.js.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { AptabaseProvider } from '@aptabase/react';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import { store } from './store/index.js';
import ThemeModeProvider from './theme/ThemeModeProvider.jsx';
import router from './router/index.jsx';
import { aptabaseKey, isAnalyticsEnabled } from './utils/analytics.js';

const container = document.getElementById('root');
if (!container) throw new Error('Root container #root not found');

// App version reported to Aptabase, guarded like AboutDialog (the build-time
// global is undefined under tests/Storybook).
// eslint-disable-next-line no-undef
const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

const tree = (
  <Provider store={store}>
    <ThemeModeProvider>
      <RouterProvider router={router} />
    </ThemeModeProvider>
  </Provider>
);

createRoot(container).render(
  <StrictMode>
    {isAnalyticsEnabled() ? (
      <AptabaseProvider appKey={aptabaseKey()} options={{ appVersion }}>
        {tree}
      </AptabaseProvider>
    ) : (
      tree
    )}
  </StrictMode>,
);
