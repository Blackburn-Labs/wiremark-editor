// @ts-check
/**
 * smartNewline -- the editor's custom Enter command.
 *
 * On Enter we insert a newline whose indentation is structure-aware: pressing
 * Enter at the END of a container element's line creates a CHILD (one level
 * deeper); anywhere else it keeps the current indent (a SIBLING, or a plain
 * mid-line split). The child-vs-sibling decision lives in the pure, unit-tested
 * `utils/enterIndent`; this module is only the thin CodeMirror glue.
 *
 * It also fixes a caret bug: by inserting through `replaceSelection` the caret
 * lands ON the new line. (The other half of that fix -- not re-deriving the
 * element selection from the caret during an edit -- lives in WiremarkEditor's
 * `handleUpdate`.)
 */

import { completionStatus } from '@codemirror/autocomplete';
import { enterIndent } from '../../utils/enterIndent.js';

/**
 * CodeMirror Enter command. Returns `false` (deferring to the next binding) when
 * an autocomplete popup is active, so Enter still accepts a completion.
 * @param {import('@codemirror/view').EditorView} view
 * @returns {boolean}
 */
export function insertSmartNewline(view) {
  // Let Enter accept an open autocomplete instead of inserting a line.
  if (completionStatus(view.state) === 'active') return false;

  const { state } = view;
  const range = state.selection.main;
  const line = state.doc.lineAt(range.head);
  const atEnd = range.empty && range.head === line.to;
  const insert = state.lineBreak + enterIndent(line.text, atEnd);

  view.dispatch(
    state.update(state.replaceSelection(insert), {
      scrollIntoView: true,
      userEvent: 'input',
    }),
  );
  return true;
}

export default insertSmartNewline;
