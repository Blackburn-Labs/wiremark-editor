import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';

import OutlineTree, { OutlineView } from './OutlineTree.jsx';
import WiremarkDocument from '../../domain/WiremarkDocument.js';
import { setSource } from '../../store/documentSlice.js';
import { selectElement } from '../../store/uiSlice.js';

const SAMPLE_SOURCE = `Wireframe #home mobile
  AppBar
    Typography h6 "Wiremark Editor"
  Stack column gap=2 padding=2
    Typography h4 "Hello, wiremark"
    TextField "Search" startIcon=search
    Button "Get started" contained to=#home
Wireframe #settings mobile
  AppBar
    Typography h6 "Settings"
`;

const sampleDoc = WiremarkDocument.parse(SAMPLE_SOURCE);

const meta = {
  title: 'Render/OutlineTree',
  component: OutlineView,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <Paper variant="outlined" sx={{ width: 320, maxHeight: 480, overflow: 'auto' }}>
        <Story />
      </Paper>
    ),
  ],
};

export default meta;

/**
 * Interactive sample: clicking a node updates the locally-held selection so the
 * highlight visibly tracks selection without the store.
 */
function InteractiveOutline({ initialSelectedId }) {
  const [selectedId, setSelectedId] = useState(initialSelectedId ?? null);
  return <OutlineView doc={sampleDoc} selectedId={selectedId} onSelect={setSelectedId} />;
}

export const Default = {
  render: () => <InteractiveOutline />,
};

// `0.1.0` = first Wireframe -> second child (Stack) -> first child (Typography).
export const WithSelection = {
  render: () => <InteractiveOutline initialSelectedId="0.1.0" />,
};

export const Empty = {
  render: () => <OutlineView doc={WiremarkDocument.parse('')} selectedId={null} onSelect={() => {}} />,
};

/**
 * The store-bound tree. A decorator seeds the source and a selection so the
 * highlight is visible.
 */
function StoreBoundOutline() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setSource(SAMPLE_SOURCE));
    dispatch(selectElement('0.1.0'));
  }, [dispatch]);
  return (
    <Box sx={{ width: 320 }}>
      <OutlineTree />
    </Box>
  );
}

export const StoreBound = {
  render: () => <StoreBoundOutline />,
};
