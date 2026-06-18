// Note: under Storybook there is no service worker, so `beforeinstallprompt`
// never fires and the live `useInstallPrompt` hook reports `canPromptNative:
// false`. These stories drive the button's props directly to exercise each
// visible state in isolation; the real native-prompt path is verified in the
// running app via Chrome MCP, not here.
//
// The button renders only when install can be honestly offered (a native prompt
// was captured, or the browser is iOS) -- see `canOfferInstall`.
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import InstallButton from './InstallButton.jsx';

const meta = {
  title: 'Layout/InstallButton',
  component: InstallButton,
  args: {
    isInstalled: false,
    canPromptNative: true,
    platform: 'chromium',
    onInstall: () => {},
  },
  decorators: [
    (Story) => (
      <AppBar position="static" color="default">
        <Toolbar variant="dense">{Story()}</Toolbar>
      </AppBar>
    ),
  ],
};

export default meta;

// Native one-click prompt available (Chromium/Edge) -> button shown.
export const NativePromptAvailable = {
  args: { canPromptNative: true, platform: 'chromium' },
};

// iOS Safari: no native prompt, but the button shows and opens manual steps.
export const IosManualInstructions = {
  args: { canPromptNative: false, platform: 'ios-safari' },
};

// Hidden states (render nothing): already installed; Chromium without a
// captured prompt; desktop Safari / Firefox / unknown.
export const HiddenWhenInstalled = {
  args: { isInstalled: true, canPromptNative: true, platform: 'chromium' },
};

export const HiddenChromiumNoPrompt = {
  args: { canPromptNative: false, platform: 'chromium' },
};

export const HiddenOnUnsupported = {
  args: { canPromptNative: false, platform: 'firefox' },
};
