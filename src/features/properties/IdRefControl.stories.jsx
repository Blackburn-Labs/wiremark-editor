import { useState } from 'react';
import Box from '@mui/material/Box';
import IdRefControl from './IdRefControl.jsx';

const meta = {
  title: 'Properties/IdRefControl',
  component: IdRefControl,
  parameters: { layout: 'centered' },
};

export default meta;

function Interactive({ initial }) {
  const [value, setValue] = useState(initial);
  return (
    <Box sx={{ width: 320 }}>
      <IdRefControl
        field={{ name: 'to' }}
        value={value}
        idOptions={['home', 'settings', 'profile', 'editor']}
        onChange={setValue}
      />
    </Box>
  );
}

export const Empty = {
  render: () => <Interactive initial="" />,
};

export const WithSelection = {
  render: () => <Interactive initial="settings" />,
};
