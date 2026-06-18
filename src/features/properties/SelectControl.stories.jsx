import { useState } from 'react';
import Box from '@mui/material/Box';
import SelectControl from './SelectControl.jsx';

const meta = {
  title: 'Properties/SelectControl',
  component: SelectControl,
  parameters: { layout: 'centered' },
};

export default meta;

function Interactive({ field, initial }) {
  const [value, setValue] = useState(initial);
  return (
    <Box sx={{ width: 320 }}>
      <SelectControl field={field} value={value} onChange={setValue} />
    </Box>
  );
}

const variantField = {
  name: 'variant',
  values: ['text', 'outlined', 'contained'],
  default: 'text',
};

export const Unset = {
  render: () => <Interactive field={variantField} initial="" />,
};

export const Selected = {
  render: () => <Interactive field={variantField} initial="contained" />,
};
