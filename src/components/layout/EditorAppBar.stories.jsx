import Box from '@mui/material/Box';
import EditorAppBar from './EditorAppBar.jsx';

const meta = {
  title: 'Layout/EditorAppBar',
  component: EditorAppBar,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <Box sx={{ width: '100%' }}>
        <Story />
      </Box>
    ),
  ],
};

export default meta;

export const Default = {};
