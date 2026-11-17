// @ts-check
import WiremarkElement from './WiremarkElement.js';

/**
 * WiremarkDirective -- a top-level, non-frame line of the document: `Font`,
 * `Flow`, or the `Icons` block (see utils/directives.js).
 *
 * It reuses WiremarkElement's token model (so `Font "Kalam" width=1.03` reads
 * like any element line and round-trips through the serializer) and adds
 * `before`: how many frames precede it in the source, so the serializer can put
 * it back in place. Directives carry no path id -- they are not part of the
 * element tree; the Outline shows the Document ones as a single "Document" row.
 *
 * @typedef {import('../utils/wmParser.js').Token} Token
 */
export default class WiremarkDirective extends WiremarkElement {
  /**
   * @param {ConstructorParameters<typeof WiremarkElement>[0] & { before?: number }} [data]
   */
  constructor(data = {}) {
    super({ ...data, id: null });
    /** @type {number} frames preceding this directive in the source */
    this.before = Number.isInteger(data.before) && /** @type {number} */ (data.before) > 0
      ? /** @type {number} */ (data.before)
      : 0;
  }

  /**
   * @returns {ReturnType<WiremarkElement['toJSON']> & { before: number }}
   */
  toJSON() {
    return { ...super.toJSON(), before: this.before };
  }

  /**
   * The first keyless value (e.g. the family of `Font "Kalam"`, the direction of
   * `Flow LR`), or null.
   * @returns {string|null}
   */
  firstValue() {
    const token = this.tokens.find((t) => t.kind === 'keyless');
    return token ? token.value : null;
  }

  /**
   * A keyed value by exact key (directives have no aliases), or null.
   * @param {string} key
   * @returns {string|null}
   */
  keyedValue(key) {
    const token = this.tokens.find((t) => t.kind === 'keyed' && t.key === key);
    return token ? token.value : null;
  }
}

export { WiremarkDirective };
