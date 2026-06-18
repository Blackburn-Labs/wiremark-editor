// @ts-check
/**
 * pathId -- deterministic node identity derived from structural position.
 *
 * A node's identity is its path from the document root: the frame index
 * followed by the child index at each level. `[0, 2, 1]` is the 2nd child of
 * the 3rd child of the 1st frame. We render that path as a dotted string so it
 * can serve as a stable React key and Redux selection id. There is no random id
 * generator -- identity IS structural position.
 */

/**
 * @param {number[]} path ordered child indices from the root
 * @returns {string} dotted path id, e.g. `[0,2,1] -> "0.2.1"`
 */
export function pathId(path) {
  if (!Array.isArray(path)) {
    throw new TypeError('pathId expects an array of numbers');
  }
  return path.join('.');
}

/**
 * Inverse of {@link pathId}. An empty string yields an empty array.
 * @param {string} id dotted path id
 * @returns {number[]} the ordered child indices
 */
export function parsePathId(id) {
  if (typeof id !== 'string') {
    throw new TypeError('parsePathId expects a string');
  }
  if (id === '') return [];
  return id.split('.').map((part) => {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0) {
      throw new TypeError(`parsePathId: invalid path segment "${part}" in "${id}"`);
    }
    return n;
  });
}
