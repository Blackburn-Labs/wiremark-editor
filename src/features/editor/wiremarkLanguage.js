// @ts-check
/**
 * wiremarkLanguage.js -- a PURELY LEXICAL, single-line CodeMirror language for
 * wiremark. No cross-line semantic state: every line is
 * tokenized independently by a `StreamLanguage` tokenizer.
 *
 * Token mapping (per the contract):
 *  - the first word of a line (PascalCase) at line start => `component`
 *  - `key=`                                              => `propertyName`
 *  - a double-quoted run                                  => `string`
 *  - `#word`                                              => `labelName` (id)
 *  - `// ...` to end of line                              => `comment`
 *  - a bare number                                        => `number`
 *  - any other bare word                                  => `keyword` (flag/enum)
 *
 * Plus a per-theme `HighlightStyle` mapping those highlight tags to colors and a
 * theme-aware `syntaxHighlighting()` extension built from it. The DARK palette is
 * Dracula; the LIGHT palette darkens each hue so it clears WCAG AA contrast on the
 * white editor background while keeping its Dracula hue identity.
 */

import { StreamLanguage, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

/**
 * Dracula palette (subset) -- used on the DARK editor background.
 * Bright/neon: tuned for a dark surface, not white.
 */
export const DRACULA = {
  component: '#FF79C6', // pink -- component / tag names
  property: '#50FA7B', // green -- prop keys / attrs
  string: '#F1FA8C', // yellow -- quoted strings
  comment: '#6272A4', // muted blue -- comments
  number: '#BD93F9', // purple -- numbers
  keyword: '#8BE9FD', // cyan -- bare flags / enum values
  id: '#FFB86C', // orange -- #ids
};

/**
 * Light-mode palette -- used on the WHITE editor background. Each color is the
 * darkened/saturated counterpart of its Dracula hue, chosen so the same token
 * kinds stay recognizable across themes. Every color clears WCAG AA (>= 4.5:1)
 * against `#fff` (the @uiw light theme background); worst is keyword at 4.81:1.
 */
export const LIGHT_PALETTE = {
  component: '#BE185D', // magenta-rose (Dracula pink) -- 6.04:1
  property: '#137A3A', // green -- 5.42:1
  string: '#8A4F0A', // amber-brown (Dracula yellow can't survive on white) -- 6.56:1
  comment: '#5B6B8C', // muted slate-blue -- 5.35:1
  number: '#7E22CE', // violet -- 6.98:1
  keyword: '#0E7C99', // dark teal (Dracula cyan) -- 4.81:1
  id: '#C04000', // orange -- 5.28:1
};

/**
 * A line-scoped tokenizer state. `atLineStart` flips false once the first
 * non-space token has been consumed, so only the leading word is a component.
 * @typedef {{ atLineStart: boolean }} TokenizerState
 */

/**
 * Whether a word looks like a component name (PascalCase: leading uppercase).
 * @param {string} word
 * @returns {boolean}
 */
function isPascalCase(word) {
  return /^[A-Z][A-Za-z0-9]*$/.test(word);
}

/** The `StreamParser` driving `StreamLanguage.define`. */
const wiremarkStreamParser = {
  /** @returns {TokenizerState} */
  startState() {
    return { atLineStart: true };
  },

  /**
   * @param {import('@codemirror/language').StringStream} stream
   * @param {TokenizerState} state
   * @returns {string|null} a highlight tag name (token type) or null
   */
  token(stream, state) {
    // Leading indentation: consume but don't classify.
    if (stream.sol()) {
      state.atLineStart = true;
    }
    if (stream.eatSpace()) {
      return null;
    }

    // Comment: `//` to end of line.
    if (stream.match('//')) {
      stream.skipToEnd();
      return 'comment';
    }

    // Double-quoted string (single-line; tolerate an unterminated quote).
    if (stream.peek() === '"') {
      stream.next(); // opening quote
      let escaped = false;
      let ch;
      while ((ch = stream.next()) != null) {
        if (ch === '"' && !escaped) break;
        escaped = !escaped && ch === '\\';
      }
      return 'string';
    }

    const wasLineStart = state.atLineStart;
    state.atLineStart = false;

    // The first non-space run on a line: classify as component when PascalCase.
    if (wasLineStart) {
      const word = stream.match(/^\S+/);
      if (word && isPascalCase(word[0])) {
        return 'tagName';
      }
      // Not a plausible component -- fall through styling as a bare word.
      return null;
    }

    // `#word` => id.
    if (stream.peek() === '#') {
      stream.match(/^#\S*/);
      return 'labelName';
    }

    // `key=` => property key (consume just the key + '='; the value is tokenized
    // on the next pass as a string / number / bare word / id).
    const keyed = stream.match(/^[A-Za-z_][\w-]*=/);
    if (keyed) {
      return 'propertyName';
    }

    // A bare numeric token => number.
    if (stream.match(/^-?\d+(?:\.\d+)?\b/)) {
      return 'number';
    }

    // Any other bare word => keyword (flag / enum value). Stop before `=` so a
    // following `key=` is not swallowed.
    const bare = stream.match(/^[^\s"#=]+/);
    if (bare) {
      return 'keyword';
    }

    // Single leftover char (e.g. a stray `=`): advance to avoid stalling.
    stream.next();
    return null;
  },
};

/**
 * Build the wiremark `StreamLanguage` CodeMirror extension.
 * @returns {import('@codemirror/state').Extension}
 */
export function wiremarkLanguage() {
  return StreamLanguage.define(wiremarkStreamParser).extension;
}

/**
 * Build a `HighlightStyle` mapping the parser's token tags to a palette's colors.
 * @param {typeof DRACULA} palette
 * @returns {import('@codemirror/language').HighlightStyle}
 */
function makeHighlightStyle(palette) {
  return HighlightStyle.define([
    { tag: tags.tagName, color: palette.component, fontWeight: '600' },
    { tag: tags.propertyName, color: palette.property },
    { tag: tags.string, color: palette.string },
    { tag: tags.comment, color: palette.comment, fontStyle: 'italic' },
    { tag: tags.number, color: palette.number },
    { tag: tags.keyword, color: palette.keyword },
    { tag: tags.labelName, color: palette.id },
  ]);
}

/** Dark-theme (Dracula) highlight style. */
export const wiremarkHighlightStyleDark = makeHighlightStyle(DRACULA);

/** Light-theme highlight style (high-contrast on white). */
export const wiremarkHighlightStyleLight = makeHighlightStyle(LIGHT_PALETTE);

/**
 * Back-compat alias for the dark style (the original single export).
 * @deprecated prefer the explicit `*Dark`/`*Light` styles.
 */
export const wiremarkHighlightStyle = wiremarkHighlightStyleDark;

/**
 * The ready-to-use highlighting extension for the given theme mode. Defaults to
 * dark so existing callers keep their behavior.
 * @param {'light'|'dark'} [mode]
 * @returns {import('@codemirror/state').Extension}
 */
export function wiremarkHighlighting(mode = 'dark') {
  return syntaxHighlighting(
    mode === 'light' ? wiremarkHighlightStyleLight : wiremarkHighlightStyleDark,
  );
}

export default wiremarkLanguage;
