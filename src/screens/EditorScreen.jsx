// @ts-check
/**
 * EditorScreen -- the single full-page view. Composes:
 *   AppBar (top)
 *   | ComponentDrawer (left) | workspace | inspector rail (right) |
 *
 * The workspace switches on `viewMode` (IntelliJ-style markdown editing):
 *   - 'text'   -> the CodeMirror editor only
 *   - 'render' -> the rendered SVG only
 *   - 'split'  -> editor + render side by side
 * The inspector rail (outline tree + property inspector) is shown whenever the
 * render is visible, since element selection is a render-side concern.
 */
import { useSelector } from 'react-redux';
import Box from '@mui/material/Box';

import { selectViewMode } from '../store/uiSlice.js';
import EditorAppBar from '../components/layout/EditorAppBar.jsx';
import ComponentDrawer from '../components/layout/ComponentDrawer.jsx';
import WiremarkEditor from '../features/editor/WiremarkEditor.jsx';
import RenderPanel from '../features/render/RenderPanel.jsx';
import OutlineTree from '../features/render/OutlineTree.jsx';
import ElementInspector from '../features/render/ElementInspector.jsx';

const RAIL_WIDTH = 320;

export default function EditorScreen() {
  const viewMode = useSelector(selectViewMode);
  const showEditor = viewMode === 'text' || viewMode === 'split';
  const showRender = viewMode === 'render' || viewMode === 'split';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <EditorAppBar />

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <ComponentDrawer />

        {/* Workspace */}
        <Box sx={{ flex: 1, display: 'flex', minWidth: 0, bgcolor: 'background.default' }}>
          {showEditor && (
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                borderRight: showRender ? 1 : 0,
                borderColor: 'divider',
              }}
            >
              <WiremarkEditor />
            </Box>
          )}
          {showRender && (
            <Box sx={{ flex: 1, minWidth: 0, display: 'flex' }}>
              <RenderPanel />
            </Box>
          )}
        </Box>

        {/* Inspector rail: outline (top) + property inspector (bottom) */}
        {showRender && (
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
    </Box>
  );
}
