import List from '@mui/material/List';
import ElementListItem from './ElementListItem.jsx';

const meta = {
  title: 'Elements/ElementListItem',
  component: ElementListItem,
  args: { name: 'Stack', selected: false },
  decorators: [
    (Story) => (
      <List dense sx={{ width: 320 }}>
        <Story />
      </List>
    ),
  ],
};

export default meta;

export const Unselected = { args: { name: 'Stack', selected: false } };

export const Selected = { args: { name: 'Stack', selected: true } };

export const PlainComponent = { args: { name: 'Button', selected: false } };
