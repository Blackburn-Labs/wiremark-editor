// @ts-check
import BasicDomain from './BasicDomain.js';
import WiremarkElement from './WiremarkElement.js';
import WiremarkElementList from './WiremarkElementList.js';
import { parse as parseSource } from '../utils/wmParser.js';
import { serialize as serializeTree } from '../utils/wmSerializer.js';
import { pathId } from '../utils/pathId.js';

/**
 * WiremarkDocument -- the READ model + (de)serialize entry point.
 * It hydrates the fault-tolerant parser's output into the
 * typed domain tree, assigning every node a stable path id depth-first. It has
 * NO structural-edit methods -- those are `utils/treeOps` functions.
 *
 * @typedef {import('../utils/wmParser.js').ElementPayload} ElementPayload
 * @typedef {import('../utils/wmParser.js').Diagnostic} Diagnostic
 */
export default class WiremarkDocument extends BasicDomain {
  /**
   * @param {{
   *   frames?: Array<Record<string, unknown>>|WiremarkElementList,
   *   trailingTrivia?: string[],
   *   diagnostics?: Diagnostic[],
   * }} [data]
   */
  constructor(data = {}) {
    super(data);
    /** @type {WiremarkElementList} top-level frames */
    this.frames = data.frames instanceof WiremarkElementList
      ? data.frames
      : WiremarkElementList.from(/** @type {*} */ (data.frames) ?? []);
    /** @type {string[]} trivia after the last element */
    this.trailingTrivia = Array.isArray(data.trailingTrivia) ? [...data.trailingTrivia] : [];
    /** @type {Diagnostic[]} advisory parse diagnostics */
    this.diagnostics = Array.isArray(data.diagnostics) ? [...data.diagnostics] : [];
  }

  /**
   * @returns {{ frames: Array<Record<string, unknown>>, trailingTrivia: string[], diagnostics: Diagnostic[] }}
   */
  toJSON() {
    return {
      frames: this.frames.toJSON(),
      trailingTrivia: [...this.trailingTrivia],
      diagnostics: [...this.diagnostics],
    };
  }

  /**
   * Parse wiremark text into a document. Never throws (delegates to the
   * fault-tolerant `wmParser`). Assigns each node `id = pathId([...indices])`
   * depth-first so an unchanged element keeps its id across reparses.
   * @param {string} source
   * @returns {WiremarkDocument}
   */
  static parse(source) {
    const { frames, trailingTrivia, diagnostics } = parseSource(source);
    const withIds = frames.map((frame, i) => assignIds(frame, [i]));
    return new WiremarkDocument({
      frames: withIds,
      trailingTrivia,
      diagnostics,
    });
  }

  /**
   * Serialize the document back to wiremark text (delegates to `wmSerializer`).
   * @returns {string}
   */
  serialize() {
    return serializeTree({
      frames: this.frames.toJSON(),
      trailingTrivia: this.trailingTrivia,
    });
  }

  /**
   * Depth-first lookup by path id.
   * @param {string} id
   * @returns {WiremarkElement|undefined}
   */
  findById(id) {
    if (id == null) return undefined;
    /** @param {WiremarkElement} el */
    const walk = (el) => {
      if (el.id === id) return el;
      for (const child of el.children) {
        const hit = walk(child);
        if (hit) return hit;
      }
      return undefined;
    };
    for (const frame of this.frames) {
      const hit = walk(frame);
      if (hit) return hit;
    }
    return undefined;
  }

  /**
   * The root..node chain for `id` (for parent lookup), or null if not found.
   * @param {string} id
   * @returns {WiremarkElement[]|null}
   */
  findPath(id) {
    if (id == null) return null;
    /**
     * @param {WiremarkElement} el
     * @param {WiremarkElement[]} chain
     * @returns {WiremarkElement[]|null}
     */
    const walk = (el, chain) => {
      const next = [...chain, el];
      if (el.id === id) return next;
      for (const child of el.children) {
        const hit = walk(child, next);
        if (hit) return hit;
      }
      return null;
    };
    for (const frame of this.frames) {
      const hit = walk(frame, []);
      if (hit) return hit;
    }
    return null;
  }
}

/**
 * Return a copy of an ElementPayload with `id` set on it and every descendant,
 * derived from its path. Depth-first.
 * @param {ElementPayload} payload
 * @param {number[]} path
 * @returns {Record<string, unknown>}
 */
function assignIds(payload, path) {
  const children = Array.isArray(payload.children) ? payload.children : [];
  return {
    ...payload,
    id: pathId(path),
    children: children.map((child, i) => assignIds(child, [...path, i])),
  };
}

export { WiremarkDocument };
