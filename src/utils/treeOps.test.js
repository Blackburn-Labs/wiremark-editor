// @ts-check
import { describe, it, expect } from 'vitest';
import WiremarkDocument from '../domain/WiremarkDocument.js';
import {
  canMoveUp, moveUp,
  canMoveDown, moveDown,
  canAscend, ascend,
  canDescend, descend,
  updateElementTokens, setElementComment,
  removeElement, addChild,
} from './treeOps.js';

/** Convenience: a frame with three buttons under a Stack. */
const STD = 'Wireframe\n  Stack\n    Button "A"\n    Button "B"\n    Button "C"\n';

/** Label getter for a button by id. @param {WiremarkDocument} doc @param {string} id */
function label(doc, id) {
  return doc.findById(id)?.tokens.find((t) => t.quoted)?.value;
}

describe('moveUp', () => {
  const doc = WiremarkDocument.parse(STD);

  it('canMoveUp false for the first child', () => {
    expect(canMoveUp(doc, '0.0.0')).toBe(false);
  });

  it('canMoveUp true for a non-first child', () => {
    expect(canMoveUp(doc, '0.0.1')).toBe(true);
  });

  it('moves a node before its previous sibling and re-points selectedId', () => {
    const { doc: next, selectedId } = moveUp(doc, '0.0.1'); // move B up
    expect(selectedId).toBe('0.0.0');
    expect(label(next, '0.0.0')).toBe('B');
    expect(label(next, '0.0.1')).toBe('A');
    expect(label(next, '0.0.2')).toBe('C');
  });

  it('is a no-op (same doc) when disabled', () => {
    const res = moveUp(doc, '0.0.0');
    expect(res.doc).toBe(doc);
    expect(res.selectedId).toBe('0.0.0');
  });
});

describe('moveDown', () => {
  const doc = WiremarkDocument.parse(STD);

  it('canMoveDown false for the last child', () => {
    expect(canMoveDown(doc, '0.0.2')).toBe(false);
  });

  it('canMoveDown true for a non-last child', () => {
    expect(canMoveDown(doc, '0.0.1')).toBe(true);
  });

  it('moves a node after its next sibling and re-points selectedId', () => {
    const { doc: next, selectedId } = moveDown(doc, '0.0.1'); // move B down
    expect(selectedId).toBe('0.0.2');
    expect(label(next, '0.0.1')).toBe('C');
    expect(label(next, '0.0.2')).toBe('B');
  });

  it('is a no-op when disabled', () => {
    expect(moveDown(doc, '0.0.2').doc).toBe(doc);
  });
});

describe('ascend', () => {
  // Box(container) holds a Stack holding a Button. The Button (depth 3) can ascend.
  const doc = WiremarkDocument.parse('Wireframe\n  Box\n    Stack\n      Button "X"\n');

  it('canAscend false for a frame (depth 0)', () => {
    expect(canAscend(doc, '0')).toBe(false);
  });

  it('canAscend false for a direct child of a frame (parent is frame root)', () => {
    expect(canAscend(doc, '0.0')).toBe(false);
  });

  it('canAscend true for a deeper node', () => {
    expect(canAscend(doc, '0.0.0.0')).toBe(true);
  });

  it('moves the node before its parent at the grandparent level', () => {
    const { doc: next, selectedId } = ascend(doc, '0.0.0.0'); // Button ascends out of Stack
    // Button is inserted before Stack inside Box: Box children = [Button, Stack].
    expect(selectedId).toBe('0.0.0');
    expect(next.findById('0.0.0')?.component).toBe('Button');
    expect(next.findById('0.0.1')?.component).toBe('Stack');
  });

  it('is a no-op when disabled', () => {
    expect(ascend(doc, '0.0').doc).toBe(doc);
  });
});

describe('descend', () => {
  it('canDescend false when there is no next sibling', () => {
    const doc = WiremarkDocument.parse('Wireframe\n  Button "A"\n  Button "B"\n');
    // last child B has no next sibling
    expect(canDescend(doc, '0.1')).toBe(false);
  });

  it('canDescend false when the next sibling does not allow children', () => {
    // A's next sibling is Button (a leaf) -> cannot descend.
    const doc = WiremarkDocument.parse('Wireframe\n  Button "A"\n  Button "B"\n');
    expect(canDescend(doc, '0.0')).toBe(false);
  });

  it('canDescend true when the next sibling is a container', () => {
    // A's next sibling is Stack (a container).
    const doc = WiremarkDocument.parse('Wireframe\n  Button "A"\n  Stack\n');
    expect(canDescend(doc, '0.0')).toBe(true);
  });

  it('makes the node the first child of the next sibling', () => {
    const doc = WiremarkDocument.parse('Wireframe\n  Button "A"\n  Stack\n    Button "Z"\n');
    const { doc: next, selectedId } = descend(doc, '0.0'); // A descends into Stack
    expect(selectedId).toBe('0.0.0');
    // Stack now sits at 0.0 (A removed); its first child is A.
    expect(next.findById('0.0')?.component).toBe('Stack');
    expect(next.findById('0.0.0')?.tokens.find((t) => t.quoted)?.value).toBe('A');
    expect(next.findById('0.0.1')?.tokens.find((t) => t.quoted)?.value).toBe('Z');
  });

  it('is a no-op when disabled', () => {
    const doc = WiremarkDocument.parse('Wireframe\n  Button "A"\n  Button "B"\n');
    expect(descend(doc, '0.0').doc).toBe(doc);
  });
});

describe('updateElementTokens / setElementComment', () => {
  const doc = WiremarkDocument.parse(STD);

  it('replaces tokens and keeps the same id', () => {
    const { doc: next, selectedId } = updateElementTokens(doc, '0.0.0', [
      { kind: 'keyless', value: 'Renamed', quoted: true },
      { kind: 'keyless', value: 'contained', quoted: false },
    ]);
    expect(selectedId).toBe('0.0.0');
    expect(label(next, '0.0.0')).toBe('Renamed');
    expect(next.findById('0.0.0')?.tokens[1].value).toBe('contained');
  });

  it('sets a comment', () => {
    const { doc: next } = setElementComment(doc, '0.0.0', 'note here');
    expect(next.findById('0.0.0')?.comment).toBe('note here');
  });
});

describe('removeElement', () => {
  it('removes a child and selects the parent', () => {
    const doc = WiremarkDocument.parse(STD);
    const { doc: next, selectedId } = removeElement(doc, '0.0.1'); // remove B
    expect(selectedId).toBe('0.0'); // the Stack parent
    expect(label(next, '0.0.0')).toBe('A');
    expect(label(next, '0.0.1')).toBe('C');
    expect(next.findById('0.0.2')).toBeUndefined();
  });

  it('removes a frame and selects null', () => {
    const doc = WiremarkDocument.parse('Wireframe #a\nWireframe #b\n');
    const { doc: next, selectedId } = removeElement(doc, '0');
    expect(selectedId).toBe(null);
    expect(next.frames).toHaveLength(1);
    expect(next.frames[0].wmId()).toBe('b');
  });
});

describe('addChild', () => {
  it('appends a child and selects its new path id', () => {
    const doc = WiremarkDocument.parse('Wireframe\n  Stack\n    Button "A"\n');
    const { doc: next, selectedId } = addChild(doc, '0.0', {
      component: 'Button',
      tokens: [{ kind: 'keyless', value: 'New', quoted: true }],
    });
    expect(selectedId).toBe('0.0.1');
    expect(label(next, '0.0.1')).toBe('New');
  });

  it('is a no-op for an unknown parent', () => {
    const doc = WiremarkDocument.parse(STD);
    const res = addChild(doc, '9.9', { component: 'Button' });
    expect(res.doc).toBe(doc);
  });

  it('is a no-op for a blank component (would dangle as trivia)', () => {
    const doc = WiremarkDocument.parse(STD);
    const res = addChild(doc, '0.0', { component: '' });
    expect(res.doc).toBe(doc);
    expect(res.selectedId).toBe('0.0');
  });
});

describe('treeOps - stale/nonexistent selection (regression)', () => {
  // Reproduces the blocker: predicates that only did path arithmetic let the
  // mutator dereference a missing node and throw. They must be no-ops instead.
  it('canMoveUp/canAscend return false for an id that does not resolve', () => {
    const doc = WiremarkDocument.parse('Wireframe #a\n  Box\n');
    expect(canMoveUp(doc, '5.5.5')).toBe(false);
    expect(canAscend(doc, '5.5.5')).toBe(false);
  });

  it('moveUp/ascend are no-ops (do not throw) on a stale id', () => {
    const doc = WiremarkDocument.parse('Wireframe #a\n  Box\n');
    expect(() => moveUp(doc, '5.5.5')).not.toThrow();
    expect(() => ascend(doc, '5.5.5')).not.toThrow();
    expect(moveUp(doc, '5.5.5').doc).toBe(doc);
    expect(ascend(doc, '5.5.5').doc).toBe(doc);
  });
});
