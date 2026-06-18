// @ts-check
/**
 * InstallButton -- the AppBar "Install app" affordance. A presentational
 * IconButton that renders ONLY when we can honestly offer install
 * (`canOfferInstall`): a native prompt was captured, or the browser is iOS where
 * the manual Add-to-Home-Screen flow reliably exists. It is hidden otherwise
 * (already installed, Chromium without a prompt, desktop Safari, Firefox, ...) so
 * we never point users at install UI that may not be present. The click decision
 * (fire the native prompt vs. open the iOS instructions) lives in the
 * `onInstall` callback owned by EditorAppBar, shared with the Help-menu entry.
 */
import PropTypes from 'prop-types';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import InstallDesktopIcon from '@mui/icons-material/InstallDesktop';

import { canOfferInstall } from '../../utils/pwaInstall.js';

export default function InstallButton({ isInstalled, canPromptNative, platform, onInstall }) {
  if (!canOfferInstall({ isInstalled, canPromptNative, platform })) return null;

  return (
    <Tooltip title="Install Wiremark Editor">
      <IconButton color="inherit" aria-label="Install app" onClick={onInstall}>
        <InstallDesktopIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

InstallButton.propTypes = {
  /** Whether the app is already running installed/standalone (hides the button). */
  isInstalled: PropTypes.bool,
  /** Whether a native install prompt has been captured. */
  canPromptNative: PropTypes.bool,
  /** Detected platform key (from `detectInstallPlatform`). */
  platform: PropTypes.string,
  /** Click handler; decides native-prompt vs. instructions dialog. */
  onInstall: PropTypes.func.isRequired,
};
