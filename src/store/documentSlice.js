// @ts-check
/**
 * Document slice -- the wiremark SOURCE TEXT currently being edited, plus the
 * bookkeeping needed for open/save (file name, dirty tracking) and the
 * undo/redo history.
 *
 * The source string is canonical. The editable `WiremarkDocument` is NOT stored
 * here; it is derived on demand via the memoized `selectDocument` selector so an
 * unchanged source reparses to a document with stable path ids.
 *
 * History semantics:
 *  - `setSource` (typing) coalesces bursts: a new undo snapshot is only pushed
 *    when at least COALESCE_MS have elapsed since the previous edit, so a typing
 *    run collapses into a single undo entry.
 *  - `applyEdit` (structural edits from treeOps / the property form) ALWAYS
 *    snapshots and resets `lastEditAt` to 0 so the next keystroke snapshots too.
 */
import { createSlice, createSelector } from '@reduxjs/toolkit';
import WiremarkDocument from '../domain/WiremarkDocument.js';
import { hasActiveHandle } from '../utils/fileIo.js';
import { buildLineIndex } from '../utils/lineIndex.js';

/** Max number of undo snapshots retained. */
export const MAX_HISTORY = 100;
/** Coalescing window for `setSource` typing bursts, in milliseconds. */
export const COALESCE_MS = 400;

/** A valid starter document, verified to render. */
export const STARTER_SOURCE = `Wireframe #home mobile
  AppBar
    Typography h6 "Wiremark Editor"
  Stack column gap=2 padding=2
    Typography h4 "Hello, wiremark"
    TextField "Search" startIcon=search
    Button "Get started" contained to=#home
`;

/**
 * @typedef {object} DocumentState
 * @property {string} source canonical live wiremark source
 * @property {string} savedSource last opened/saved snapshot (dirty = source !== savedSource)
 * @property {string|null} fileName display name of the open file (null = untitled)
 * @property {boolean} hasHandle mirrors fileIo.hasActiveHandle() for Save labeling
 * @property {string[]} past undo stack (cap MAX_HISTORY)
 * @property {string[]} future redo stack
 * @property {number} lastEditAt ms timestamp of last setSource, for coalescing
 */

/** @type {DocumentState} */
const initialState = {
  source: STARTER_SOURCE,
  savedSource: STARTER_SOURCE,
  fileName: null,
  hasHandle: false,
  past: [],
  future: [],
  lastEditAt: 0,
};

/**
 * Push a string onto the undo stack, enforcing the MAX_HISTORY cap by dropping
 * the oldest entries.
 * @param {string[]} past
 * @param {string} value
 */
function pushPast(past, value) {
  past.push(value);
  if (past.length > MAX_HISTORY) {
    past.splice(0, past.length - MAX_HISTORY);
  }
}

const documentSlice = createSlice({
  name: 'document',
  initialState,
  reducers: {
    setSource: {
      /**
       * Stamp the edit time so the reducer can coalesce typing bursts.
       * @param {string} text
       */
      prepare(text) {
        return { payload: text, meta: { at: Date.now() } };
      },
      /**
       * @param {DocumentState} state
       * @param {{ payload: string, meta: { at: number } }} action
       */
      reducer(state, action) {
        const text = action.payload;
        const at = action.meta?.at ?? Date.now();
        if (at - state.lastEditAt >= COALESCE_MS) {
          pushPast(state.past, state.source);
          state.future = [];
        }
        state.source = text;
        state.lastEditAt = at;
      },
    },

    /**
     * Apply a structural edit (treeOps / property form). ALWAYS snapshots and
     * resets `lastEditAt` so the next keystroke snapshots too.
     * @param {DocumentState} state
     * @param {{ payload: string }} action
     */
    applyEdit(state, action) {
      pushPast(state.past, state.source);
      state.future = [];
      state.source = action.payload;
      state.lastEditAt = 0;
    },

    /**
     * @param {DocumentState} state
     */
    undo(state) {
      if (state.past.length === 0) return;
      const previous = /** @type {string} */ (state.past.pop());
      state.future.unshift(state.source);
      state.source = previous;
      state.lastEditAt = 0;
    },

    /**
     * @param {DocumentState} state
     */
    redo(state) {
      if (state.future.length === 0) return;
      const next = /** @type {string} */ (state.future.shift());
      pushPast(state.past, state.source);
      state.source = next;
      state.lastEditAt = 0;
    },

    /**
     * Replace the document contents (e.g. after opening a file). Clears history.
     * @param {DocumentState} state
     * @param {{ payload: { source: string, fileName?: string|null } }} action
     */
    loadDocument(state, action) {
      const { source, fileName } = action.payload;
      state.source = source;
      state.savedSource = source;
      state.fileName = fileName ?? null;
      state.hasHandle = hasActiveHandle();
      state.past = [];
      state.future = [];
      state.lastEditAt = 0;
    },

    /**
     * Start a fresh, empty document. Clears history.
     * @param {DocumentState} state
     */
    newDocument(state) {
      state.source = '';
      state.savedSource = '';
      state.fileName = null;
      state.hasHandle = false;
      state.past = [];
      state.future = [];
      state.lastEditAt = 0;
    },

    /**
     * Mark the current source as saved (clears the dirty flag).
     * @param {DocumentState} state
     * @param {{ payload: { fileName?: string|null } }} action
     */
    markSaved(state, action) {
      state.savedSource = state.source;
      if (action.payload && action.payload.fileName !== undefined) {
        state.fileName = action.payload.fileName;
      }
      state.hasHandle = true;
    },
  },
});

export const {
  setSource,
  applyEdit,
  undo,
  redo,
  loadDocument,
  newDocument,
  markSaved,
} = documentSlice.actions;

/** @typedef {{ document: DocumentState }} RootSlice */

/** @param {RootSlice} state */
export const selectSource = (state) => state.document.source;
/** @param {RootSlice} state */
export const selectFileName = (state) => state.document.fileName;
/** @param {RootSlice} state */
export const selectHasHandle = (state) => state.document.hasHandle;
/** @param {RootSlice} state */
export const selectIsDirty = (state) => state.document.source !== state.document.savedSource;
/** @param {RootSlice} state */
export const selectCanUndo = (state) => state.document.past.length > 0;
/** @param {RootSlice} state */
export const selectCanRedo = (state) => state.document.future.length > 0;

/**
 * The editable document derived from the canonical source. Memoized on the
 * source string so an unchanged source yields the SAME `WiremarkDocument`
 * instance (with stable path ids) across renders.
 */
export const selectDocument = createSelector(
  [selectSource],
  (src) => WiremarkDocument.parse(src),
);

/** Top-level frames of the derived document. */
export const selectFrames = createSelector(
  [selectDocument],
  (doc) => doc.frames,
);

/** Advisory parse diagnostics from the same memoized parse. */
export const selectParseDiagnostics = createSelector(
  [selectDocument],
  (doc) => doc.diagnostics,
);

/**
 * Bidirectional element-id <-> source-line maps for editor cursor/selection
 * sync. Memoized on the derived document so it only recomputes when the source
 * changes.
 */
export const selectLineIndex = createSelector(
  [selectDocument],
  (doc) => buildLineIndex(doc),
);

export default documentSlice.reducer;
