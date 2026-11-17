// @ts-check
import { getComponent } from '@wiremark/core';
import WiremarkDocument from '../domain/WiremarkDocument.js';
import { parsePathId, pathId } from './pathId.js';
import { serialize } from './wmSerializer.js';
import { DOCUMENT_ID, isDocumentDirective } from './directives.js';
import {
  cleanFamily,
  flowTokens,
  fontTokens,
  isValidFamily,
} from './documentProps.js';

/**
 * treeOps -- the single owner of ALL structural edits.
 *
 * Pure functions. Every mutator takes a WiremarkDocument and returns a NEW one
 * (rebuilt + reparsed so path ids are recomputed) plus the affected node's new
 * path id, so the caller can keep selection pinned across a move:
 *   { doc: WiremarkDocument, selectedId: string|null }
 * Predicates return booleans.
 *
 * Implementation strategy: convert the doc to its plain payload tree, splice the
 * arrays directly (paths are just index lists), serialize, and reparse so the
 * resulting domain tree carries freshly-assigned path ids. We track the moved
 * node by computing its NEW path explicitly.
 *
 * @typedef {import('./wmParser.js').ElementPayload} ElementPayload
 * @typedef {import('./wmParser.js').DirectivePayload} DirectivePayload
 * @typedef {{ frames: ElementPayload[], directives: DirectivePayload[], trailingTrivia: string[] }} Tree
 * @typedef {import('./wmParser.js').Token} Token
 * @typedef {{ doc: WiremarkDocument, selectedId: string|null }} EditResult
 */

// --------------------------------------------------------------------------
// Internal payload helpers (operate on the parser/serializer payload shape).
// --------------------------------------------------------------------------

/**
 * Snapshot a document as its mutable plain payload (frames array, directives,
 * trailing trivia). Directives ride along untouched by element edits; they keep
 * their `before` position so the rebuilt source still has them in place.
 * @param {WiremarkDocument} doc
 * @returns {Tree}
 */
function snapshot(doc) {
  const json = doc.toJSON();
  return {
    frames: /** @type {ElementPayload[]} */ (json.frames),
    directives: /** @type {DirectivePayload[]} */ (/** @type {unknown} */ (json.directives)),
    trailingTrivia: /** @type {string[]} */ (json.trailingTrivia),
  };
}

/**
 * Rebuild a document from a mutated payload tree (reparse to recompute ids).
 * Serialize-then-parse is the canonical round-trip that recomputes path ids and
 * guarantees the result matches what the next reparse of the source produces, so
 * selection stays pinned.
 * @param {Tree} tree
 * @returns {WiremarkDocument}
 */
function rebuild(tree) {
  return WiremarkDocument.parse(serialize(tree));
}

/**
 * Get the array that holds the node at `path`, plus the index within it.
 * @param {{ frames: ElementPayload[] }} tree
 * @param {number[]} path
 * @returns {{ siblings: ElementPayload[], index: number, parentPath: number[] }|null}
 */
function locate(tree, path) {
  if (path.length === 0) return null;
  let siblings = tree.frames;
  for (let i = 0; i < path.length - 1; i += 1) {
    const node = siblings[path[i]];
    if (!node) return null;
    siblings = node.children;
  }
  const index = path[path.length - 1];
  if (index < 0 || index >= siblings.length) return null;
  return { siblings, index, parentPath: path.slice(0, -1) };
}

/**
 * Resolve the node payload at `path`.
 * @param {{ frames: ElementPayload[] }} tree
 * @param {number[]} path
 * @returns {ElementPayload|null}
 */
function nodeAt(tree, path) {
  const loc = locate(tree, path);
  return loc ? loc.siblings[loc.index] : null;
}

/**
 * Whether the component name allows children, per the live registry.
 * @param {string} component
 * @returns {boolean}
 */
function componentAllowsChildren(component) {
  if (!component) return false;
  try {
    return !!getComponent(component)?.container;
  } catch {
    return false;
  }
}

// --------------------------------------------------------------------------
// Predicates
// --------------------------------------------------------------------------

/**
 * @param {WiremarkDocument} doc
 * @param {string} id
 * @returns {boolean}
 */
export function canMoveUp(doc, id) {
  const path = parsePathId(id);
  if (path.length === 0 || path[path.length - 1] <= 0) return false;
  // Validate the node actually exists, so a stale/deleted selection is a no-op
  // (matches canMoveDown/canDescend) rather than throwing in moveUp().
  return locate(snapshot(doc), path) !== null;
}

/**
 * @param {WiremarkDocument} doc
 * @param {string} id
 * @returns {boolean}
 */
export function canMoveDown(doc, id) {
  const tree = snapshot(doc);
  const loc = locate(tree, parsePathId(id));
  if (!loc) return false;
  return loc.index < loc.siblings.length - 1;
}

/**
 * False if the parent is a frame root (node already at the top wireframe level)
 * or the node is itself a frame.
 * @param {WiremarkDocument} doc
 * @param {string} id
 * @returns {boolean}
 */
export function canAscend(doc, id) {
  const path = parsePathId(id);
  // A frame (depth 0) or a direct child of a frame (depth 1) cannot ascend:
  // depth 1's parent IS a frame root.
  if (path.length <= 2) return false;
  // Validate existence so a stale selection is a no-op, not a throw in ascend().
  return locate(snapshot(doc), path) !== null;
}

/**
 * False if no next sibling OR the next sibling does not allow children.
 * @param {WiremarkDocument} doc
 * @param {string} id
 * @returns {boolean}
 */
export function canDescend(doc, id) {
  const tree = snapshot(doc);
  const loc = locate(tree, parsePathId(id));
  if (!loc) return false;
  const nextSibling = loc.siblings[loc.index + 1];
  if (!nextSibling) return false;
  return componentAllowsChildren(nextSibling.component);
}

// --------------------------------------------------------------------------
// Mutators
// --------------------------------------------------------------------------

/**
 * Move a node before its previous sibling.
 * @param {WiremarkDocument} doc
 * @param {string} id
 * @returns {EditResult}
 */
export function moveUp(doc, id) {
  if (!canMoveUp(doc, id)) return unchanged(doc, id);
  const tree = snapshot(doc);
  const path = parsePathId(id);
  const loc = /** @type {NonNullable<ReturnType<typeof locate>>} */ (locate(tree, path));
  const [moved] = loc.siblings.splice(loc.index, 1);
  loc.siblings.splice(loc.index - 1, 0, moved);
  const newPath = [...loc.parentPath, loc.index - 1];
  return { doc: rebuild(tree), selectedId: pathId(newPath) };
}

/**
 * Move a node after its next sibling.
 * @param {WiremarkDocument} doc
 * @param {string} id
 * @returns {EditResult}
 */
export function moveDown(doc, id) {
  if (!canMoveDown(doc, id)) return unchanged(doc, id);
  const tree = snapshot(doc);
  const path = parsePathId(id);
  const loc = /** @type {NonNullable<ReturnType<typeof locate>>} */ (locate(tree, path));
  const [moved] = loc.siblings.splice(loc.index, 1);
  loc.siblings.splice(loc.index + 1, 0, moved);
  const newPath = [...loc.parentPath, loc.index + 1];
  return { doc: rebuild(tree), selectedId: pathId(newPath) };
}

/**
 * Move a node to its parent's level, immediately before the parent.
 * @param {WiremarkDocument} doc
 * @param {string} id
 * @returns {EditResult}
 */
export function ascend(doc, id) {
  if (!canAscend(doc, id)) return unchanged(doc, id);
  const tree = snapshot(doc);
  const path = parsePathId(id);
  const loc = /** @type {NonNullable<ReturnType<typeof locate>>} */ (locate(tree, path));
  const [moved] = loc.siblings.splice(loc.index, 1);

  // The parent's location: parentPath identifies the parent node.
  const parentPath = loc.parentPath;
  const grandLoc = /** @type {NonNullable<ReturnType<typeof locate>>} */ (locate(tree, parentPath));
  const parentIndex = grandLoc.index;
  // Insert before the parent in the grandparent's child array.
  grandLoc.siblings.splice(parentIndex, 0, moved);
  const newPath = [...grandLoc.parentPath, parentIndex];
  return { doc: rebuild(tree), selectedId: pathId(newPath) };
}

/**
 * Make a node the FIRST child of its next sibling.
 * @param {WiremarkDocument} doc
 * @param {string} id
 * @returns {EditResult}
 */
export function descend(doc, id) {
  if (!canDescend(doc, id)) return unchanged(doc, id);
  const tree = snapshot(doc);
  const path = parsePathId(id);
  const loc = /** @type {NonNullable<ReturnType<typeof locate>>} */ (locate(tree, path));
  const [moved] = loc.siblings.splice(loc.index, 1);
  // After removal the next sibling now sits at the same index.
  const nextSibling = loc.siblings[loc.index];
  nextSibling.children = [moved, ...(nextSibling.children || [])];
  const newPath = [...loc.parentPath, loc.index, 0];
  return { doc: rebuild(tree), selectedId: pathId(newPath) };
}

/**
 * Replace an element's tokens (path unchanged).
 * @param {WiremarkDocument} doc
 * @param {string} id
 * @param {Token[]} tokens
 * @returns {EditResult}
 */
export function updateElementTokens(doc, id, tokens) {
  const tree = snapshot(doc);
  const node = nodeAt(tree, parsePathId(id));
  if (!node) return unchanged(doc, id);
  node.tokens = tokens.map((t) => ({ ...t }));
  return { doc: rebuild(tree), selectedId: id };
}

/**
 * Set (or clear, with null) an element's trailing comment.
 * @param {WiremarkDocument} doc
 * @param {string} id
 * @param {string|null} comment
 * @returns {EditResult}
 */
export function setElementComment(doc, id, comment) {
  const tree = snapshot(doc);
  const node = nodeAt(tree, parsePathId(id));
  if (!node) return unchanged(doc, id);
  node.comment = comment;
  return { doc: rebuild(tree), selectedId: id };
}

/**
 * Remove an element. New selection is the parent's id, or null if a frame was
 * removed (no parent element).
 * @param {WiremarkDocument} doc
 * @param {string} id
 * @returns {EditResult}
 */
export function removeElement(doc, id) {
  const tree = snapshot(doc);
  const path = parsePathId(id);
  const loc = locate(tree, path);
  if (!loc) return unchanged(doc, id);
  loc.siblings.splice(loc.index, 1);
  if (loc.parentPath.length === 0) {
    // A frame went away: directives that sat after it keep their place.
    for (const d of tree.directives) if (d.before > loc.index) d.before -= 1;
  }
  const parentId = loc.parentPath.length > 0 ? pathId(loc.parentPath) : null;
  return { doc: rebuild(tree), selectedId: parentId };
}

/**
 * Append a new child to a parent element. Returns the new child's path id.
 * @param {WiremarkDocument} doc
 * @param {string} parentId
 * @param {{ component: string, tokens?: Token[], comment?: string|null }} partial
 * @returns {EditResult}
 */
export function addChild(doc, parentId, partial) {
  // A concrete component is required: a blank-component child serializes to a
  // blank line that the parser absorbs as trivia, leaving selectedId dangling.
  if (!partial || !partial.component) return unchanged(doc, parentId);
  const tree = snapshot(doc);
  const parentPath = parsePathId(parentId);
  const parent = nodeAt(tree, parentPath);
  if (!parent) return unchanged(doc, parentId);
  /** @type {ElementPayload} */
  const child = {
    component: partial.component ?? '',
    tokens: (partial.tokens ?? []).map((t) => ({ ...t })),
    comment: partial.comment ?? null,
    leadingTrivia: [],
    children: [],
  };
  parent.children = [...(parent.children || []), child];
  const newPath = [...parentPath, parent.children.length - 1];
  return { doc: rebuild(tree), selectedId: pathId(newPath) };
}

/**
 * @param {WiremarkDocument} doc
 * @param {string|null} selectedId
 * @returns {EditResult}
 */
function unchanged(doc, selectedId) {
  return { doc, selectedId };
}

// --------------------------------------------------------------------------
// Document properties (the top-level `Font` / `Flow` lines)
// --------------------------------------------------------------------------

/**
 * @typedef {import('./documentProps.js').FontSetting} FontSetting
 * @typedef {import('./documentProps.js').FlowDirection} FlowDirection
 * @typedef {import('./documentProps.js').DocumentProps} DocumentProps
 */

/**
 * Write (or, with `tokens === null`, remove) the directive `name` in a payload
 * tree. Replaces the FIRST existing line's tokens in place (keeping its comment
 * and position) and drops any duplicates; otherwise inserts a new line at the
 * top of the file -- after an existing top `Font` line when adding `Flow`, so the
 * two read Font-then-Flow. A blank line separates new top directives from the
 * first frame, and is removed again when the last top directive goes.
 * @param {Tree} tree
 * @param {string} name
 * @param {Token[]|null} tokens
 */
function writeDirective(tree, name, tokens) {
  const first = tree.directives.findIndex((d) => d.component === name);
  const hadTop = tree.directives.some((d) => !(d.before > 0));
  if (tokens === null) {
    tree.directives = tree.directives.filter((d) => d.component !== name);
  } else if (first !== -1) {
    tree.directives[first].tokens = tokens.map((t) => ({ ...t }));
    tree.directives = tree.directives.filter((d, i) => i === first || d.component !== name);
  } else {
    /** @type {DirectivePayload} */
    const directive = {
      component: name, tokens: tokens.map((t) => ({ ...t })), comment: null,
      leadingTrivia: [], children: [], line: 0, before: 0,
    };
    const afterFont = name === 'Font'
      ? -1
      : tree.directives.findIndex((d) => d.component === 'Font' && !(d.before > 0));
    tree.directives.splice(afterFont + 1, 0, directive);
  }
  const hasTop = tree.directives.some((d) => !(d.before > 0));
  const firstFrame = tree.frames[0];
  if (!firstFrame) return;
  const trivia = firstFrame.leadingTrivia || [];
  if (!hadTop && hasTop && trivia[0] !== '') {
    firstFrame.leadingTrivia = ['', ...trivia];
  } else if (hadTop && !hasTop && trivia[0] === '') {
    firstFrame.leadingTrivia = trivia.slice(1);
  }
}

/**
 * The selection after a Document-properties edit: the Document row while the
 * file still has a Font/Flow line, else nothing.
 * @param {WiremarkDocument} doc
 * @returns {string|null}
 */
function documentSelection(doc) {
  return doc.directives.some((d) => isDocumentDirective(d.component)) ? DOCUMENT_ID : null;
}

/**
 * Set the document font (`Font "Family" [width=] [leading=]`), or remove the
 * line with `null` (back to the built-in Comic Neue). An invalid family name
 * (one core would reject) leaves the document unchanged.
 * @param {WiremarkDocument} doc
 * @param {FontSetting|null} font
 * @returns {EditResult}
 */
export function setDocumentFont(doc, font) {
  return setDocumentProps(doc, { font });
}

/**
 * Set the flow direction. `TD` is core's default, so it removes the `Flow` line.
 * @param {WiremarkDocument} doc
 * @param {FlowDirection} flow
 * @returns {EditResult}
 */
export function setDocumentFlow(doc, flow) {
  return setDocumentProps(doc, { flow });
}

/**
 * Apply Document properties in ONE rebuild (one undo step for a dialog Save).
 * Only the keys present are touched. Selection lands on the Document row while
 * the file has a Font/Flow line afterwards, else null.
 * @param {WiremarkDocument} doc
 * @param {Partial<DocumentProps>} props
 * @returns {EditResult}
 */
export function setDocumentProps(doc, props) {
  const tree = snapshot(doc);
  if (props && 'font' in props) {
    const font = props.font;
    if (font) {
      const family = cleanFamily(font.family);
      if (!isValidFamily(family)) return unchanged(doc, documentSelection(doc));
      writeDirective(tree, 'Font', fontTokens({ ...font, family }));
    } else {
      writeDirective(tree, 'Font', null);
    }
  }
  if (props && 'flow' in props) {
    writeDirective(tree, 'Flow', props.flow === 'LR' ? flowTokens('LR') : null);
  }
  const next = rebuild(tree);
  return { doc: next, selectedId: documentSelection(next) };
}
