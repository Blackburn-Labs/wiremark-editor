// @ts-check
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import reducer, {
  setThemeMode,
  setVisiblePanes,
  togglePane,
  setEditorWidthPercent,
  selectElement,
  clearSelection,
  setHoveredElement,
  selectThemeMode,
  selectVisiblePanes,
  selectEditorWidthPercent,
  selectSelectedElementId,
  selectHoveredElementId,
} from './uiSlice.js';

/** @param {object} uiState */
function root(uiState) {
  return { ui: uiState };
}

describe('uiSlice', () => {
  beforeEach(() => {
    const values = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      clear: () => values.clear(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('has the expected initial fields', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(['light', 'dark', 'system']).toContain(state.themeMode);
    expect(state.visiblePanes).toEqual(['components', 'editor', 'renderer', 'inspector']);
    expect(state.editorWidthPercent).toBe(50);
    expect(state.selectedElementId).toBeNull();
    expect(state.hoveredElementId).toBeNull();
  });

  it('setThemeMode updates and persists', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, setThemeMode('dark'));
    expect(selectThemeMode(root(state))).toBe('dark');
    expect(localStorage.getItem('wiremark.themeMode')).toBe('dark');
  });

  it('setVisiblePanes updates, orders, and persists valid pane ids', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, setVisiblePanes(['inspector', 'editor']));
    expect(selectVisiblePanes(root(state))).toEqual(['editor', 'inspector']);
    expect(localStorage.getItem('wiremark.visiblePanes')).toBe('["editor","inspector"]');
  });

  it('togglePane hides and restores a pane in layout order', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, togglePane('components'));
    expect(selectVisiblePanes(root(state))).toEqual(['editor', 'renderer', 'inspector']);
    state = reducer(state, togglePane('components'));
    expect(selectVisiblePanes(root(state))).toEqual([
      'components',
      'editor',
      'renderer',
      'inspector',
    ]);
  });

  describe('editor/renderer are never both hidden', () => {
    const ALL = ['components', 'editor', 'renderer', 'inspector'];

    it('either content pane can be hidden while both are visible', () => {
      const initial = reducer(undefined, { type: '@@INIT' });
      expect(reducer(initial, togglePane('editor')).visiblePanes).toEqual([
        'components',
        'renderer',
        'inspector',
      ]);
      expect(reducer(initial, togglePane('renderer')).visiblePanes).toEqual([
        'components',
        'editor',
        'inspector',
      ]);
    });

    it('hiding the editor while the renderer is hidden swaps to the renderer', () => {
      let state = reducer(undefined, { type: '@@INIT' });
      state = reducer(state, togglePane('renderer'));
      state = reducer(state, togglePane('editor'));
      expect(selectVisiblePanes(root(state))).toEqual(['components', 'renderer', 'inspector']);
      expect(localStorage.getItem('wiremark.visiblePanes')).toBe(
        '["components","renderer","inspector"]',
      );
    });

    it('hiding the renderer while the editor is hidden swaps to the editor', () => {
      let state = reducer(undefined, { type: '@@INIT' });
      state = reducer(state, togglePane('editor'));
      state = reducer(state, togglePane('renderer'));
      expect(selectVisiblePanes(root(state))).toEqual(['components', 'editor', 'inspector']);
    });

    it('repeating the shortcut flips between full-width editor and renderer', () => {
      let state = reducer(undefined, { type: '@@INIT' });
      state = reducer(state, togglePane('renderer'));
      state = reducer(state, togglePane('editor'));
      expect(state.visiblePanes).toEqual(['components', 'renderer', 'inspector']);
      state = reducer(state, togglePane('renderer'));
      expect(state.visiblePanes).toEqual(['components', 'editor', 'inspector']);
    });

    it('applies the same swap through setVisiblePanes (toolbar path)', () => {
      let state = reducer(undefined, { type: '@@INIT' });
      state = reducer(state, setVisiblePanes(['editor']));
      state = reducer(state, setVisiblePanes([]));
      expect(state.visiblePanes).toEqual(['renderer']);
      state = reducer(state, setVisiblePanes(['inspector']));
      expect(state.visiblePanes).toEqual(['editor', 'inspector']);
    });

    it('restores the editor if both content panes are dropped at once', () => {
      const initial = reducer(undefined, { type: '@@INIT' });
      expect(reducer(initial, setVisiblePanes(['components'])).visiblePanes).toEqual([
        'components',
        'editor',
      ]);
    });

    it('leaves components and inspector freely toggleable', () => {
      let state = reducer(undefined, { type: '@@INIT' });
      state = reducer(state, togglePane('components'));
      state = reducer(state, togglePane('inspector'));
      expect(state.visiblePanes).toEqual(['editor', 'renderer']);
      state = reducer(state, togglePane('renderer'));
      state = reducer(state, togglePane('components'));
      expect(state.visiblePanes).toEqual(['components', 'editor']);
      state = reducer(state, togglePane('inspector'));
      state = reducer(state, togglePane('renderer'));
      expect(state.visiblePanes).toEqual(ALL);
    });
  });

  it('restores persisted pane visibility', async () => {
    localStorage.setItem('wiremark.visiblePanes', '["renderer","editor"]');
    localStorage.setItem('wiremark.editorWidthPercent', '63');
    vi.resetModules();
    const { default: freshReducer } = await import('./uiSlice.js');
    const state = freshReducer(undefined, { type: '@@INIT' });
    expect(state.visiblePanes).toEqual(['editor', 'renderer']);
    expect(state.editorWidthPercent).toBe(63);
  });

  it('falls back to all panes for malformed persisted state', async () => {
    localStorage.setItem('wiremark.visiblePanes', 'not-json');
    vi.resetModules();
    const { default: freshReducer } = await import('./uiSlice.js');
    const state = freshReducer(undefined, { type: '@@INIT' });
    expect(state.visiblePanes).toEqual(['components', 'editor', 'renderer', 'inspector']);
  });

  it('ignores invalid pane updates', () => {
    const initial = reducer(undefined, { type: '@@INIT' });
    expect(reducer(initial, setVisiblePanes(['editor', 'unknown']))).toEqual(initial);
    expect(reducer(initial, togglePane('unknown'))).toEqual(initial);
  });

  it('updates, clamps, and persists the editor width', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, setEditorWidthPercent(64));
    expect(selectEditorWidthPercent(root(state))).toBe(64);
    expect(localStorage.getItem('wiremark.editorWidthPercent')).toBe('64');
    state = reducer(state, setEditorWidthPercent(2));
    expect(selectEditorWidthPercent(root(state))).toBe(15);
    state = reducer(state, setEditorWidthPercent(98));
    expect(selectEditorWidthPercent(root(state))).toBe(85);
  });

  it('ignores an invalid editor width', () => {
    const initial = reducer(undefined, { type: '@@INIT' });
    expect(reducer(initial, setEditorWidthPercent('invalid'))).toEqual(initial);
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
