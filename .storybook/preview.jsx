/**
 * Global Storybook config. Every story is wrapped in the app's provider stack
 * (Redux + MUI theme via ThemeModeProvider) so components render exactly as they
 * do in the app, and a toolbar control lets you flip light/dark/system.
 */
import { Provider } from 'react-redux';
import { store } from '../src/store/index.js';
import { setThemeMode } from '../src/store/uiSlice.js';
import ThemeModeProvider from '../src/theme/ThemeModeProvider.jsx';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

/** @type { import('@storybook/react-vite').Preview } */
const preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    layout: 'centered',
  },
  globalTypes: {
    themeMode: {
      description: 'App theme mode',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: ['light', 'dark', 'system'],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      store.dispatch(setThemeMode(context.globals.themeMode || 'light'));
      return (
        <Provider store={store}>
          <ThemeModeProvider>
            <Story />
          </ThemeModeProvider>
        </Provider>
      );
    },
  ],
};

export default preview;
