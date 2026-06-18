// @ts-check
import BasicArray from './BasicArray.js';

/**
 * WiremarkElementList -- a typed, immutable collection of WiremarkElements.
 * Inherits the generic BasicArray ops only; it adds NO
 * tree-specific methods (those live in `utils/treeOps`).
 *
 * NOTE: `itemType` is assigned by WiremarkElement.js after both classes are
 * defined, to break the WiremarkElement <-> WiremarkElementList import cycle
 * (a `static itemType = WiremarkElement` field would read the other module
 * before it finishes initializing when this file is the cycle entry point).
 *
 * @extends {BasicArray<import('./WiremarkElement.js').default>}
 */
export default class WiremarkElementList extends BasicArray {
  /** @type {*} set by WiremarkElement.js */
  static itemType = null;
}

export { WiremarkElementList };
