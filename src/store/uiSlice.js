// @ts-check
/**
 * UI slice -- view-level state that is not part of the edited document:
 * theme mode (light/dark/system), visible workspace panes, the currently
 * selected element id (for the render-panel property editor), and the currently
 * hovered element id (the render-panel cursor target, mirrored in the
 * OutlineTree so you can preview what a click would select), the online font
 * source the user chose (a per-browser preference, never part of the document;
 * null = online fonts off), and whether the "Load online fonts from" prompt is
 * open.
 *
 * NOTE: skeleton. The feature teams expand this (e.g. drawer state, dialogs).
 */
import { createSlice } from '@reduxjs/toolkit';
import { isFontSourceId } from '../utils/fontSources.js';

/** @typedef {'light'|'dark'|'system'} ThemeMode */
/** @typedef {'components'|'editor'|'renderer'|'inspector'} PaneId */

const THEME_MODE_STORAGE_KEY = 'wiremark.themeMode';
const VISIBLE_PANES_STORAGE_KEY = 'wiremark.visiblePanes';
const EDITOR_WIDTH_STORAGE_KEY = 'wiremark.editorWidthPercent';
const FONT_SOURCE_STORAGE_KEY = 'wiremark.fontSource';

export const EDITOR_WIDTH_MIN = 15;
export const EDITOR_WIDTH_MAX = 85;
export const EDITOR_WIDTH_DEFAULT = 50;

/** @type {ReadonlyArray<PaneId>} */
export const PANE_IDS = Object.freeze(['components', 'editor', 'renderer', 'inspector']);

/** @param {*} value @returns {value is PaneId} */
function isPaneId(value) {
  return PANE_IDS.includes(value);
}

/**
 * Normalize pane ids into their stable toolbar/layout order.
 * @param {*} value
 * @returns {PaneId[]|null}
 */
function normalizePaneIds(value) {
  if (!Array.isArray(value) || !value.every(isPaneId)) return null;
  return PANE_IDS.filter((pane) => value.includes(pane));
}

/**
 * Enforce "the editor or the renderer is always visible" (the components and
 * inspector panes are free to toggle). Hiding the last visible content pane
 * swaps to the other one instead of leaving an empty workspace, so the toolbar
 * button / shortcut always does something visible:
 *   - editor only    + hide editor   -> renderer only
 *   - renderer only  + hide renderer -> editor only
 * If both are dropped at once (not possible from the UI), the editor wins.
 * @param {PaneId[]} prev the panes visible before the change
 * @param {PaneId[]} next the requested panes (normalized order)
 * @returns {PaneId[]} `next`, with the other content pane added if needed
 */
function keepContentPaneVisible(prev, next) {
  if (next.includes('editor') || next.includes('renderer')) return next;
  const restore =
    prev.includes('editor') && !prev.includes('renderer') ? 'renderer' : 'editor';
  return PANE_IDS.filter((pane) => pane === restore || next.includes(pane));
}

/** @param {*} value @returns {number|null} */
function normalizeEditorWidth(value) {
  const width = Number(value);
  if (!Number.isFinite(width)) return null;
  return Math.min(EDITOR_WIDTH_MAX, Math.max(EDITOR_WIDTH_MIN, width));
}

/**
 * Read the persisted theme mode. Guarded so it is safe under any environment
 * (no `localStorage`, or a partial stub lacking `getItem`, e.g. Node's
 * experimental built-in storage that shadows jsdom in tests).
 * @returns {ThemeMode}
 */
function loadThemeMode() {
  if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') {
    return 'system';
  }
  const stored = localStorage.getItem(THEME_MODE_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

/** @returns {PaneId[]} */
function loadVisiblePanes() {
  if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') {
    return [...PANE_IDS];
  }
  try {
    const stored = localStorage.getItem(VISIBLE_PANES_STORAGE_KEY);
    if (stored === null) return [...PANE_IDS];
    return normalizePaneIds(JSON.parse(stored)) ?? [...PANE_IDS];
  } catch {
    return [...PANE_IDS];
  }
}

/** @returns {number} */
function loadEditorWidth() {
  if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') {
    return EDITOR_WIDTH_DEFAULT;
  }
  const stored = localStorage.getItem(EDITOR_WIDTH_STORAGE_KEY);
  return stored === null
    ? EDITOR_WIDTH_DEFAULT
    : normalizeEditorWidth(stored) ?? EDITOR_WIDTH_DEFAULT;
}

/**
 * The online font source chosen in this browser, or null (online fonts off).
 * @returns {import('../utils/fontSources.js').FontSourceId|null}
 */
function loadFontSource() {
  if (typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') {
    return null;
  }
  try {
    const stored = localStorage.getItem(FONT_SOURCE_STORAGE_KEY);
    return isFontSourceId(stored) ? stored : null;
  } catch {
    return null;
  }
}

/** @param {string|null} source */
function persistFontSource(source) {
  if (typeof localStorage === 'undefined') return;
  try {
    if (source === null) {
      if (typeof localStorage.removeItem === 'function') localStorage.removeItem(FONT_SOURCE_STORAGE_KEY);
    } else if (typeof localStorage.setItem === 'function') {
      localStorage.setItem(FONT_SOURCE_STORAGE_KEY, source);
    }
  } catch {
    // Storage blocked: the choice still applies for this session.
  }
}

/** @param {PaneId[]} panes */
function persistVisiblePanes(panes) {
  if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
    localStorage.setItem(VISIBLE_PANES_STORAGE_KEY, JSON.stringify(panes));
  }
}

/** @param {number} width */
function persistEditorWidth(width) {
  if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
    localStorage.setItem(EDITOR_WIDTH_STORAGE_KEY, String(width));
  }
}

const initialState = {
  /** @type {ThemeMode} */
  themeMode: loadThemeMode(),
  /** @type {PaneId[]} */
  visiblePanes: loadVisiblePanes(),
  /** Editor share of the central workspace when both central panes are visible. */
  editorWidthPercent: loadEditorWidth(),
  /** @type {string|null} id of the element selected in the render panel */
  selectedElementId: null,
  /** @type {string|null} id of the element under the render-panel cursor (hover preview) */
  hoveredElementId: null,
  /** @type {import('../utils/fontSources.js').FontSourceId|null} where online fonts download from; null = off */
  fontSource: loadFontSource(),
  /** Whether the "Load online fonts from" prompt is open. */
  fontSourceDialogOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setThemeMode(state, action) {
      state.themeMode = action.payload;
      if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        localStorage.setItem(THEME_MODE_STORAGE_KEY, action.payload);
      }
    },
    setVisiblePanes(state, action) {
      const panes = normalizePaneIds(action.payload);
      if (panes === null) return;
      state.visiblePanes = keepContentPaneVisible(state.visiblePanes, panes);
      persistVisiblePanes(state.visiblePanes);
    },
    togglePane(state, action) {
      const pane = action.payload;
      if (!isPaneId(pane)) return;
      const next = state.visiblePanes.includes(pane)
        ? state.visiblePanes.filter((item) => item !== pane)
        : PANE_IDS.filter((item) => item === pane || state.visiblePanes.includes(item));
      state.visiblePanes = keepContentPaneVisible(state.visiblePanes, next);
      persistVisiblePanes(state.visiblePanes);
    },
    setEditorWidthPercent(state, action) {
      const width = normalizeEditorWidth(action.payload);
      if (width === null) return;
      state.editorWidthPercent = width;
      persistEditorWidth(width);
    },
    selectElement(state, action) {
      state.selectedElementId = action.payload;
    },
    clearSelection(state) {
      state.selectedElementId = null;
    },
    /**
     * Set (or clear, with a null payload) the element under the render-panel
     * cursor. Drives the cursor affordance and the OutlineTree hover preview.
     * @param {{ hoveredElementId: string|null }} state
     * @param {{ payload: string|null }} action
     */
    setHoveredElement(state, action) {
      state.hoveredElementId = action.payload;
    },
    /**
     * Choose where online fonts download from, or turn them off with null.
     * Persisted per browser; never written into the document.
     * @param {{ fontSource: string|null }} state
     * @param {{ payload: string|null }} action
     */
    setFontSource(state, action) {
      const next = isFontSourceId(action.payload) ? action.payload : null;
      state.fontSource = next;
      persistFontSource(next);
    },
    openFontSourceDialog(state) {
      state.fontSourceDialogOpen = true;
    },
    closeFontSourceDialog(state) {
      state.fontSourceDialogOpen = false;
    },
  },
});

export const {
  setThemeMode,
  setVisiblePanes,
  togglePane,
  setEditorWidthPercent,
  selectElement,
  clearSelection,
  setHoveredElement,
  setFontSource,
  openFontSourceDialog,
  closeFontSourceDialog,
} = uiSlice.actions;

export const selectThemeMode = (state) => state.ui.themeMode;
export const selectVisiblePanes = (state) => state.ui.visiblePanes;
export const selectEditorWidthPercent = (state) => state.ui.editorWidthPercent;
export const selectSelectedElementId = (state) => state.ui.selectedElementId;
export const selectHoveredElementId = (state) => state.ui.hoveredElementId;
export const selectFontSource = (state) => state.ui.fontSource;
export const selectFontSourceDialogOpen = (state) => state.ui.fontSourceDialogOpen;

export default uiSlice.reducer;
