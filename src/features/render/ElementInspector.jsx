// @ts-check
/**
 * ElementInspector -- the right-side inspector panel for the selected element. It resolves
 * the selected element from the derived
 * document, and for a live selection renders:
 *  - a Move controls row (Up / Down / Ascend / Descend) plus a Remove button,
 *    each wired through `applyStructuralEdit` (the moves enabled per the matching
 *    `treeOps` predicate), and
 *  - the dynamic `PropertyForm` (token edits are likewise applied structurally).
 *
 * When no element is selected (or the selection no longer resolves -- e.g. after
 * an undo or a text edit that deleted the node), it shows an empty
 * state.
 */
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import LastPageIcon from '@mui/icons-material/LastPage';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';

import PropertyForm from '../properties/PropertyForm.jsx';
import registryAdapter from '../../utils/registryAdapter.js';
import {
  canMoveUp,
  canMoveDown,
  canAscend,
  canDescend,
  moveUp,
  moveDown,
  ascend,
  descend,
  removeElement,
  updateElementTokens,
} from '../../utils/treeOps.js';
import { applyStructuralEdit } from '../../store/thunks.js';
import { selectDocument } from '../../store/documentSlice.js';
import { selectSelectedElementId } from '../../store/uiSlice.js';

/**
 * The Move controls row: the four move buttons (each disabled per its predicate)
 * plus a Remove button set apart to the right. On click each runs the matching
 * `treeOps` mutator and bubbles its `{ doc, selectedId }` result up via `onMove`
 * (`removeElement` reports the parent as the new selection, or null for a frame).
 * Removal is undoable, so it applies immediately without a confirm step.
 * @param {{
 *   doc: import('../../domain/WiremarkDocument.js').default,
 *   id: string,
 *   onMove: (result: { doc: import('../../domain/WiremarkDocument.js').default, selectedId: string|null }) => void,
 * }} props
 */
export function MoveControls({ doc, id, onMove }) {
  /** @type {Array<{ key: string, title: string, Icon: typeof ArrowUpwardIcon, can: boolean, run: () => ReturnType<typeof moveUp> }>} */
  const controls = [
    { key: 'up', title: 'Move up', Icon: ArrowUpwardIcon, can: canMoveUp(doc, id), run: () => moveUp(doc, id) },
    { key: 'down', title: 'Move down', Icon: ArrowDownwardIcon, can: canMoveDown(doc, id), run: () => moveDown(doc, id) },
    { key: 'ascend', title: 'Ascend (out one level)', Icon: FirstPageIcon, can: canAscend(doc, id), run: () => ascend(doc, id) },
    { key: 'descend', title: 'Descend (into next sibling)', Icon: LastPageIcon, can: canDescend(doc, id), run: () => descend(doc, id) },
  ];

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2, py: 1, bgcolor: 'divider' }}>
      {controls.map(({ key, title, Icon, can, run }) => (
        <Tooltip key={key} title={title}>
          {/* span keeps the tooltip working while the button is disabled */}
          <span>
            <IconButton
              size="small"
              aria-label={title}
              disabled={!can}
              onClick={() => onMove(run())}
            >
              <Icon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      ))}
      {/* Remove sits apart from the move group -- it deletes, not reorders. */}
      <Box sx={{ flexGrow: 1 }} />
      <Tooltip title="Remove element">
        {/* span keeps the tooltip working consistently with the move buttons */}
        <span>
          <IconButton
            size="small"
            color="error"
            aria-label="Remove element"
            onClick={() => onMove(removeElement(doc, id))}
          >
            <DeleteOutlinedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}

MoveControls.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  doc: PropTypes.object.isRequired,
  id: PropTypes.string.isRequired,
  onMove: PropTypes.func.isRequired,
};

/**
 * Presentational inspector body. Given the resolved element (or null) plus the
 * doc and callbacks, renders the move row + property form, or an empty state.
 * Storyable without the store.
 * @param {{
 *   doc: import('../../domain/WiremarkDocument.js').default,
 *   element: import('../../domain/WiremarkElement.js').default|null|undefined,
 *   idOptions?: string[],
 *   onMove: (result: { doc: import('../../domain/WiremarkDocument.js').default, selectedId: string|null }) => void,
 *   onChangeTokens: (tokens: import('../../utils/wmParser.js').Token[]) => void,
 * }} props
 */
export function InspectorView({ doc, element, idOptions = [], onMove, onChangeTokens }) {
  if (!element || element.id == null) {
    return (
      <Box sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
          <Typography variant="body2">No element selected.</Typography>
          <Typography variant="caption" sx={{ textAlign: 'center' }}>
            Select an element to edit its properties.
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <MoveControls doc={doc} id={element.id} onMove={onMove} />
      <Divider />
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <PropertyForm element={element} idOptions={idOptions} onChangeTokens={onChangeTokens} />
      </Box>
    </Box>
  );
}

InspectorView.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  doc: PropTypes.object.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  element: PropTypes.object,
  idOptions: PropTypes.arrayOf(PropTypes.string),
  onMove: PropTypes.func.isRequired,
  onChangeTokens: PropTypes.func.isRequired,
};

/**
 * The store-bound inspector used by the app.
 */
export default function ElementInspector() {
  const doc = useSelector(selectDocument);
  const id = useSelector(selectSelectedElementId);
  const dispatch = useDispatch();

  const element = id != null ? doc.findById(id) : undefined;
  const idOptions = registryAdapter.idsInDocument(doc).map((x) => `#${x}`);

  /** @param {{ doc: import('../../domain/WiremarkDocument.js').default, selectedId: string|null }} result */
  const applyResult = (result) => {
    dispatch(applyStructuralEdit({ source: result.doc.serialize(), selectId: result.selectedId }));
  };

  /** @param {import('../../utils/wmParser.js').Token[]} tokens */
  const handleChangeTokens = (tokens) => {
    if (id == null) return;
    applyResult(updateElementTokens(doc, id, tokens));
  };

  return (
    <InspectorView
      doc={doc}
      element={element}
      idOptions={idOptions}
      onMove={applyResult}
      onChangeTokens={handleChangeTokens}
    />
  );
}
