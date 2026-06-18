// @ts-check
/**
 * lineIndex -- build the bidirectional map between a WiremarkDocument's element
 * path ids and their 1-based source line numbers, used to keep the text editor
 * cursor and the structural selection (OutlineTree / ElementInspector) in sync.
 *
 * Pure: walks the derived document tree (whose nodes carry `id` + `line`). Each
 * source content line holds at most one element, so `lineToId` is unambiguous.
 */

/**
 * @typedef {{ id: string|null, line: number|null, children: Iterable<any> }} NodeLike
 * @typedef {{ frames: Iterable<NodeLike> }} DocLike
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
  return { idToLine, lineToId };
}

export default { buildLineIndex };
