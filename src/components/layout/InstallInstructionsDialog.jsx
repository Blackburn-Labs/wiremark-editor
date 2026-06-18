// @ts-check
/**
 * InstallInstructionsDialog -- shown only for the platforms that need MANUAL
 * install steps, which in practice means iOS (where `beforeinstallprompt` is
 * never fired and the reliable path is Share -> Add to Home Screen). On
 * Chromium the native prompt is fired directly, so this dialog never carries
 * "click the install icon"-style guesses. Fully controlled via `open` +
 * `onClose`.
 */
import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IosShareIcon from '@mui/icons-material/IosShare';

/**
 * Per-platform copy. Keyed by the values of `detectInstallPlatform` that reach
 * this dialog (the iOS cases). Anything else uses FALLBACK.
 * @type {Record<string, { heading: string, steps: string[] }>}
 */
const INSTRUCTIONS = {
  'ios-safari': {
    heading: 'Add to your Home Screen',
    steps: [
      'Tap the Share button in the Safari toolbar.',
      'Scroll down and choose "Add to Home Screen".',
      'Tap "Add" to confirm.',
    ],
  },
  'ios-other': {
    heading: 'Open in Safari to install',
    steps: [
      'On iPhone and iPad, only Safari can install web apps.',
      'Open this page in Safari, tap the Share button, then choose "Add to Home Screen".',
    ],
  },
};

const FALLBACK = {
  heading: 'Add to your Home Screen',
  steps: ['Open your browser menu and look for "Add to Home Screen" or "Install".'],
};

export default function InstallInstructionsDialog({ open, onClose, platform }) {
  const { heading, steps } = INSTRUCTIONS[platform] || FALLBACK;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" aria-labelledby="install-dialog-title">
      <DialogTitle id="install-dialog-title">Install Wiremark Editor</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Install Wiremark Editor as an app for quick access and offline use -- it
            opens in its own window, with no browser tabs or address bar.
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center">
            <IosShareIcon fontSize="small" color="action" />
            <Typography variant="subtitle2">{heading}</Typography>
          </Stack>
          <Stack component="ol" spacing={1} sx={{ pl: 3, m: 0 }}>
            {steps.map((step) => (
              <Typography key={step} component="li" variant="body2">
                {step}
              </Typography>
            ))}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

InstallInstructionsDialog.propTypes = {
  /** Whether the dialog is open. */
  open: PropTypes.bool.isRequired,
  /** Called when the dialog requests close. */
  onClose: PropTypes.func.isRequired,
  /** Detected platform key (from `detectInstallPlatform`); selects the steps. */
  platform: PropTypes.string,
};
