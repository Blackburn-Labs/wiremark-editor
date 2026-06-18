import { useState } from 'react';
import Button from '@mui/material/Button';
import InstallInstructionsDialog from './InstallInstructionsDialog.jsx';

const meta = {
  title: 'Layout/InstallInstructionsDialog',
  component: InstallInstructionsDialog,
  args: { open: true, onClose: () => {} },
};

export default meta;

// This dialog is only surfaced for platforms needing manual steps (iOS).
export const IosSafari = {
  args: { platform: 'ios-safari' },
};

export const IosOther = {
  args: { platform: 'ios-other' },
};

// Defensive fallback copy for any other platform key.
export const Fallback = {
  args: { platform: 'unknown' },
};

export const Interactive = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Install app
        </Button>
        <InstallInstructionsDialog
          open={open}
          onClose={() => setOpen(false)}
          platform="ios-safari"
        />
      </>
    );
  },
};
