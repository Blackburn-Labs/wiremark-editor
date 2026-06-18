import Box from '@mui/material/Box';
import ComponentDrawer from './ComponentDrawer.jsx';

const meta = {
  title: 'Layout/ComponentDrawer',
  component: ComponentDrawer,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <Box sx={{ display: 'flex', height: '90vh' }}>
        <Story />
      </Box>
    ),
  ],
  args: { width: 280, variant: 'permanent' },
};

export default meta;

export const Default = {};

export const Persistent = { args: { variant: 'persistent' } };
