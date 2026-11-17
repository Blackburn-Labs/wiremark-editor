// @ts-check
/**
 * directives -- the document-level lines of wiremark that are NOT frames.
 *
 * Core intercepts a few top-level keywords before it looks for frames
 * (`resolve.js`): `Flow LR|TD`, `Font "Family" [width=N] [leading=N]`, and the
 * `Icons` block (lowercase `name "path data"` rows indented under it). They are
 * never components, never frames, and never part of the Outline's element tree.
 *
 * Our fault-tolerant parser keeps them in their own list (with their position
 * relative to the frames, so the serializer round-trips the file unchanged), and
 * the editor shows the property-like ones (`Font`, `Flow`) as a single
 * "Document" row in the Outline. That row is selected with the reserved
 * {@link DOCUMENT_ID} -- the only selection id that is not a path id.
 *
 * Pure: no React/Redux/MUI.
 */

/**
 * Directives edited through Document properties. Their presence in the file is
 * what makes the Document row appear in the Outline. Add future document-level
 * keywords here.
 * @type {ReadonlyArray<string>}
 */
export const DOCUMENT_DIRECTIVES = Object.freeze(['Font', 'Flow']);

/**
 * Block directives: kept out of the element tree like the others (their rows are
 * not components), but not shown as Document properties.
 * @type {ReadonlyArray<string>}
 */
export const BLOCK_DIRECTIVES = Object.freeze(['Icons']);

/** Every top-level keyword core treats as a directive. */
export const DIRECTIVE_NAMES = Object.freeze([...DOCUMENT_DIRECTIVES, ...BLOCK_DIRECTIVES]);

/**
 * Selection id of the Outline's "Document" row. Path ids are digits and dots,
 * so this can never collide with one.
 */
export const DOCUMENT_ID = 'document';

/** Flow direction values; `TD` is core's default, so it is never written. */
export const FLOW_DEFAULT = 'TD';
export const FLOW_VALUES = Object.freeze(['TD', 'LR']);

/**
 * Whether a top-level component name is a directive.
 * @param {string|null|undefined} name
 * @returns {boolean}
 */
export function isDirectiveName(name) {
  return typeof name === 'string' && DIRECTIVE_NAMES.includes(name);
}

/**
 * Whether a directive name is one of the Document properties (Font, Flow).
 * @param {string|null|undefined} name
 * @returns {boolean}
 */
export function isDocumentDirective(name) {
  return typeof name === 'string' && DOCUMENT_DIRECTIVES.includes(name);
}

/**
 * Whether a selection id is the Document row.
 * @param {string|null|undefined} id
 * @returns {boolean}
 */
export function isDocumentId(id) {
  return id === DOCUMENT_ID;
}
