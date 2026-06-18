import { useState } from 'react';
import Box from '@mui/material/Box';
import NumberControl from './NumberControl.jsx';

const meta = {
  title: 'Properties/NumberControl',
  component: NumberControl,
  parameters: { layout: 'centered' },
};

export default meta;

function Interactive({ field, initial }) {
  const [value, setValue] = useState(initial);
  return (
    <Box sx={{ width: 320 }}>
      <NumberControl field={field} value={value} onChange={setValue} />
    </Box>
  );
}

export const Empty = {
  render: () => <Interactive field={{ name: 'elevation' }} initial="" />,
};

export const WithValue = {
  render: () => <Interactive field={{ name: 'elevation', default: 1 }} initial="3" />,
};
