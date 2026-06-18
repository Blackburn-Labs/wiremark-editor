// @ts-check
import { describe, it, expect, beforeEach } from 'vitest';
import reducer, {
  setThemeMode,
  setViewMode,
  selectElement,
  clearSelection,
  setHoveredElement,
  selectThemeMode,
  selectViewMode,
  selectSelectedElementId,
  selectHoveredElementId,
} from './uiSlice.js';

/** @param {object} uiState */
function root(uiState) {
  return { ui: uiState };
}

describe('uiSlice', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }
  });

  it('has the expected initial fields', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(['light', 'dark', 'system']).toContain(state.themeMode);
    expect(state.viewMode).toBe('split');
    expect(state.selectedElementId).toBeNull();
    expect(state.hoveredElementId).toBeNull();
  });

  it('setThemeMode updates and persists', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, setThemeMode('dark'));
    expect(selectThemeMode(root(state))).toBe('dark');
    if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
      expect(localStorage.getItem('wiremark.themeMode')).toBe('dark');
    }
  });

  it('setViewMode updates', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, setViewMode('render'));
    expect(selectViewMode(root(state))).toBe('render');
  });

  it('selectElement and clearSelection update the selected id', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, selectElement('0.2.1'));
    expect(selectSelectedElementId(root(state))).toBe('0.2.1');
    state = reducer(state, clearSelection());
    expect(selectSelectedElementId(root(state))).toBeNull();
  });

  it('setHoveredElement sets and clears the hovered id', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, setHoveredElement('0.2.1'));
    expect(selectHoveredElementId(root(state))).toBe('0.2.1');
    state = reducer(state, setHoveredElement(null));
    expect(selectHoveredElementId(root(state))).toBeNull();
  });
});
