// @ts-check
import { describe, it, expect } from 'vitest';
import WiremarkDocument from '../domain/WiremarkDocument.js';
import { buildLineIndex } from './lineIndex.js';

describe('buildLineIndex', () => {
  it('maps every element id to its 1-based source line and back', () => {
    const src = 'Wireframe #home\n  AppBar\n    Typography h6 "Title"\n  Button "Go"\n';
    const doc = WiremarkDocument.parse(src);
    const { idToLine, lineToId } = buildLineIndex(doc);

    // Frame on line 1, AppBar line 2, Typography line 3, Button line 4.
    expect(idToLine['0']).toBe(1);
    expect(idToLine['0.0']).toBe(2);
    expect(idToLine['0.0.0']).toBe(3);
    expect(idToLine['0.1']).toBe(4);

    expect(lineToId[1]).toBe('0');
    expect(lineToId[2]).toBe('0.0');
    expect(lineToId[3]).toBe('0.0.0');
    expect(lineToId[4]).toBe('0.1');
  });

  it('accounts for blank/comment trivia lines (line numbers track the source)', () => {
    const src = 'Wireframe #home\n\n  // a note\n  Button "Go"\n';
    const doc = WiremarkDocument.parse(src);
    const { idToLine } = buildLineIndex(doc);
    expect(idToLine['0']).toBe(1);
    // Button is on source line 4 (line 2 blank, line 3 comment are trivia).
    expect(idToLine['0.0']).toBe(4);
  });

  it('returns empty maps for an empty document', () => {
    const doc = WiremarkDocument.parse('');
    expect(buildLineIndex(doc)).toEqual({ idToLine: {}, lineToId: {} });
  });
});
