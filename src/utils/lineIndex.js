// @ts-check
/**
 * lineIndex -- build the bidirectional map between a WiremarkDocument's element
 * path ids and their 1-based source line numbers, used to keep the text editor
 * cursor and the structural selection (OutlineTree / ElementInspector) in sync.
 *
 * Pure: walks the derived document tree (whose nodes carry `id` + `line`). Each
 * source content line holds at most one element, so `lineToId` is unambiguous.
 *
 * Document-property directives (`Font`, `Flow`) all map to the single Document
 * row (`DOCUMENT_ID`); its `idToLine` entry is the first such line. Other
 * directives (the `Icons` block) map to nothing.
 */

import { DOCUMENT_ID, isDocumentDirective } from './directives.js';

/**
 * @typedef {{ id: string|null, line: number|null, children: Iterable<any> }} NodeLike
 * @typedef {{ component: string, line: number|null }} DirectiveLike
 * @typedef {{ frames: Iterable<NodeLike>, directives?: Iterable<DirectiveLike> }} DocLike
 */

/**
 * @param {DocLike} doc
 * @returns {{ idToLine: Record<string, number>, lineToId: Record<number, string> }}
 */
export function buildLineIndex(doc) {
  /** @type {Record<string, number>} */
  const idToLine = {};
  /** @type {Record<number, string>} */
  const lineToId = {};
  if (!doc || !doc.frames) return { idToLine, lineToId };

  /** @param {NodeLike} node */
  const walk = (node) => {
    if (node && typeof node.id === 'string' && typeof node.line === 'number') {
      idToLine[node.id] = node.line;
      lineToId[node.line] = node.id;
    }
    if (node && node.children) {
      for (const child of node.children) walk(child);
    }
  };

  for (const frame of doc.frames) walk(frame);

  for (const directive of doc.directives ?? []) {
    if (!directive || !isDocumentDirective(directive.component)) continue;
    if (typeof directive.line !== 'number') continue;
    lineToId[directive.line] = DOCUMENT_ID;
    if (!(DOCUMENT_ID in idToLine) || directive.line < idToLine[DOCUMENT_ID]) {
      idToLine[DOCUMENT_ID] = directive.line;
    }
  }
  return { idToLine, lineToId };
}

export default { buildLineIndex };
