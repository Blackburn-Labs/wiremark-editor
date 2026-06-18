import { useRef, useState } from 'react';
import Button from '@mui/material/Button';
import HelpMenu from './HelpMenu.jsx';

const meta = {
  title: 'Layout/HelpMenu',
  component: HelpMenu,
};

export default meta;

export const Default = {
  render: () => {
    const anchorRef = useRef(null);
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button ref={anchorRef} variant="outlined" onClick={() => setOpen(true)}>
          Help
        </Button>
        <HelpMenu
          anchorEl={anchorRef.current}
          open={open}
          onClose={() => setOpen(false)}
        />
      </>
    );
  },
};
