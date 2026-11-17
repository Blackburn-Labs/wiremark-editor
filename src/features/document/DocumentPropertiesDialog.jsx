// @ts-check
/**
 * DocumentPropertiesDialog -- File > Document properties... A convenient way to
 * write the document-level `Font` / `Flow` lines (they can be typed by hand
 * just as well). Edits a draft with the shared DocumentPropertiesForm; Save
 * applies it as ONE undo step and, when that leaves a Font/Flow line in the
 * file, selects the Outline's Document row so the same form stays in view in
 * the Inspector. Cancel (or a Save with nothing changed) writes nothing.
 */
import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

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

/**
 * Presentational dialog around a draft.
 * @param {{
 *   open: boolean,
 *   initial: import('../../utils/documentProps.js').DocumentProps,
 *   source: import('../../utils/fontSources.js').FontSourceId|null,
 *   onRequestSource: () => void,
 *   onSave: (draft: import('../../utils/documentProps.js').DocumentProps) => void,
 *   onClose: () => void,
 * }} props
 */
export function DocumentPropertiesDialogView({
  open, initial, source, onRequestSource, onSave, onClose,
}) {
  const [draft, setDraft] = useState(initial);
  // Start from the file each time the dialog opens.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) setDraft(initial); }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="doc-props-title">
      <DialogTitle id="doc-props-title">Document properties</DialogTitle>
      <DialogContent dividers>
        <DocumentPropertiesForm
          value={draft}
          onChange={setDraft}
          source={source}
          onRequestSource={onRequestSource}
          autoFocus
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSave(draft)}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

DocumentPropertiesDialogView.propTypes = {
  open: PropTypes.bool.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  initial: PropTypes.object.isRequired,
  source: PropTypes.oneOf(['bunny', 'fontsource', 'google']),
  onRequestSource: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * The store-bound dialog (FileMenu owns `open`).
 * @param {{ open: boolean, onClose: () => void }} props
 */
export default function DocumentPropertiesDialog({ open, onClose }) {
  const dispatch = useDispatch();
  const track = useTrack();
  const doc = useSelector(selectDocument);
  const source = useSelector(selectFontSource);
  const initial = readDocumentProps(doc);

  /** @param {import('../../utils/documentProps.js').DocumentProps} draft */
  const save = async (draft) => {
    onClose();
    if (samePropsInFile(draft, readDocumentProps(doc))) return;
    const result = setDocumentProps(doc, draft);
    dispatch(applyStructuralEdit({ source: result.doc.serialize(), selectId: result.selectedId }));
    track(EVENTS.DOCUMENT_PROPERTIES, documentPropsEvent(draft, await loadCatalog(), 'dialog'));
  };

  return (
    <DocumentPropertiesDialogView
      open={open}
      initial={initial}
      source={source}
      onRequestSource={() => dispatch(openFontSourceDialog())}
      onSave={save}
      onClose={onClose}
    />
  );
}

DocumentPropertiesDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
