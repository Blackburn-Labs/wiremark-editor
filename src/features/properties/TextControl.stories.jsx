import { useState } from 'react';
import Box from '@mui/material/Box';
import TextControl from './TextControl.jsx';

const meta = {
  title: 'Properties/TextControl',
  component: TextControl,
  parameters: { layout: 'centered' },
};

export default meta;

/** Renders the control with local state so typing is reflected. */
function Interactive({ field, initial }) {
  const [value, setValue] = useState(initial);
  return (
    <Box sx={{ width: 320 }}>
      <TextControl field={field} value={value} onChange={setValue} />
    </Box>
  );
}

export const Empty = {
  render: () => <Interactive field={{ name: 'placeholder' }} initial="" />,
};

export const WithValue = {
  render: () => <Interactive field={{ name: 'placeholder' }} initial="Search..." />,
};

export const WithDefault = {
  render: () => (
    <Interactive field={{ name: 'placeholder', default: 'Type here' }} initial="" />
  ),
};
