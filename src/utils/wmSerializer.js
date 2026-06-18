// @ts-check
/**
 * wmSerializer -- editable tree -> wiremark text (DETERMINISTIC).
 *
 * Inverse of `wmParser.parse` for the structural payload. Indentation is two
 * spaces per depth. Each element emits its `leadingTrivia` (at the element's
 * indent) then the rebuilt content line, then its children recursively.
 * `trailingTrivia` is appended at the end. Output always ends with exactly one
 * trailing newline.
 *
 * Idempotency guarantee: `parse(serialize(parse(x)))` is
 * structurally equal to `parse(x)`, and `serialize` is STABLE on its own output
 * (re-serializing returns the identical string). It is not byte-identity with
 * arbitrary input -- extra inter-token spaces and trailing whitespace are
 * normalized, tabs become spaces -- but token order, quoting style, keyless-vs-
 * keyed distinction, and comments are preserved.
 *
 * @typedef {import('./wmParser.js').Token} Token
 * @typedef {import('./wmParser.js').ElementPayload} ElementPayload
 */

const INDENT = '  ';

/**
 * @param {{ frames: ElementPayload[], trailingTrivia?: string[] }} doc
 * @returns {string} wiremark text ending in a single newline
 */
export function serialize(doc) {
  const frames = doc && Array.isArray(doc.frames) ? doc.frames : [];
  const trailingTrivia = doc && Array.isArray(doc.trailingTrivia) ? doc.trailingTrivia : [];

  /** @type {string[]} */
  const lines = [];
  for (const frame of frames) {
    emitElement(frame, 0, lines);
  }
  for (const trivia of trailingTrivia) {
    // Trivia at end of file is emitted at column 0, verbatim.
    lines.push(trivia);
  }

  // Join with newlines and guarantee exactly one trailing newline.
  return `${lines.join('\n')}\n`;
}

/**
 * Recursively emit one element and its subtree into `lines`.
 * @param {ElementPayload} el
 * @param {number} depth
 * @param {string[]} lines
 */
function emitElement(el, depth, lines) {
  const pad = INDENT.repeat(depth);

  const leadingTrivia = Array.isArray(el.leadingTrivia) ? el.leadingTrivia : [];
  for (const trivia of leadingTrivia) {
    // Blank lines stay blank (no indent); comment lines are indented to the
    // element so they read as attached.
    if (trivia === '') {
      lines.push('');
    } else {
      lines.push(pad + trivia);
    }
  }

  lines.push(pad + buildContentLine(el));

  const children = Array.isArray(el.children) ? el.children : [];
  for (const child of children) {
    emitElement(child, depth + 1, lines);
  }
}

/**
 * Rebuild the single content line for an element (without indentation).
 * @param {ElementPayload} el
 * @returns {string}
 */
function buildContentLine(el) {
  const parts = [];
  if (el.component) parts.push(el.component);

  const tokens = Array.isArray(el.tokens) ? el.tokens : [];
  for (const token of tokens) {
    parts.push(buildToken(token));
  }

  let line = parts.join(' ');
  if (el.comment != null && el.comment !== '') {
    line = line === '' ? `// ${el.comment}` : `${line} // ${el.comment}`;
  } else if (el.comment === '') {
    // An empty trailing comment ("//" with nothing after) is preserved.
    line = line === '' ? '//' : `${line} //`;
  }
  return line;
}

/**
 * Render one token to text. Keyed -> `key=value`; keyless -> `value`. Quoted
 * values are wrapped in double quotes.
 * @param {Token} token
 * @returns {string}
 */
function buildToken(token) {
  const value = token.quoted ? `"${token.value}"` : token.value;
  if (token.kind === 'keyed' && token.key !== undefined) {
    return `${token.key}=${value}`;
  }
  return value;
}
