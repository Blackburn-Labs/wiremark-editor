// @ts-check
import { describe, it, expect } from 'vitest';
import { parse } from './wmParser.js';

describe('wmParser.parse - basics', () => {
  it('parses a single component line into a frame', () => {
    const { frames, trailingTrivia, diagnostics } = parse('Wireframe #home\n');
    expect(diagnostics).toEqual([]);
    expect(trailingTrivia).toEqual([]);
    expect(frames).toHaveLength(1);
    expect(frames[0].component).toBe('Wireframe');
    expect(frames[0].tokens).toEqual([{ kind: 'keyless', value: '#home', quoted: false }]);
    expect(frames[0].children).toEqual([]);
  });

  it('nests children by 2-space indentation', () => {
    const src = 'Wireframe\n  Stack\n    Button "OK"\n';
    const { frames } = parse(src);
    expect(frames).toHaveLength(1);
    const stack = frames[0].children[0];
    expect(stack.component).toBe('Stack');
    expect(stack.children[0].component).toBe('Button');
    expect(stack.children[0].tokens).toEqual([{ kind: 'keyless', value: 'OK', quoted: true }]);
  });

  it('keeps siblings at the same depth', () => {
    const src = 'Wireframe\n  Button "A"\n  Button "B"\n';
    const { frames } = parse(src);
    expect(frames[0].children).toHaveLength(2);
    expect(frames[0].children[0].tokens[0].value).toBe('A');
    expect(frames[0].children[1].tokens[0].value).toBe('B');
  });

  it('handles dedent back to a shallower level', () => {
    const src = 'Wireframe\n  Stack\n    Button "A"\n  Button "B"\n';
    const { frames } = parse(src);
    expect(frames[0].children).toHaveLength(2);
    expect(frames[0].children[0].component).toBe('Stack');
    expect(frames[0].children[1].component).toBe('Button');
    expect(frames[0].children[1].tokens[0].value).toBe('B');
  });
});

describe('wmParser.parse - tokens', () => {
  it('parses keyed tokens', () => {
    const { frames } = parse('TextField label="Email" type=email\n');
    expect(frames[0].component).toBe('TextField');
    expect(frames[0].tokens).toEqual([
      { kind: 'keyed', key: 'label', value: 'Email', quoted: true },
      { kind: 'keyed', key: 'type', value: 'email', quoted: false },
    ]);
  });

  it('handles quoted values containing spaces', () => {
    const { frames } = parse('Typography "Hello there world"\n');
    expect(frames[0].tokens).toEqual([
      { kind: 'keyless', value: 'Hello there world', quoted: true },
    ]);
  });

  it('handles keyed quoted values containing spaces', () => {
    const { frames } = parse('Button label="Save the file"\n');
    expect(frames[0].tokens).toEqual([
      { kind: 'keyed', key: 'label', value: 'Save the file', quoted: true },
    ]);
  });

  it('handles an empty-string label ""', () => {
    const { frames } = parse('Button ""\n');
    expect(frames[0].tokens).toEqual([
      { kind: 'keyless', value: '', quoted: true },
    ]);
  });

  it('preserves keyless ordering for multiple bare tokens', () => {
    const { frames } = parse('Box 240px * dotted #editor\n');
    expect(frames[0].tokens).toEqual([
      { kind: 'keyless', value: '240px', quoted: false },
      { kind: 'keyless', value: '*', quoted: false },
      { kind: 'keyless', value: 'dotted', quoted: false },
      { kind: 'keyless', value: '#editor', quoted: false },
    ]);
  });

  it('mixes keyless and keyed tokens preserving order', () => {
    const { frames } = parse('Button "Save" contained startIcon=Check\n');
    expect(frames[0].tokens).toEqual([
      { kind: 'keyless', value: 'Save', quoted: true },
      { kind: 'keyless', value: 'contained', quoted: false },
      { kind: 'keyed', key: 'startIcon', value: 'Check', quoted: false },
    ]);
  });

  it('collapses multiple inter-token spaces', () => {
    const { frames } = parse('Button   "OK"    contained\n');
    expect(frames[0].tokens).toEqual([
      { kind: 'keyless', value: 'OK', quoted: true },
      { kind: 'keyless', value: 'contained', quoted: false },
    ]);
  });
});

describe('wmParser.parse - comments and trivia', () => {
  it('captures a trailing comment', () => {
    const { frames } = parse('Button "OK" // primary action\n');
    expect(frames[0].comment).toBe('primary action');
    expect(frames[0].tokens).toEqual([{ kind: 'keyless', value: 'OK', quoted: true }]);
  });

  it('does not treat // inside quotes as a comment', () => {
    const { frames } = parse('Typography "http://example.com"\n');
    expect(frames[0].comment).toBe(null);
    expect(frames[0].tokens[0].value).toBe('http://example.com');
  });

  it('attaches blank-line and comment trivia to the next element', () => {
    const src = 'Wireframe\n\n  // a note\n  Button "OK"\n';
    const { frames } = parse(src);
    const btn = frames[0].children[0];
    expect(btn.leadingTrivia).toEqual(['', '// a note']);
    expect(btn.component).toBe('Button');
  });

  it('puts leftover trivia at EOF into trailingTrivia', () => {
    const src = 'Wireframe\n  Button "OK"\n\n// end note\n';
    const { trailingTrivia } = parse(src);
    expect(trailingTrivia).toEqual(['', '// end note']);
  });

  it('handles a comment-only document', () => {
    const { frames, trailingTrivia } = parse('// just a comment\n');
    expect(frames).toEqual([]);
    expect(trailingTrivia).toEqual(['// just a comment']);
  });

  it('handles a blank-only document', () => {
    const { frames, trailingTrivia } = parse('\n\n');
    expect(frames).toEqual([]);
    expect(trailingTrivia).toEqual(['', '']);
  });

  it('handles an empty document', () => {
    const { frames, trailingTrivia, diagnostics } = parse('');
    expect(frames).toEqual([]);
    expect(trailingTrivia).toEqual([]);
    expect(diagnostics).toEqual([]);
  });
});

describe('wmParser.parse - tabs', () => {
  it('treats tabs as 2 spaces and emits a warning', () => {
    const src = 'Wireframe\n\tButton "OK"\n';
    const { frames, diagnostics } = parse(src);
    expect(frames[0].children[0].component).toBe('Button');
    expect(diagnostics).toEqual([
      { line: 2, severity: 'warning', message: 'tabs normalized to spaces' },
    ]);
  });
});

describe('wmParser.parse - non-component lines', () => {
  it('captures a non-PascalCase line with component "" and an error', () => {
    const { frames, diagnostics } = parse('this is not a component\n');
    expect(frames).toHaveLength(1);
    expect(frames[0].component).toBe('');
    expect(frames[0].tokens).toEqual([
      { kind: 'keyless', value: 'this is not a component', quoted: false },
    ]);
    expect(diagnostics).toEqual([
      { line: 1, severity: 'error', message: '"this" is not a valid component name' },
    ]);
  });

  it('does not drop the non-component line content', () => {
    const { frames } = parse('lowercase stuff here\n');
    expect(frames[0].tokens[0].value).toBe('lowercase stuff here');
  });
});

describe('wmParser.parse - multi-frame', () => {
  it('parses multiple top-level frames', () => {
    const src = 'Wireframe #a\n  Button "x"\nWireframe #b\n  Button "y"\n';
    const { frames } = parse(src);
    expect(frames).toHaveLength(2);
    expect(frames[0].tokens[0].value).toBe('#a');
    expect(frames[1].tokens[0].value).toBe('#b');
    expect(frames[1].children[0].tokens[0].value).toBe('y');
  });
});
