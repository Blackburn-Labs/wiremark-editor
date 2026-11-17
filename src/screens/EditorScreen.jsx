// @ts-check
/**
 * EditorScreen -- the single full-page view. Composes:
 *   AppBar (top)
 *   | ComponentDrawer (left) | workspace | inspector rail (right) |
 *
 * Each of the four columns can be shown independently from the toolbar or with
 * Alt+1 through Alt+4 (Cmd+Option+1..4 on macOS). The inspector column contains
 * the outline tree and property inspector stacked vertically.
 */
import { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Box from '@mui/material/Box';

import {
  selectEditorWidthPercent,
  selectVisiblePanes,
  setEditorWidthPercent,
} from '../store/uiSlice.js';
import EditorAppBar from '../components/layout/EditorAppBar.jsx';
import ComponentDrawer from '../components/layout/ComponentDrawer.jsx';
import PaneDivider from '../components/layout/PaneDivider.jsx';
import WiremarkEditor from '../features/editor/WiremarkEditor.jsx';
import RenderPanel from '../features/render/RenderPanel.jsx';
import OutlineTree from '../features/render/OutlineTree.jsx';
import ElementInspector from '../features/render/ElementInspector.jsx';
import FontSourceDialog from '../features/document/FontSourceDialog.jsx';

const RAIL_WIDTH = 320;

export default function EditorScreen() {
  const dispatch = useDispatch();
  const visiblePanes = useSelector(selectVisiblePanes);
  const editorWidthPercent = useSelector(selectEditorWidthPercent);
  const showComponents = visiblePanes.includes('components');
  const showEditor = visiblePanes.includes('editor');
  const showRenderer = visiblePanes.includes('renderer');
  const showInspector = visiblePanes.includes('inspector');

  // Once the editor has been hidden, re-showing it (toolbar, shortcut, or the
  // editor/renderer swap) mounts it with focus so you can keep typing. Not set
  // on first load, so opening the app doesn't steal focus.
  const editorWasHiddenRef = useRef(false);
  if (!showEditor) editorWasHiddenRef.current = true;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <EditorAppBar />

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {showComponents && <ComponentDrawer />}

        {/* Workspace */}
        <Box sx={{ flex: 1, display: 'flex', minWidth: 0, bgcolor: 'background.default' }}>
          {showEditor && (
            <Box
              sx={{
                flex: showRenderer ? `0 0 ${editorWidthPercent}%` : 1,
                minWidth: 0,
                display: 'flex',
              }}
            >
              <WiremarkEditor autoFocus={editorWasHiddenRef.current} />
            </Box>
          )}
          {showEditor && showRenderer && (
            <PaneDivider
              value={editorWidthPercent}
              onChange={(value) => dispatch(setEditorWidthPercent(value))}
            />
          )}
          {showRenderer && (
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex' }}>
              <RenderPanel />
            </Box>
          )}
        </Box>

        {/* Inspector rail: outline (top) + property inspector (bottom) */}
        {showInspector && (
          <Box
            sx={{
              width: RAIL_WIDTH,
              flexShrink: 0,
              borderLeft: 1,
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              bgcolor: 'background.paper',
            }}
          >
            <Box sx={{ flex: '0 0 42%', overflow: 'auto', borderBottom: 1, borderColor: 'divider' }}>
              <OutlineTree />
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <ElementInspector />
            </Box>
          </Box>
        )}
      </Box>

      {/* "Load online fonts from": opened from the font list or the renderer notice. */}
      <FontSourceDialog />
    </Box>
  );
}
