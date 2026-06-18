// @ts-check
/**
 * UI slice -- view-level state that is not part of the edited document:
 * theme mode (light/dark/system), the editor view mode (text/split/render),
 * the currently selected element id (for the render-panel property editor), and
 * the currently hovered element id (the render-panel cursor target, mirrored in
 * the OutlineTree so you can preview what a click would select).
 *
 * NOTE: skeleton. The feature teams expand this (e.g. drawer state, dialogs).
 */
import { createSlice } from '@reduxjs/toolkit';

/** @typedef {'light'|'dark'|'system'} ThemeMode */
/** @typedef {'text'|'split'|'render'} ViewMode */

const THEME_MODE_STORAGE_KEY = 'wiremark.themeMode';

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

const initialState = {
  /** @type {ThemeMode} */
  themeMode: loadThemeMode(),
  /** @type {ViewMode} */
  viewMode: 'split',
  /** @type {string|null} id of the element selected in the render panel */
  selectedElementId: null,
  /** @type {string|null} id of the element under the render-panel cursor (hover preview) */
  hoveredElementId: null,
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
    setViewMode(state, action) {
      state.viewMode = action.payload;
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
  },
});

export const {
  setThemeMode,
  setViewMode,
  selectElement,
  clearSelection,
  setHoveredElement,
} = uiSlice.actions;

export const selectThemeMode = (state) => state.ui.themeMode;
export const selectViewMode = (state) => state.ui.viewMode;
export const selectSelectedElementId = (state) => state.ui.selectedElementId;
export const selectHoveredElementId = (state) => state.ui.hoveredElementId;

export default uiSlice.reducer;
