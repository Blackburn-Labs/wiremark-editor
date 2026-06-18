import { useState } from 'react';
import Button from '@mui/material/Button';
import ConfirmDialog from './ConfirmDialog.jsx';

const meta = {
  title: 'Common/ConfirmDialog',
  component: ConfirmDialog,
  args: {
    open: true,
    title: 'Discard unsaved changes?',
    message: 'You have unsaved changes that will be lost. Do you want to continue?',
    confirmLabel: 'Discard',
    cancelLabel: 'Cancel',
  },
};

export default meta;

export const Open = {};

export const NoMessage = {
  args: { message: '', title: 'Delete this element?' },
};

export const Interactive = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Open dialog
        </Button>
        <ConfirmDialog
          {...args}
          open={open}
          onConfirm={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </>
    );
  },
};
