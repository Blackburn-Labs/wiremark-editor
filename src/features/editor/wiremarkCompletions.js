// @ts-check
/**
 * wiremarkCompletions.js -- the `@codemirror/autocomplete` completion source for
 * the wiremark editor.
 *
 * All the context analysis is delegated to the PURE, unit-tested
 * `analyzeCompletion` (src/utils/completionContext.js). This module only adapts
 * the CodeMirror `CompletionContext` (cursor position + document) to that pure
 * function's inputs, then maps its `{ options, token }` result back into a
 * CodeMirror `CompletionResult` (`{ from, options }`).
 */

import { analyzeCompletion } from '../../utils/completionContext.js';

/**
 * The completion source. CodeMirror calls this with a `CompletionContext`; we
 * compute the current line + column + full doc text, run the pure analyzer, and
 * return a `CompletionResult` (or null when there is nothing to suggest).
 *
 * @param {import('@codemirror/autocomplete').CompletionContext} context
 * @returns {import('@codemirror/autocomplete').CompletionResult | null}
 */
export function wiremarkCompletionSource(context) {
  const { state, pos } = context;
  const line = state.doc.lineAt(pos);
  const columnInLine = pos - line.from;
  const docText = state.doc.toString();

  const result = analyzeCompletion({
    lineText: line.text,
    columnInLine,
    docText,
  });

  if (result.kind === 'none' || result.options.length === 0) {
    return null;
  }

  // The replacement range starts where the current partial token began. The
  // analyzer's `token` is exactly that partial text immediately left of the
  // cursor, so `from` = pos - token.length.
  const from = pos - result.token.length;

  return {
    from,
    options: result.options.map((label) => ({
      label,
      type: completionTypeFor(result.kind),
    })),
  };
}

/**
 * Map a completion kind to a CodeMirror completion `type` (drives the little
 * icon shown in the autocomplete popup).
 * @param {string} kind
 * @returns {string}
 */
function completionTypeFor(kind) {
  switch (kind) {
    case 'component':
      return 'class';
    case 'keyless':
      return 'enum';
    case 'propValue':
      return 'enum';
    case 'idref':
      return 'constant';
    default:
      return 'text';
  }
}

export default wiremarkCompletionSource;
