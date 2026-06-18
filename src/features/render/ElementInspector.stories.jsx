import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import Paper from '@mui/material/Paper';

import ElementInspector, { InspectorView, MoveControls } from './ElementInspector.jsx';
import WiremarkDocument from '../../domain/WiremarkDocument.js';
import registryAdapter from '../../utils/registryAdapter.js';
import { setSource } from '../../store/documentSlice.js';
import { selectElement } from '../../store/uiSlice.js';

const SAMPLE_SOURCE = `Wireframe #home mobile
  AppBar
    Typography h6 "Wiremark Editor"
  Stack column gap=2 padding=2
    Typography h4 "Hello, wiremark"
    TextField "Search" startIcon=search
    Button "Get started" contained to=#home
`;

const sampleDoc = WiremarkDocument.parse(SAMPLE_SOURCE);
const idOptions = registryAdapter.idsInDocument(sampleDoc).map((x) => `#${x}`);

// `0.1.3` = first Wireframe -> Stack (2nd child) -> Button (4th child).
const BUTTON_ID = '0.1.3';
// `0.1` = the Stack (a child of the frame, so it can move/ascend/descend).
const STACK_ID = '0.1';

const noop = () => {};

const meta = {
  title: 'Render/ElementInspector',
  component: InspectorView,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <Paper variant="outlined" sx={{ width: 340, height: 560, overflow: 'hidden' }}>
        <Story />
      </Paper>
    ),
  ],
};

export default meta;

export const WithSelectedButton = {
  render: () => (
    <InspectorView
      doc={sampleDoc}
      element={sampleDoc.findById(BUTTON_ID)}
      idOptions={idOptions}
      onMove={noop}
      onChangeTokens={noop}
    />
  ),
};

export const WithSelectedContainer = {
  render: () => (
    <InspectorView
      doc={sampleDoc}
      element={sampleDoc.findById(STACK_ID)}
      idOptions={idOptions}
      onMove={noop}
      onChangeTokens={noop}
    />
  ),
};

export const EmptyState = {
  render: () => (
    <InspectorView doc={sampleDoc} element={null} idOptions={idOptions} onMove={noop} onChangeTokens={noop} />
  ),
};

export const MoveControlsOnly = {
  render: () => <MoveControls doc={sampleDoc} id={STACK_ID} onMove={noop} />,
};

/**
 * The store-bound inspector. A decorator seeds the source and selects an element
 * so the live form + wired Move controls render.
 */
function StoreBoundInspector() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setSource(SAMPLE_SOURCE));
    dispatch(selectElement(BUTTON_ID));
  }, [dispatch]);
  return <ElementInspector />;
}

export const StoreBound = {
  render: () => <StoreBoundInspector />,
};
