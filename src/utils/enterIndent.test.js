// @ts-check
import { describe, it, expect } from 'vitest';
import { enterIndent } from './enterIndent.js';

describe('enterIndent', () => {
  describe('caret at end of line (atEnd = true)', () => {
    it('indents one level deeper after a container element (child)', () => {
      // Card is a container -> a 0-indent line yields a 2-space child line.
      expect(enterIndent('Card', true)).toBe('  ');
    });

    it('keeps the container deepening relative to the current indent', () => {
      // A 2-space container line yields a 4-space child line.
      expect(enterIndent('  Card #main', true)).toBe('    ');
    });

    it('keeps the same indent after a leaf element (sibling)', () => {
      // Button is not a container -> same indent.
      expect(enterIndent('  Button "Hi"', true)).toBe('  ');
      expect(enterIndent('Button "Hi"', true)).toBe('');
    });

    it('treats an unknown/half-typed component as a non-container', () => {
      // "Ca" is PascalCase but not a real component -> no deepening.
      expect(enterIndent('  Ca', true)).toBe('  ');
    });

    it('keeps the same indent on a blank or comment line', () => {
      expect(enterIndent('  ', true)).toBe('  ');
      expect(enterIndent('  // a note', true)).toBe('  ');
    });

    it('keeps the same indent on a non-component (quoted/lowercase) line', () => {
      expect(enterIndent('  "just text"', true)).toBe('  ');
      expect(enterIndent('  text', true)).toBe('  ');
    });
  });

  describe('caret not at end of line (atEnd = false)', () => {
    it('always maintains the current indent, even on a container', () => {
      // Splitting mid-line never deepens, regardless of container-ness.
      expect(enterIndent('Card', false)).toBe('');
      expect(enterIndent('  Card #main', false)).toBe('  ');
      expect(enterIndent('  Button "Hi"', false)).toBe('  ');
    });
  });

  it('normalizes a leading tab to one indent level (2 cols)', () => {
    // measureIndent counts a tab as INDENT_WIDTH columns; Button is a leaf.
    expect(enterIndent('\tButton "Hi"', true)).toBe('  ');
  });
});
