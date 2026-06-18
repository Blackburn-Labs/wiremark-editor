import Box from '@mui/material/Box';
import ElementList from './ElementList.jsx';

const meta = {
  title: 'Elements/ElementList',
  component: ElementList,
  args: { filter: '', selectedName: null },
  decorators: [
    (Story) => (
      <Box sx={{ width: 320, maxHeight: 480, overflowY: 'auto' }}>
        <Story />
      </Box>
    ),
  ],
};

export default meta;

export const AllComponents = { args: { filter: '' } };

export const Filtered = { args: { filter: 'card' } };

export const WithSelection = { args: { filter: '', selectedName: 'Stack' } };

export const NoMatches = { args: { filter: 'zzznotacomponent' } };
