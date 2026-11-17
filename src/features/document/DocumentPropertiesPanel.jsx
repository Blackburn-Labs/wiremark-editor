// @ts-check
/**
 * DocumentPropertiesPanel -- what the Inspector shows when the Outline's
 * "Document" row is selected: the same DocumentPropertiesForm the File >
 * Document properties dialog uses, applying each change immediately (one undo
 * step per change, like element properties). Removing the last Font/Flow line
 * here removes the Document row and clears the selection.
 */
import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

import DocumentPropertiesForm from './DocumentPropertiesForm.jsx';
import { documentPropsEvent } from './documentPropsTracking.js';
import { selectDocument } from '../../store/documentSlice.js';
import { openFontSourceDialog, selectFontSource } from '../../store/uiSlice.js';
import { applyStructuralEdit } from '../../store/thunks.js';
import { readDocumentProps, samePropsInFile } from '../../utils/documentProps.js';
import { setDocumentProps } from '../../utils/treeOps.js';
import { loadCatalog } from '../../utils/fontCatalog.js';
import useTrack from '../../hooks/useTrack.js';
import { EVENTS } from '../../utils/analytics.js';

export default function DocumentPropertiesPanel() {
  const dispatch = useDispatch();
  const track = useTrack();
  const doc = useSelector(selectDocument);
  const source = useSelector(selectFontSource);
  const value = useMemo(() => readDocumentProps(doc), [doc]);

  /** @param {import('../../utils/documentProps.js').DocumentProps} next */
  const change = async (next) => {
    if (samePropsInFile(next, value)) return;
    const result = setDocumentProps(doc, next);
    dispatch(applyStructuralEdit({ source: result.doc.serialize(), selectId: result.selectedId }));
    track(EVENTS.DOCUMENT_PROPERTIES, documentPropsEvent(next, await loadCatalog(), 'inspector'));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Box sx={{ px: 2, py: 1.25, bgcolor: 'divider' }}>
        <Typography variant="subtitle2">Document properties</Typography>
        <Typography variant="caption" color="text.secondary">Applies to the whole file.</Typography>
      </Box>
      <Divider />
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 2 }}>
        <DocumentPropertiesForm
          value={value}
          onChange={change}
          source={source}
          onRequestSource={() => dispatch(openFontSourceDialog())}
        />
      </Box>
    </Box>
  );
}
