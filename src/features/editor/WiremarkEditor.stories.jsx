// @ts-check
/**
 * Stories for WiremarkEditor. The editor reads the canonical source from the
 * Redux store (the Storybook preview decorator wraps every story in the app's
 * Provider + ThemeModeProvider stack). The store is seeded with STARTER_SOURCE,
 * so the Default story shows that document; the other stories use a decorator
 * that dispatches `setSource` to load a tailored sample before rendering.
 */
import { useEffect } from 'react';
import { Box } from '@mui/material';
import { store } from '../../store/index.js';
import { setSource } from '../../store/documentSlice.js';
import WiremarkEditor from './WiremarkEditor.jsx';

/** A multi-frame document exercising several token kinds across frames. */
const MULTI_FRAME_SOURCE = `// A two-screen flow
Wireframe #login mobile
  AppBar
    Typography h6 "Sign in"
  Stack column gap=2 padding=2
    TextField "Email" type=email
    TextField "Password" type=password
    Button "Log in" contained fullWidth to=#home
    Button "Create account" text to=#signup

Wireframe #home desktop
  AppBar
    Typography h6 "Dashboard"
    IconButton settings
  Stack row gap=3 padding=3
    Card // summary card
      Typography h5 "Welcome back"
      Button "View reports" outlined to=#login
`;

/** A small sample showcasing the lexical highlight (components, props, ids). */
const HIGHLIGHT_SAMPLE_SOURCE = `Wireframe #demo mobile
  // every token kind on display
  Stack column gap=2 padding=2
    Typography h4 "Headline text"
    TextField "Search" startIcon=search
    Button "Go" contained disabled to=#demo
    Image ratio=16:9
`;

const meta = {
  title: 'Editor/WiremarkEditor',
  component: WiremarkEditor,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <Box sx={{ height: '70vh', width: '100%' }}>
        <Story />
      </Box>
    ),
  ],
};

export default meta;

/** Default: renders whatever the store currently holds (STARTER_SOURCE). */
export const Default = {};

/** Loads a multi-frame sample via setSource before rendering. */
export const MultiFrame = {
  decorators: [
    (Story) => {
      useEffect(() => {
        store.dispatch(setSource(MULTI_FRAME_SOURCE));
      }, []);
      return <Story />;
    },
  ],
};

/** A compact document that puts the lexical highlighter through its paces. */
export const HighlightShowcase = {
  decorators: [
    (Story) => {
      useEffect(() => {
        store.dispatch(setSource(HIGHLIGHT_SAMPLE_SOURCE));
      }, []);
      return <Story />;
    },
  ],
};
