// @ts-check
/**
 * Store thunks.
 *
 * Structural edits are applied as TWO dispatches: push the new serialized source
 * onto history via `document/applyEdit`, then pin selection to the affected
 * node's (possibly new) path id via `ui/selectElement`. This thin thunk bundles
 * the pair so callers (treeOps wiring, the property form) do it consistently.
 */
import { applyEdit } from './documentSlice.js';
import { selectElement } from './uiSlice.js';

/**
 * Apply a structural edit and pin selection.
 * @param {{ source: string, selectId?: string|null }} args
 *   `source` is the re-serialized document text; `selectId` is the affected
 *   node's new path id (from a treeOps mutator's `selectedId`), or null/omitted
 *   to leave selection unchanged-by-this-thunk (still re-dispatched as given).
 * @returns {(dispatch: import('@reduxjs/toolkit').Dispatch) => void}
 */
export function applyStructuralEdit({ source, selectId = null }) {
  return (dispatch) => {
    dispatch(applyEdit(source));
    dispatch(selectElement(selectId));
  };
}
