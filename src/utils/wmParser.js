// @ts-check
/**
 * wmParser -- FAULT-TOLERANT wiremark text -> editable tree.
 *
 * This is OUR parser, distinct from `@wiremark/core`'s `parse()` (which is
 * lossy and throws on bad input). This one NEVER throws: every weird line is
 * captured so the live editor can round-trip whatever the user typed. Soft
 * problems surface as advisory `diagnostics` for the gutter, never blocking.
 *
 * Output shape:
 *   parse(source) => { frames: ElementPayload[], trailingTrivia: string[], diagnostics: Diagnostic[] }
 *
 *   ElementPayload = WiremarkElement.toJSON() minus `id` (the document assigns
 *   path ids on hydration):
 *     { component, tokens, comment, leadingTrivia, children }
 *   Token = { kind: 'keyless'|'keyed', key?, value, quoted }
 *   Diagnostic = { line, severity: 'error'|'warning', message }
 *
 * @typedef {{ kind: 'keyless'|'keyed', key?: string, value: string, quoted: boolean }} Token
 * @typedef {{ component: string, tokens: Token[], comment: string|null, leadingTrivia: string[], children: ElementPayload[], line: number }} ElementPayload
 *   `line` is the element's 1-based content line in the source (for editor
 *   cursor <-> selection sync). It is positional/derived and NOT persisted in
 *   WiremarkElement.toJSON().
 * @typedef {{ line: number, severity: 'error'|'warning', message: string }} Diagnostic
 */

export const INDENT_WIDTH = 2;

/**
 * Parse wiremark source text into an editable tree. Never throws.
 * @param {string} source
 * @returns {{ frames: ElementPayload[], trailingTrivia: string[], diagnostics: Diagnostic[] }}
 */
export function parse(source) {
  /** @type {Diagnostic[]} */
  const diagnostics = [];
  const text = typeof source === 'string' ? source : '';
  // Split on newlines; keep CRLF tolerant. A trailing newline yields a final
  // empty string which we treat as a blank line (trivia) -- matched by the
  // serializer's single trailing newline.
  const rawLines = text.split('\n').map((l) => l.replace(/\r$/, ''));

  // Drop the single trailing empty element produced by a final newline so a
  // normal "...\n" file does not gain a spurious blank trailing-trivia line.
  if (rawLines.length > 0 && rawLines[rawLines.length - 1] === '') {
    rawLines.pop();
  }

  /**
   * A parsed line ready for tree assembly.
   * @typedef {{ depth: number, payload: ElementPayload }} OpenLine
   */

  /** @type {ElementPayload[]} root-level frames */
  const roots = [];
  /** Stack of currently-open ancestors by depth. @type {Array<{ depth: number, payload: ElementPayload }>} */
  const stack = [];
  /** Trivia (blank / full-line comment) waiting to attach to the next element. @type {string[]} */
  let pendingTrivia = [];

  rawLines.forEach((rawLine, idx) => {
    const lineNo = idx + 1;

    // --- Indentation: count leading spaces; tabs normalize to 2 spaces + warn.
    const { indentCols, rest, hadTab } = measureIndent(rawLine);
    if (hadTab) {
      diagnostics.push({
        line: lineNo,
        severity: 'warning',
        message: 'tabs normalized to spaces',
      });
    }

    const trimmed = rest.trim();

    // --- Trivia: blank line or a full-line comment.
    if (trimmed === '' || trimmed.startsWith('//')) {
      // Store verbatim (the trimmed-right form, no trailing newline). Blank
      // lines store as ''. Full-line comments store with their `//`.
      pendingTrivia.push(trimmed);
      return;
    }

    const depth = Math.floor(indentCols / INDENT_WIDTH);

    // --- Tokenize the content line.
    const { component, tokens, comment, isComponent } = parseContentLine(trimmed);
    if (!isComponent) {
      diagnostics.push({
        line: lineNo,
        severity: 'error',
        message: `"${firstWord(trimmed)}" is not a valid component name`,
      });
    }

    /** @type {ElementPayload} */
    const payload = {
      component,
      tokens,
      comment,
      leadingTrivia: pendingTrivia,
      children: [],
      line: lineNo,
    };
    pendingTrivia = [];

    // --- Attach into the tree by depth. Pop deeper/equal open ancestors.
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    if (stack.length === 0) {
      // Top level: a frame root.
      roots.push(payload);
    } else {
      stack[stack.length - 1].payload.children.push(payload);
    }

    stack.push({ depth, payload });
  });

  return {
    frames: roots,
    trailingTrivia: pendingTrivia,
    diagnostics,
  };
}

/**
 * Measure leading indentation. A tab counts as one indent level (2 cols) and
 * flags the line. Mixed leading whitespace is tolerated.
 * @param {string} line
 * @returns {{ indentCols: number, rest: string, hadTab: boolean }}
 */
export function measureIndent(line) {
  let cols = 0;
  let i = 0;
  let hadTab = false;
  for (; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === ' ') {
      cols += 1;
    } else if (ch === '\t') {
      cols += INDENT_WIDTH;
      hadTab = true;
    } else {
      break;
    }
  }
  return { indentCols: cols, rest: line.slice(i), hadTab };
}

/**
 * Parse a single non-trivia content line into component + tokens + comment.
 * Tolerant: a non-PascalCase first word still produces an element with
 * `component: ''` and the whole line captured as one keyless token.
 * @param {string} text already left-trimmed line content
 * @returns {{ component: string, tokens: Token[], comment: string|null, isComponent: boolean }}
 */
function parseContentLine(text) {
  // Split off a trailing `// comment` that is NOT inside quotes.
  const { body, comment } = splitComment(text);
  const segments = tokenizeSegments(body);

  if (segments.length === 0) {
    // Comment-only-after-indent edge: treat the whole thing as a blank element.
    return { component: '', tokens: [], comment, isComponent: false };
  }

  const first = segments[0];
  // A component name is a bare (unquoted) PascalCase word.
  const isComponent = !first.quoted && isPascalCase(first.text);

  if (isComponent) {
    const tokens = segments.slice(1).map(segmentToToken);
    return { component: first.text, tokens, comment, isComponent: true };
  }

  // Not a component: capture the ENTIRE body as one keyless token so nothing is
  // dropped and the serializer can round-trip it.
  /** @type {Token} */
  const captured = { kind: 'keyless', value: body.trim(), quoted: false };
  return { component: '', tokens: [captured], comment, isComponent: false };
}

/**
 * The component name on a single raw source line, or `''` when the line is
 * blank, a full-line comment, or does not start with a PascalCase component.
 * Mirrors how `parse()` classifies a content line; tolerant, never throws.
 * @param {string} rawLine
 * @returns {string}
 */
export function componentOnLine(rawLine) {
  const { rest } = measureIndent(rawLine);
  const trimmed = rest.trim();
  if (trimmed === '' || trimmed.startsWith('//')) return '';
  return parseContentLine(trimmed).component;
}

/**
 * Split a trailing `//` comment off a line, respecting double-quoted strings.
 * @param {string} text
 * @returns {{ body: string, comment: string|null }}
 */
function splitComment(text) {
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes && ch === '/' && text[i + 1] === '/') {
      const body = text.slice(0, i).replace(/\s+$/, '');
      const comment = text.slice(i + 2).trim();
      return { body, comment };
    }
  }
  return { body: text.replace(/\s+$/, ''), comment: null };
}

/**
 * @typedef {{ text: string, quoted: boolean, key?: string, keyQuoted?: boolean }} Segment
 */

/**
 * Tokenize a line body into whitespace-separated segments, honoring double
 * quotes (a quoted value keeps everything between the quotes, spaces included).
 * Handles `key=value`, `key="quoted value"`, bare words, and `"quoted"`.
 * @param {string} body
 * @returns {Segment[]}
 */
function tokenizeSegments(body) {
  /** @type {Segment[]} */
  const segments = [];
  let i = 0;
  const n = body.length;

  while (i < n) {
    // Skip whitespace.
    while (i < n && isWs(body[i])) i += 1;
    if (i >= n) break;

    // Read a "word" which may contain a `key=` prefix and quoted parts.
    let key;
    let keyQuoted = false;
    let value = '';
    let quoted = false;
    let sawQuote = false;

    // First, try to read a bare key up to an unquoted `=`.
    const keyStart = i;
    if (body[i] !== '"') {
      let j = i;
      let foundEq = false;
      while (j < n && !isWs(body[j]) && body[j] !== '"') {
        if (body[j] === '=') {
          foundEq = true;
          break;
        }
        j += 1;
      }
      if (foundEq) {
        key = body.slice(keyStart, j);
        i = j + 1; // skip '='
      }
    }

    // Read the value: a quoted string, or a bare run of non-whitespace.
    if (i < n && body[i] === '"') {
      // Quoted value (may itself be the whole segment).
      quoted = true;
      sawQuote = true;
      i += 1; // opening quote
      let buf = '';
      while (i < n && body[i] !== '"') {
        buf += body[i];
        i += 1;
      }
      if (i < n && body[i] === '"') i += 1; // closing quote
      value = buf;
      // Anything immediately appended after the closing quote (rare/malformed)
      // is absorbed as bare text.
      while (i < n && !isWs(body[i])) {
        value += body[i];
        i += 1;
      }
    } else {
      // Bare value run.
      let buf = '';
      while (i < n && !isWs(body[i])) {
        if (body[i] === '"') {
          // Inline quote inside a bare run: read the quoted part too.
          quoted = true;
          sawQuote = true;
          i += 1;
          while (i < n && body[i] !== '"') {
            buf += body[i];
            i += 1;
          }
          if (i < n && body[i] === '"') i += 1;
        } else {
          buf += body[i];
          i += 1;
        }
      }
      value = buf;
    }

    /** @type {Segment} */
    const seg = { text: value, quoted: sawQuote ? quoted : false };
    if (key !== undefined) {
      seg.key = key;
      seg.keyQuoted = keyQuoted;
    }
    segments.push(seg);
  }

  return segments;
}

/**
 * Convert a tokenized segment into a Token payload.
 * @param {Segment} seg
 * @returns {Token}
 */
function segmentToToken(seg) {
  if (seg.key !== undefined) {
    return { kind: 'keyed', key: seg.key, value: seg.text, quoted: seg.quoted };
  }
  return { kind: 'keyless', value: seg.text, quoted: seg.quoted };
}

/** @param {string} ch */
function isWs(ch) {
  return ch === ' ' || ch === '\t';
}

/**
 * A plausible component name: starts uppercase, only letters/digits.
 * @param {string} word
 * @returns {boolean}
 */
function isPascalCase(word) {
  return /^[A-Z][A-Za-z0-9]*$/.test(word);
}

/** @param {string} text */
function firstWord(text) {
  const m = text.match(/^\S+/);
  return m ? m[0] : text;
}
