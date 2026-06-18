// @ts-check
import { describe, it, expect } from 'vitest';
import reducer, {
  setSource,
  applyEdit,
  undo,
  redo,
  loadDocument,
  newDocument,
  markSaved,
  selectSource,
  selectFileName,
  selectHasHandle,
  selectIsDirty,
  selectCanUndo,
  selectCanRedo,
  selectDocument,
  selectFrames,
  selectParseDiagnostics,
  STARTER_SOURCE,
  MAX_HISTORY,
  COALESCE_MS,
} from './documentSlice.js';
import WiremarkDocument from '../domain/WiremarkDocument.js';

/** Build a setSource action with an explicit timestamp (bypasses Date.now). */
function setSourceAt(text, at) {
  return { type: setSource.type, payload: text, meta: { at } };
}

/** Wrap a document slice state into a root-shaped object for selectors. */
function root(docState) {
  return { document: docState };
}

describe('documentSlice initial state', () => {
  it('starts with the valid starter source as both source and savedSource', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state.source).toBe(STARTER_SOURCE);
    expect(state.savedSource).toBe(STARTER_SOURCE);
    expect(state.fileName).toBeNull();
    expect(state.hasHandle).toBe(false);
    expect(state.past).toEqual([]);
    expect(state.future).toEqual([]);
    expect(state.lastEditAt).toBe(0);
  });

  it('STARTER_SOURCE parses to at least one frame', () => {
    const doc = WiremarkDocument.parse(STARTER_SOURCE);
    expect(doc.frames.length).toBeGreaterThan(0);
  });
});

describe('setSource coalescing window', () => {
  it('snapshots once for the first edit', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, setSourceAt('a', 1000));
    expect(state.source).toBe('a');
    expect(state.past).toEqual([STARTER_SOURCE]);
    expect(state.lastEditAt).toBe(1000);
  });

  it('coalesces edits within COALESCE_MS into a single undo entry', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, setSourceAt('a', 1000));
    // within the window -> no new snapshot
    state = reducer(state, setSourceAt('ab', 1000 + COALESCE_MS - 1));
    state = reducer(state, setSourceAt('abc', 1000 + COALESCE_MS - 1));
    expect(state.source).toBe('abc');
    expect(state.past).toEqual([STARTER_SOURCE]);
  });

  it('snapshots again once the window elapses (increasing meta.at)', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, setSourceAt('a', 1000));
    state = reducer(state, setSourceAt('ab', 1000 + COALESCE_MS));
    expect(state.source).toBe('ab');
    expect(state.past).toEqual([STARTER_SOURCE, 'a']);
  });

  it('clears the future stack on a coalesced-boundary edit', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, setSourceAt('a', 1000));
    state = reducer(state, undo());
    expect(state.future.length).toBe(1);
    state = reducer(state, setSourceAt('b', 5000));
    expect(state.future).toEqual([]);
  });
});

describe('applyEdit', () => {
  it('always snapshots and resets lastEditAt to 0', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, applyEdit('x'));
    expect(state.source).toBe('x');
    expect(state.past).toEqual([STARTER_SOURCE]);
    expect(state.lastEditAt).toBe(0);
  });

  it('snapshots on every call even back-to-back (no coalescing)', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, applyEdit('x'));
    state = reducer(state, applyEdit('y'));
    expect(state.past).toEqual([STARTER_SOURCE, 'x']);
    expect(state.source).toBe('y');
  });

  it('forces the next keystroke to snapshot (lastEditAt=0)', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, applyEdit('x'));
    // even a tiny at value is >= COALESCE_MS away from 0
    state = reducer(state, setSourceAt('xy', COALESCE_MS));
    expect(state.past).toEqual([STARTER_SOURCE, 'x']);
  });

  it('clears the future stack', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, setSourceAt('a', 1000));
    state = reducer(state, undo());
    expect(state.future.length).toBe(1);
    state = reducer(state, applyEdit('z'));
    expect(state.future).toEqual([]);
  });
});

describe('undo / redo', () => {
  it('moves strings between past and future', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, applyEdit('a'));
    state = reducer(state, applyEdit('b'));
    expect(state.source).toBe('b');

    state = reducer(state, undo());
    expect(state.source).toBe('a');
    expect(state.future).toEqual(['b']);

    state = reducer(state, undo());
    expect(state.source).toBe(STARTER_SOURCE);
    expect(state.future).toEqual(['a', 'b']);

    state = reducer(state, redo());
    expect(state.source).toBe('a');
    expect(state.future).toEqual(['b']);

    state = reducer(state, redo());
    expect(state.source).toBe('b');
    expect(state.future).toEqual([]);
  });

  it('undo is a no-op when past is empty', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    const before = state.source;
    state = reducer(state, undo());
    expect(state.source).toBe(before);
    expect(state.future).toEqual([]);
  });

  it('redo is a no-op when future is empty', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, applyEdit('a'));
    const before = state.source;
    state = reducer(state, redo());
    expect(state.source).toBe(before);
  });

  it('sets lastEditAt to 0 so the next keystroke snapshots', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, applyEdit('a'));
    state = reducer(state, undo());
    expect(state.lastEditAt).toBe(0);
    state = reducer(state, redo());
    expect(state.lastEditAt).toBe(0);
  });
});

describe('history cap', () => {
  it('never exceeds MAX_HISTORY snapshots', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    for (let i = 0; i < MAX_HISTORY + 50; i += 1) {
      state = reducer(state, applyEdit(`s${i}`));
    }
    expect(state.past.length).toBe(MAX_HISTORY);
    // oldest entries dropped: the very first snapshot (STARTER_SOURCE) is gone
    expect(state.past).not.toContain(STARTER_SOURCE);
    // the most recent prior source is retained at the top of the stack
    expect(state.past[state.past.length - 1]).toBe(`s${MAX_HISTORY + 50 - 2}`);
  });
});

describe('dirty tracking', () => {
  it('is clean initially', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(selectIsDirty(root(state))).toBe(false);
  });

  it('becomes dirty after an edit', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, setSourceAt('changed', 1000));
    expect(selectIsDirty(root(state))).toBe(true);
  });

  it('markSaved clears the dirty flag and sets hasHandle', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, setSourceAt('changed', 1000));
    state = reducer(state, markSaved({ fileName: 'foo.wiremark' }));
    expect(selectIsDirty(root(state))).toBe(false);
    expect(selectFileName(root(state))).toBe('foo.wiremark');
    expect(selectHasHandle(root(state))).toBe(true);
  });

  it('markSaved without fileName keeps the existing name', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = { ...state, fileName: 'kept.wiremark' };
    state = reducer(state, setSourceAt('changed', 1000));
    state = reducer(state, markSaved({}));
    expect(selectFileName(root(state))).toBe('kept.wiremark');
    expect(selectIsDirty(root(state))).toBe(false);
  });
});

describe('loadDocument / newDocument', () => {
  it('loadDocument sets source+savedSource, fileName and clears history', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, applyEdit('dirty'));
    state = reducer(state, loadDocument({ source: 'loaded', fileName: 'a.wiremark' }));
    expect(state.source).toBe('loaded');
    expect(state.savedSource).toBe('loaded');
    expect(state.fileName).toBe('a.wiremark');
    expect(state.past).toEqual([]);
    expect(state.future).toEqual([]);
    expect(state.lastEditAt).toBe(0);
    expect(selectIsDirty(root(state))).toBe(false);
  });

  it('loadDocument defaults fileName to null', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, loadDocument({ source: 'loaded' }));
    expect(state.fileName).toBeNull();
  });

  it('newDocument empties everything and clears history', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, applyEdit('dirty'));
    state = reducer(state, newDocument());
    expect(state.source).toBe('');
    expect(state.savedSource).toBe('');
    expect(state.fileName).toBeNull();
    expect(state.hasHandle).toBe(false);
    expect(state.past).toEqual([]);
    expect(state.future).toEqual([]);
    expect(selectIsDirty(root(state))).toBe(false);
  });
});

describe('canUndo / canRedo selectors', () => {
  it('reflect stack sizes', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    expect(selectCanUndo(root(state))).toBe(false);
    expect(selectCanRedo(root(state))).toBe(false);

    state = reducer(state, applyEdit('a'));
    expect(selectCanUndo(root(state))).toBe(true);
    expect(selectCanRedo(root(state))).toBe(false);

    state = reducer(state, undo());
    expect(selectCanRedo(root(state))).toBe(true);
  });
});

describe('selectSource', () => {
  it('returns the canonical source', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(selectSource(root(state))).toBe(STARTER_SOURCE);
  });
});

describe('selectDocument memoization', () => {
  it('returns a WiremarkDocument', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    const doc = selectDocument(root(state));
    expect(doc).toBeInstanceOf(WiremarkDocument);
  });

  it('returns the same instance for an unchanged source (memoized)', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    const a = selectDocument(root(state));
    const b = selectDocument(root(state));
    expect(a).toBe(b);
  });

  it('recomputes when the source changes', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    const a = selectDocument(root(state));
    state = reducer(state, applyEdit('Wireframe #x mobile\n  Button "Go"\n'));
    const b = selectDocument(root(state));
    expect(b).not.toBe(a);
    expect(b).toBeInstanceOf(WiremarkDocument);
  });

  it('assigns stable path ids that survive a reparse of the same source', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    const doc = selectDocument(root(state));
    const firstFrame = doc.frames.at(0);
    expect(firstFrame).toBeDefined();
    expect(firstFrame.id).toBe('0');
    // a fresh parse of the identical source assigns identical ids
    const reparsed = WiremarkDocument.parse(state.source);
    expect(reparsed.frames.at(0).id).toBe(firstFrame.id);
    const child = firstFrame.children.at(0);
    if (child) {
      expect(child.id).toBe('0.0');
      expect(reparsed.frames.at(0).children.at(0).id).toBe(child.id);
    }
  });

  it('selectFrames and selectParseDiagnostics derive from the same parse', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    const doc = selectDocument(root(state));
    expect(selectFrames(root(state))).toBe(doc.frames);
    expect(selectParseDiagnostics(root(state))).toBe(doc.diagnostics);
  });
});
