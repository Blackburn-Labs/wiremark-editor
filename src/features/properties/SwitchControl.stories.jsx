import { useState } from 'react';
import Box from '@mui/material/Box';
import SwitchControl from './SwitchControl.jsx';

const meta = {
  title: 'Properties/SwitchControl',
  component: SwitchControl,
  parameters: { layout: 'centered' },
};

export default meta;

function Interactive({ initial }) {
  const [value, setValue] = useState(initial);
  return (
    <Box sx={{ width: 320 }}>
      <SwitchControl field={{ name: 'disabled' }} value={value} onChange={setValue} />
    </Box>
  );
}

export const Off = {
  render: () => <Interactive initial={false} />,
};

export const On = {
  render: () => <Interactive initial />,
};
