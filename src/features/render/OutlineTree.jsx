// @ts-check
/**
 * OutlineTree -- a collapsible outline of the document's frames + children.
 * Each node is labelled by its `component` plus its
 * wiremark id (`#id`) when present. Clicking a node dispatches
 * `ui/selectElement(node.id)`; the selected node is highlighted.
 *
 * `@mui/x-tree-view` is NOT installed, so this uses a nested MUI
 * `List`/`Collapse` instead of `SimpleTreeView`. A blank/unrecognized line
 * (`component === ''`) is labelled "(empty)" so nothing is invisible.
 */
import { useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import { selectDocument } from '../../store/documentSlice.js';
import {
  selectSelectedElementId,
  selectElement,
  selectHoveredElementId,
} from '../../store/uiSlice.js';

/**
 * Human label for an element: `Component` + optional `#id`.
 * @param {import('../../domain/WiremarkElement.js').default} el
 * @returns {string}
 */
function labelFor(el) {
  const component = el.component || '(empty)';
  const wmId = el.wmId();
  return wmId ? `${component} #${wmId}` : component;
}

/**
 * A single outline node + its (collapsible) children. Recursive.
 * @param {{
 *   element: import('../../domain/WiremarkElement.js').default,
 *   depth: number,
 *   selectedId: string|null,
 *   hoveredId: string|null,
 *   onSelect: (id: string) => void,
 * }} props
 */
function OutlineNode({ element, depth, selectedId, hoveredId, onSelect }) {
  const children = Array.from(element.children ?? []);
  const hasChildren = children.length > 0;
  const [open, setOpen] = useState(true);
  const isSelected = element.id != null && element.id === selectedId;
  // Mirrors the render-panel cursor target so you can preview a click. Styled like
  // the native row hover; suppressed when the row is already selected.
  const isHovered = element.id != null && element.id === hoveredId;

  return (
    <>
      <ListItemButton
        selected={isSelected}
        onClick={() => element.id != null && onSelect(element.id)}
        sx={{
          pl: 1 + depth * 2,
          py: 0.25,
          ...(isHovered && !isSelected && { bgcolor: 'action.hover' }),
        }}
        dense
      >
        <ListItemIcon sx={{ minWidth: 28 }}>
          {hasChildren ? (
            <IconButton
              size="small"
              edge="start"
              aria-label={open ? 'collapse' : 'expand'}
              onClick={(e) => {
                e.stopPropagation();
                setOpen((v) => !v);
              }}
            >
              {open ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
            </IconButton>
          ) : (
            <Box sx={{ width: 28 }} />
          )}
        </ListItemIcon>
        <ListItemText
          primary={labelFor(element)}
          slotProps={{
            primary: {
              variant: 'body2',
              sx: {
                fontFamily: 'monospace',
                fontStyle: element.component ? 'normal' : 'italic',
                color: element.component ? 'text.primary' : 'text.secondary',
              },
            },
          }}
        />
      </ListItemButton>
      {hasChildren && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List component="div" disablePadding dense>
            {children.map((child) => (
              <OutlineNode
                key={child.id ?? labelFor(child)}
                element={child}
                depth={depth + 1}
                selectedId={selectedId}
                hoveredId={hoveredId}
                onSelect={onSelect}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}

OutlineNode.propTypes = {
  // A WiremarkElement instance (duck-typed: component, children, id, wmId()).
  // eslint-disable-next-line react/forbid-prop-types
  element: PropTypes.object.isRequired,
  depth: PropTypes.number.isRequired,
  selectedId: PropTypes.string,
  hoveredId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
};

/**
 * Presentational outline. Takes the document + selection + a select callback so
 * it is storyable without the store.
 * @param {{
 *   doc: import('../../domain/WiremarkDocument.js').default,
 *   selectedId?: string|null,
 *   hoveredId?: string|null,
 *   onSelect: (id: string) => void,
 * }} props
 */
export function OutlineView({
  doc, selectedId = null, hoveredId = null, onSelect,
}) {
  const frames = Array.from(doc?.frames ?? []);

  if (frames.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No frames yet. Add a `Wireframe` to begin.
        </Typography>
      </Box>
    );
  }

  return (
    <List dense disablePadding sx={{ width: '100%' }}>
      {frames.map((frame) => (
        <OutlineNode
          key={frame.id ?? labelFor(frame)}
          element={frame}
          depth={0}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={onSelect}
        />
      ))}
    </List>
  );
}

OutlineView.propTypes = {
  // A WiremarkDocument instance (duck-typed: exposes `frames`).
  // eslint-disable-next-line react/forbid-prop-types
  doc: PropTypes.object.isRequired,
  selectedId: PropTypes.string,
  hoveredId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
};

/**
 * The store-bound outline used by the app.
 */
export default function OutlineTree() {
  const doc = useSelector(selectDocument);
  const selectedId = useSelector(selectSelectedElementId);
  const hoveredId = useSelector(selectHoveredElementId);
  const dispatch = useDispatch();
  return (
    <OutlineView
      doc={doc}
      selectedId={selectedId}
      hoveredId={hoveredId}
      onSelect={(id) => dispatch(selectElement(id))}
    />
  );
}
