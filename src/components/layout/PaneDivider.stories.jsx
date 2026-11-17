import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import PaneDivider from './PaneDivider.jsx';

const meta = {
  title: 'Layout/PaneDivider',
  component: PaneDivider,
  parameters: { layout: 'centered' },
};

export default meta;

export function Default() {
  const [value, setValue] = useState(50);
  return (
    <Box sx={{ display: 'flex', width: 720, height: 360, border: 1, borderColor: 'divider' }}>
      <Box sx={{ flex: `0 0 ${value}%`, p: 2 }}>
        <Typography>Editor ({Math.round(value)}%)</Typography>
      </Box>
      <PaneDivider value={value} onChange={setValue} />
      <Box sx={{ flex: 1, p: 2 }}>
        <Typography>Renderer</Typography>
      </Box>
    </Box>
  );
}
