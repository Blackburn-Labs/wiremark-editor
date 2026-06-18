// @ts-check
/**
 * completionContext.js -- PURE context analysis for the editor's type-ahead.
 * Given the current line text, the cursor's column within
 * that line, and the full document text, decide WHAT kind of token the user is
 * editing and WHICH options should be suggested.
 *
 * Pure: no React/Redux/MUI/CodeMirror. The only dependencies are the (pure)
 * registry adapter and the fault-tolerant `wmParser`. Never throws.
 *
 * The kinds of completion context:
 *  - 'component'  -- cursor sits at the start of a line (only indentation before
 *                    it). options = every component name.
 *  - 'keyless'    -- a bare word being typed after a known component. options =
 *                    that component's keyless ENUM values + boolean-flag prop
 *                    names + (when the component has an icon keyless/prop) icon
 *                    names.
 *  - 'propValue'  -- the user typed `key=` and is editing the value. options =
 *                    that prop's enum `values`.
 *  - 'idref'      -- the value being typed starts with `#` (whether after `to=` /
 *                    `href=` or any other `#`-prefixed value). options = the
 *                    document's ids, each '#'-prefixed.
 *  - 'none'       -- nothing useful to suggest.
 */

import WiremarkDocument from '../domain/WiremarkDocument.js';
import {
  componentNames,
  keylessSlotsFor,
  iconNames,
  idsInDocument,
} from './registryAdapter.js';
import { getComponent, isKnownComponent } from '@wiremark/core';

/**
 * @typedef {object} CompletionContext
 * @property {'component'|'keyless'|'propValue'|'idref'|'none'} kind
 * @property {string} token the partial token currently under the cursor
 * @property {string} [componentName] the line's component (when known)
 * @property {string} [propName] the prop key being valued (propValue kind)
 * @property {string[]} options the suggestion candidates
 */

/**
 * Harvest the document's `#id`s (without the leading `#`) from raw text. Reuses
 * the canonical parse + `idsInDocument` walk rather than re-deriving wmId here.
 * @param {string} docText
 * @returns {string[]} ids WITHOUT the leading '#'
 */
function idsFromText(docText) {
  try {
    return idsInDocument(WiremarkDocument.parse(typeof docText === 'string' ? docText : ''));
  } catch {
    return [];
  }
}

/**
 * The leading word (component name) of a line, ignoring indentation. Returns ''
 * when the line has no plausible leading word yet.
 * @param {string} lineText
 * @returns {string}
 */
function leadingWord(lineText) {
  const m = /^\s*(\S+)/.exec(lineText);
  return m ? m[1] : '';
}

/**
 * The enum values for every keyless ENUM slot of a component, deduped & ordered.
 * @param {string} component
 * @returns {string[]}
 */
function keylessEnumValues(component) {
  /** @type {string[]} */
  const out = [];
  const def = getComponent(component);
  const props = (def && def.props) || {};
  for (const slot of keylessSlotsFor(component)) {
    if (slot.kind !== 'enum') continue;
    const pd = props[slot.to];
    if (pd && Array.isArray(pd.values)) {
      for (const v of pd.values) if (!out.includes(v)) out.push(v);
    }
  }
  return out;
}

/**
 * The names of every boolean-typed prop on a component (these are bare flags in
 * wiremark, e.g. `disabled`, `fullWidth`).
 * @param {string} component
 * @returns {string[]}
 */
function booleanFlagNames(component) {
  /** @type {string[]} */
  const out = [];
  const def = getComponent(component);
  const props = (def && def.props) || {};
  for (const name of Object.keys(props)) {
    const pd = props[name];
    if (pd && pd.type === 'boolean') out.push(name);
  }
  return out;
}

/**
 * Whether the component has any icon-typed slot: either a keyless slot whose
 * target prop is `icon`, or any icon-typed prop directly (e.g. `Button`'s
 * `startIcon`). When true, icon names join the keyless suggestions.
 * @param {string} component
 * @returns {boolean}
 */
function hasIconSlot(component) {
  const def = getComponent(component);
  const props = (def && def.props) || {};
  for (const name of Object.keys(props)) {
    if (props[name] && props[name].type === 'icon') return true;
  }
  return false;
}

/**
 * Resolve a (possibly aliased) prop name to its canonical PropDef.
 * @param {string} component
 * @param {string} propName
 * @returns {{ type?: string, values?: string[] }|undefined}
 */
function resolveProp(component, propName) {
  const def = getComponent(component);
  if (!def) return undefined;
  const props = def.props || {};
  if (props[propName]) return props[propName];
  const aliases = def.aliases || {};
  const canonical = aliases[propName];
  if (canonical && props[canonical]) return props[canonical];
  return undefined;
}

/**
 * Analyze the completion context at the cursor. PURE; never throws.
 *
 * @param {{ lineText?: string, columnInLine?: number, docText?: string }} input
 * @returns {CompletionContext}
 */
export function analyzeCompletion(input) {
  const lineText = input && typeof input.lineText === 'string' ? input.lineText : '';
  const col =
    input && typeof input.columnInLine === 'number'
      ? Math.max(0, Math.min(input.columnInLine, lineText.length))
      : lineText.length;
  const docText = input && typeof input.docText === 'string' ? input.docText : '';

  const before = lineText.slice(0, col);

  // --- kind: component -----------------------------------------------------
  // Cursor at line start: everything before it is whitespace (indentation).
  if (/^\s*$/.test(before)) {
    return {
      kind: 'component',
      token: '',
      options: componentNames(),
    };
  }

  // The component is the first word on the line.
  const component = leadingWord(before);

  // The fragment under the cursor: text after the last unquoted whitespace.
  // (Quoted strings are drawn text, not suggestable, so we keep this simple and
  // operate on the trailing run of non-space characters.)
  const wsIdx = before.search(/\S+$/);
  const fragment = wsIdx === -1 ? '' : before.slice(wsIdx);

  // If the cursor is still inside the component word itself (no whitespace yet
  // after the leading word), treat it as completing the component name.
  if (/^\s*\S*$/.test(before)) {
    return {
      kind: 'component',
      token: fragment,
      options: componentNames(),
    };
  }

  // --- key=value fragments -------------------------------------------------
  const eq = fragment.indexOf('=');
  if (eq !== -1) {
    const key = fragment.slice(0, eq);
    const value = fragment.slice(eq + 1);

    // idref: any value starting with '#' (covers to=#, href=#, and bare #...).
    if (value.startsWith('#')) {
      return {
        kind: 'idref',
        token: value,
        componentName: component,
        propName: key,
        options: idsFromText(docText).map((id) => `#${id}`),
      };
    }

    // propValue: enum values for that (alias-aware) prop, if known.
    const pd = isKnownComponent(component) ? resolveProp(component, key) : undefined;
    const values = pd && pd.type === 'enum' && Array.isArray(pd.values) ? [...pd.values] : [];
    return {
      kind: 'propValue',
      token: value,
      componentName: component,
      propName: key,
      options: values,
    };
  }

  // --- bare fragment starting with '#': idref (e.g. `Wireframe #ho`) -------
  if (fragment.startsWith('#')) {
    return {
      kind: 'idref',
      token: fragment,
      componentName: component,
      options: idsFromText(docText).map((id) => `#${id}`),
    };
  }

  // --- keyless: a bare word after a known component ------------------------
  if (isKnownComponent(component)) {
    /** @type {string[]} */
    const options = [];
    for (const v of keylessEnumValues(component)) if (!options.includes(v)) options.push(v);
    for (const v of booleanFlagNames(component)) if (!options.includes(v)) options.push(v);
    if (hasIconSlot(component)) {
      for (const v of iconNames()) if (!options.includes(v)) options.push(v);
    }
    return {
      kind: 'keyless',
      token: fragment,
      componentName: component,
      options,
    };
  }

  // Unknown component (or otherwise nothing useful) -> no suggestions.
  return {
    kind: 'none',
    token: fragment,
    componentName: component,
    options: [],
  };
}

export default { analyzeCompletion };
