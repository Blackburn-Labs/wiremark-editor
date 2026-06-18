import { useState } from 'react';
import Button from '@mui/material/Button';
import PrivacyDialog from './PrivacyDialog.jsx';

const meta = {
  title: 'Layout/PrivacyDialog',
  component: PrivacyDialog,
  args: { open: true },
};

export default meta;

export const Open = {
  args: { onClose: () => {} },
};

export const Interactive = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Privacy & Data
        </Button>
        <PrivacyDialog open={open} onClose={() => setOpen(false)} />
      </>
    );
  },
};
