import { useState } from 'react';
import Button from '@mui/material/Button';
import AboutDialog from './AboutDialog.jsx';

const meta = {
  title: 'Layout/AboutDialog',
  component: AboutDialog,
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
          About
        </Button>
        <AboutDialog open={open} onClose={() => setOpen(false)} />
      </>
    );
  },
};
