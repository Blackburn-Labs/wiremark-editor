import { useRef, useState } from 'react';
import Button from '@mui/material/Button';
import FileMenu from './FileMenu.jsx';

const meta = {
  title: 'Layout/FileMenu',
  component: FileMenu,
};

export default meta;

export const Default = {
  render: () => {
    const anchorRef = useRef(null);
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button ref={anchorRef} variant="outlined" onClick={() => setOpen(true)}>
          File
        </Button>
        <FileMenu
          anchorEl={anchorRef.current}
          open={open}
          onClose={() => setOpen(false)}
        />
      </>
    );
  },
};
