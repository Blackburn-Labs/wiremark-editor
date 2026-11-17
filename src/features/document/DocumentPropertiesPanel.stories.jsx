import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import Paper from '@mui/material/Paper';
import DocumentPropertiesPanel from './DocumentPropertiesPanel.jsx';
import { loadDocument } from '../../store/documentSlice.js';
import { selectElement } from '../../store/uiSlice.js';
import { DOCUMENT_ID } from '../../utils/directives.js';

const SOURCE = `Font "Patrick Hand"
Flow LR

Wireframe #login mobile
  Button "Sign in" contained to=#home
Wireframe #home mobile
  Typography h4 "Home"
`;

const meta = {
  title: 'Document/DocumentPropertiesPanel',
  component: DocumentPropertiesPanel,
  parameters: { layout: 'padded' },
};
export default meta;

/** Seeds the store with a file that has Font + Flow lines and selects the Document row. */
function Seeded() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(loadDocument({ source: SOURCE, fileName: 'story.wiremark' }));
    dispatch(selectElement(DOCUMENT_ID));
  }, [dispatch]);
  return (
    <Paper variant="outlined" sx={{ width: 320, height: 520 }}>
      <DocumentPropertiesPanel />
    </Paper>
  );
}

/** The Inspector's Document panel: edits apply to the store's document immediately. */
export const InInspector = { render: () => <Seeded /> };
