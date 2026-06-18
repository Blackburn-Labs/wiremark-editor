import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Box from '@mui/material/Box';

import RenderPanel, { RenderSurface } from './RenderPanel.jsx';
import { setSource } from '../../store/documentSlice.js';

const VALID_SOURCE = `Wireframe #home mobile
  AppBar
    Typography h6 "Wiremark Editor"
  Stack column gap=2 padding=2
    Typography h4 "Hello, wiremark"
    TextField "Search" startIcon=search
    Button "Get started" contained to=#home
`;

// `Bogus` is not a known component, so core's render() throws a WiremarkError;
// safeRender surfaces it as a single red error diagnostic in the status bar.
const INVALID_SOURCE = `Wireframe #home mobile
  Bogus this is not a real component
  Button unquoted text that should be quoted
`;

const meta = {
  title: 'Render/RenderPanel',
  component: RenderSurface,
  parameters: { layout: 'fullscreen' },
  args: { mode: 'light' },
  argTypes: {
    mode: { control: { type: 'inline-radio' }, options: ['light', 'dark'] },
  },
  decorators: [
    (Story) => (
      <Box sx={{ height: '80vh', width: '100%', border: 1, borderColor: 'divider' }}>
        <Story />
      </Box>
    ),
  ],
};

export default meta;

export const Valid = {
  args: { source: VALID_SOURCE },
};

export const Invalid = {
  args: { source: INVALID_SOURCE },
};

export const Empty = {
  args: { source: '' },
};

/**
 * Click-to-select + marching ants, fully interactive. Click an element to ring it
 * with marching ants; click the SAME spot again to walk one level up the ancestry
 * (innermost -> ... -> frame), and a different element to start fresh there. Full-
 * bleed elements and the frame itself ring without being trimmed.
 */
function SelectableSurface(args) {
  const [selectedLine, setSelectedLine] = useState(/** @type {number|null} */ (7));
  return <RenderSurface {...args} selectedLine={selectedLine} onPickLine={setSelectedLine} />;
}

export const Selected = {
  args: { source: VALID_SOURCE },
  render: (args) => <SelectableSurface {...args} />,
};

/**
 * The store-bound panel (as the app mounts it). A decorator seeds the canonical
 * source so it renders without the rest of the app.
 */
function StoreBoundPanel() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setSource(VALID_SOURCE));
  }, [dispatch]);
  return <RenderPanel />;
}

export const StoreBound = {
  render: () => <StoreBoundPanel />,
};
