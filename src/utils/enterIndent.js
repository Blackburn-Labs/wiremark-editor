// @ts-check
/**
 * enterIndent -- the PURE child-vs-sibling indentation decision for the editor's
 * Enter key. Given the text of the line the caret is on (and whether the caret
 * is at the end of that line), it returns the leading whitespace a freshly
 * inserted line should carry:
 *
 *   - caret at end of a CONTAINER element's line -> one level deeper (a child)
 *   - otherwise                                   -> the same indent (a sibling)
 *
 * Container-ness is read through `flagsFor` (the registry adapter's null-safe
 * container check -- the same predicate `treeOps.canDescend` uses), so a
 * half-typed or unknown component name is simply treated as a non-container.
 * No DOM / CodeMirror here; the editor command (`features/editor/smartNewline`)
 * is the only caller.
 */

import { measureIndent, componentOnLine, INDENT_WIDTH } from './wmParser.js';
import { flagsFor } from './registryAdapter.js';

/**
 * The indentation (a run of spaces) for a NEW line inserted after `lineText`.
 * @param {string} lineText the full text of the caret's current line
 * @param {boolean} atEnd whether the caret sits at the end of that line
 * @returns {string}
 */
export function enterIndent(lineText, atEnd) {
  const { indentCols } = measureIndent(lineText);
  let cols = indentCols;
  if (atEnd) {
    const name = componentOnLine(lineText);
    if (name && flagsFor(name).container) {
      cols += INDENT_WIDTH;
    }
  }
  return ' '.repeat(cols);
}

export default enterIndent;
