// @ts-check
/**
 * WiremarkEditor -- the CodeMirror text editor bound to the canonical wiremark
 * SOURCE in the store. The source string is the single
 * source of truth: this component reads it via `selectSource` and writes every
 * change back through `setSource` (which coalesces typing bursts for undo).
 *
 * Highlighting is purely lexical (single-line) via `wiremarkLanguage` +
 * `wiremarkHighlighting`; type-ahead comes from `wiremarkCompletionSource`. Both
 * the base CodeMirror theme and the syntax-highlight palette follow the app's
 * resolved theme mode (a high-contrast light palette on the white background, the
 * Dracula palette on dark).
 *
 * Cursor <-> selection sync (two-way, loop-guarded):
 *  - Moving the cursor onto an element's line selects that element (OutlineTree /
 *    ElementInspector follow the caret).
 *  - Selecting an element elsewhere (outline click, a move op) scrolls the editor
 *    to that element's line and places the caret there.
 * The `idToLine`/`lineToId` maps come from the memoized `selectLineIndex`.
 */
import { useMemo, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import { Box } from '@mui/material';
import CodeMirror from '@uiw/react-codemirror';
import { autocompletion } from '@codemirror/autocomplete';
import { EditorView, keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';

import { selectSource, setSource, selectLineIndex } from '../../store/documentSlice.js';
import { selectSelectedElementId, selectElement } from '../../store/uiSlice.js';
import { useResolvedThemeMode } from '../../theme/ThemeModeProvider.jsx';
import { wiremarkLanguage, wiremarkHighlighting } from './wiremarkLanguage.js';
import { wiremarkCompletionSource } from './wiremarkCompletions.js';
import { insertSmartNewline } from './smartNewline.js';

/**
 * @param {object} props
 * @param {string} [props.height] CSS height for the editor surface (default '100%').
 */
export default function WiremarkEditor({ height = '100%' }) {
  const dispatch = useDispatch();
  const source = useSelector(selectSource);
  const resolvedMode = useResolvedThemeMode();
  const lineIndex = useSelector(selectLineIndex);
  const selectedId = useSelector(selectSelectedElementId);

  // Refs so the (stable) CodeMirror callbacks always read the latest values
  // without re-creating the editor, plus a flag to suppress the cursor->selection
  // dispatch while we are MOVING the cursor programmatically (selection->cursor).
  const viewRef = useRef(/** @type {EditorView|null} */ (null));
  const lineIndexRef = useRef(lineIndex);
  const selectedIdRef = useRef(selectedId);
  const suppressRef = useRef(false);
  lineIndexRef.current = lineIndex;
  selectedIdRef.current = selectedId;

  const extensions = useMemo(
    () => [
      // Structure-aware Enter. Highest precedence so it overrides basicSetup's
      // default Enter; the command itself defers to an active autocomplete.
      Prec.highest(keymap.of([{ key: 'Enter', run: insertSmartNewline }])),
      wiremarkLanguage(),
      wiremarkHighlighting(resolvedMode),
      autocompletion({ override: [wiremarkCompletionSource] }),
    ],
    [resolvedMode],
  );

  const handleChange = useCallback(
    /** @param {string} value */
    (value) => {
      dispatch(setSource(value));
    },
    [dispatch],
  );

  const handleCreateEditor = useCallback((view) => {
    viewRef.current = view;
  }, []);

  // Cursor -> selection: when the caret lands on an element's line, select it.
  const handleUpdate = useCallback(
    /** @param {import('@codemirror/view').ViewUpdate} vu */
    (vu) => {
      if (!vu.selectionSet) return;
      // Don't re-derive selection from the caret during an edit: the line index
      // is stale until Redux re-parses, so a caret moved by typing/Enter would
      // map to the wrong element and yank the caret away. Genuine navigation
      // (clicks, arrow keys) carries no doc change and still syncs.
      if (vu.docChanged) return;
      if (suppressRef.current) {
        suppressRef.current = false;
        return;
      }
      const head = vu.state.selection.main.head;
      const line = vu.state.doc.lineAt(head).number;
      const id = lineIndexRef.current.lineToId[line];
      if (id && id !== selectedIdRef.current) {
        dispatch(selectElement(id));
      }
    },
    [dispatch],
  );

  // Selection -> cursor: only when the SELECTION itself changes (not on every
  // keystroke), scroll to and place the caret on the selected element's line.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || selectedId == null) return;
    const targetLine = lineIndexRef.current.idToLine[selectedId];
    if (!targetLine) return;
    const current = view.state.doc.lineAt(view.state.selection.main.head).number;
    if (current === targetLine) return; // already there -> no move, no loop
    const lineObj = view.state.doc.line(targetLine);
    suppressRef.current = true;
    view.dispatch({
      selection: { anchor: lineObj.from },
      effects: EditorView.scrollIntoView(lineObj.from, { y: 'center' }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <Box
      sx={{
        height,
        width: '100%',
        overflow: 'auto',
        '& .cm-editor': { height: '100%' },
        '& .cm-scroller': { fontFamily: 'monospace' },
      }}
    >
      <CodeMirror
        value={source}
        onChange={handleChange}
        onCreateEditor={handleCreateEditor}
        onUpdate={handleUpdate}
        extensions={extensions}
        theme={resolvedMode}
        height="100%"
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          foldGutter: false,
        }}
      />
    </Box>
  );
}

WiremarkEditor.propTypes = {
  height: PropTypes.string,
};
