// @ts-check
/**
 * registryAdapter.js -- bridges the live `@wiremark/core` registry into the
 * editor's metadata shapes. One source of truth feeds
 * the component palette, the property form, and the autocomplete.
 *
 * Pure: no React/Redux/MUI. The only side-effectful dependency is reading the
 * (immutable) core registry. Every call into core here is for metadata only
 * (`REGISTRY`, `getComponent`) and never throws on valid component names.
 */

import { REGISTRY, getComponent } from '@wiremark/core';
import { iconNames as curatedIconNames } from './iconNames.js';

/**
 * `getComponent`, but never throws and returns `undefined` for unknown/blank
 * component names. The live editor constantly holds partial/invalid component
 * names (mid-typing `AppBar` it is briefly `A`), so every adapter read must
 * tolerate that instead of crashing the inspector.
 * @param {string} name
 * @returns {ReturnType<typeof getComponent>|undefined}
 */
function safeGetComponent(name) {
  if (!name) return undefined;
  try {
    return getComponent(name);
  } catch {
    return undefined;
  }
}

/**
 * The universal prop names -- listed here explicitly
 * (note: `UNIVERSAL_PROPS` is NOT exported by core, so we list it here). Any
 * field whose name is in this set is grouped under "universal" / Advanced.
 * @type {ReadonlySet<string>}
 */
const UNIVERSAL_PROP_NAMES = new Set([
  'to',
  'scrollbar',
  'scrollbarValue',
  'scrollbarHandle',
  'padding',
  'background',
  'denseBackground',
  'opaque',
]);

/**
 * @typedef {object} Field
 * @property {string} name prop name (canonical key from `def.props`)
 * @property {'text'|'select'|'switch'|'number'|'icon'|'idref'} control UI control
 * @property {string} type the underlying core PropDef type
 * @property {string[]} [values] enum values (only for `select`)
 * @property {*} [default] the prop's default value, when present
 * @property {'universal'|'component'} group grouping for form layout
 */

/**
 * @typedef {object} KeylessSlot
 * @property {string} kind e.g. 'literal' | 'enum' | 'id' | 'preset' | 'number' | 'sizing'
 * @property {string} to the prop name the keyless slot maps to
 */

/**
 * Map a core PropDef `type` to an editor control name.
 * @param {string} type
 * @returns {Field['control']}
 */
function controlForType(type) {
  switch (type) {
    case 'string':
      return 'text';
    case 'enum':
      return 'select';
    case 'boolean':
      return 'switch';
    case 'number':
      return 'number';
    case 'ratio':
      return 'number';
    case 'icon':
      return 'icon';
    case 'id':
    case 'ref':
      return 'idref';
    default:
      // Unknown/future types degrade to a plain text control.
      return 'text';
  }
}

/**
 * All known component names, sorted alphabetically.
 * @returns {string[]}
 */
export function componentNames() {
  return Object.keys(REGISTRY).sort();
}

/**
 * The category a component belongs to (e.g. 'layout', 'inputs').
 * @param {string} name
 * @returns {string}
 */
export function categoryOf(name) {
  return safeGetComponent(name)?.category ?? 'other';
}

/**
 * Component names grouped by category. Each category's list is sorted.
 * @returns {Record<string, string[]>}
 */
export function componentsByCategory() {
  /** @type {Record<string, string[]>} */
  const out = {};
  for (const name of componentNames()) {
    const cat = categoryOf(name);
    if (!out[cat]) out[cat] = [];
    out[cat].push(name);
  }
  return out;
}

/**
 * The element-level structural flags, coerced to plain booleans (core stores
 * them sparsely -- present only when true -- so we always read via `!!`).
 * @param {string} name
 * @returns {{ container: boolean, sizing: boolean, text: boolean }}
 */
export function flagsFor(name) {
  const def = safeGetComponent(name);
  return {
    container: !!def?.container,
    sizing: !!def?.sizing,
    text: !!def?.text,
  };
}

/**
 * One editable Field descriptor per prop on the component (universal props are
 * already merged into `def.props` by core). The property form renders
 * `component` fields first and collapses `universal` fields under "Advanced".
 * @param {string} name
 * @returns {Field[]}
 */
export function fieldsFor(name) {
  const def = safeGetComponent(name);
  if (!def) return []; // unknown/partial component (live editing) -> no fields
  const props = def.props || {};
  /** @type {Field[]} */
  const fields = [];
  for (const propName of Object.keys(props)) {
    const propDef = props[propName] || {};
    /** @type {Field} */
    const field = {
      name: propName,
      control: controlForType(propDef.type),
      type: propDef.type,
      group: UNIVERSAL_PROP_NAMES.has(propName) ? 'universal' : 'component',
    };
    if (propDef.type === 'enum') {
      // Seed the select with the enum domain (default to empty if absent).
      field.values = Array.isArray(propDef.values) ? [...propDef.values] : [];
    }
    if (Object.prototype.hasOwnProperty.call(propDef, 'default')) {
      field.default = propDef.default;
    }
    fields.push(field);
  }
  return fields;
}

/**
 * The component's keyless positional slots. Core stores `keyless` as
 * `Array<{kind,to}>` or `undefined` (e.g. Card) -- always coalesce to `[]`.
 * @param {string} name
 * @returns {KeylessSlot[]}
 */
export function keylessSlotsFor(name) {
  return safeGetComponent(name)?.keyless ?? [];
}

/**
 * The curated list of suggestable Material icon names. Re-exported from
 * `iconNames.js` so callers have one registry-adapter surface.
 * @returns {readonly string[]}
 */
export function iconNames() {
  return curatedIconNames;
}

/**
 * Walk OUR editable document tree, collecting every element's wiremark id (the
 * `#id`, returned WITHOUT the leading `#`). Used to seed `to=`/`href=` and id
 * pickers; the picker UI adds/strips the `#`.
 *
 * Accepts any duck-typed doc shape `{ frames: Array<node> }` where each node
 * exposes `wmId()` and (optionally) `children` (an array of nodes). This keeps
 * it unit-testable with minimal fakes as well as real `WiremarkDocument`s.
 * @param {{ frames?: Iterable<*> } | null | undefined} doc
 * @returns {string[]}
 */
export function idsInDocument(doc) {
  /** @type {string[]} */
  const ids = [];
  if (!doc || !doc.frames) return ids;

  /** @param {*} node */
  const visit = (node) => {
    if (!node) return;
    const id = typeof node.wmId === 'function' ? node.wmId() : null;
    if (id) ids.push(id);
    const kids = node.children;
    if (kids && typeof kids[Symbol.iterator] === 'function') {
      for (const child of kids) visit(child);
    }
  };

  for (const frame of doc.frames) visit(frame);
  return ids;
}

export default {
  componentNames,
  categoryOf,
  componentsByCategory,
  flagsFor,
  fieldsFor,
  keylessSlotsFor,
  iconNames,
  idsInDocument,
};
