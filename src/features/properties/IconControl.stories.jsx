import { useState } from 'react';
import Box from '@mui/material/Box';
import IconControl from './IconControl.jsx';

const meta = {
  title: 'Properties/IconControl',
  component: IconControl,
  parameters: { layout: 'centered' },
};

export default meta;

function Interactive({ initial }) {
  const [value, setValue] = useState(initial);
  return (
    <Box sx={{ width: 320 }}>
      <IconControl field={{ name: 'icon' }} value={value} onChange={setValue} />
    </Box>
  );
}

export const Empty = {
  render: () => <Interactive initial="" />,
};

export const WithValue = {
  render: () => <Interactive initial="Search" />,
};
