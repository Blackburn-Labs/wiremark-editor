// @ts-check
import { describe, it, expect } from 'vitest';
import WiremarkDocument from './WiremarkDocument.js';
import WiremarkElement from './WiremarkElement.js';

describe('WiremarkDocument.parse - ids', () => {
  it('assigns frame-index path ids to top-level frames', () => {
    const doc = WiremarkDocument.parse('Wireframe #a\nWireframe #b\n');
    expect(doc.frames[0].id).toBe('0');
    expect(doc.frames[1].id).toBe('1');
  });

  it('assigns depth-first path ids to descendants', () => {
    const doc = WiremarkDocument.parse('Wireframe\n  Stack\n    Button "A"\n    Button "B"\n');
    expect(doc.frames[0].id).toBe('0');
    expect(doc.frames[0].children[0].id).toBe('0.0');
    expect(doc.frames[0].children[0].children[0].id).toBe('0.0.0');
    expect(doc.frames[0].children[0].children[1].id).toBe('0.0.1');
  });

  it('never throws on malformed input', () => {
    expect(() => WiremarkDocument.parse('not a component\n\t\tweird')).not.toThrow();
  });

  it('keeps diagnostics on the document', () => {
    const doc = WiremarkDocument.parse('Wireframe\n\tButton "x"\n');
    expect(doc.diagnostics).toEqual([
      { line: 2, severity: 'warning', message: 'tabs normalized to spaces' },
    ]);
  });
});

describe('WiremarkDocument - findById / findPath', () => {
  const doc = WiremarkDocument.parse('Wireframe\n  Stack\n    Button "A"\n  Button "B"\n');

  it('findById returns the element with the matching id', () => {
    const el = doc.findById('0.0.0');
    expect(el).toBeInstanceOf(WiremarkElement);
    expect(el?.component).toBe('Button');
    expect(el?.tokens[0].value).toBe('A');
  });

  it('findById returns undefined for an unknown id', () => {
    expect(doc.findById('9.9')).toBeUndefined();
  });

  it('findPath returns the root..node chain', () => {
    const path = doc.findPath('0.0.0');
    expect(path?.map((e) => e.id)).toEqual(['0', '0.0', '0.0.0']);
  });

  it('findPath returns null for an unknown id', () => {
    expect(doc.findPath('5')).toBe(null);
  });
});

describe('WiremarkDocument - serialize round-trip', () => {
  it('serialize() reproduces normalized source', () => {
    const src = 'Wireframe #home\n  Stack column gap=2\n    Button "OK" contained\n';
    const doc = WiremarkDocument.parse(src);
    expect(doc.serialize()).toBe(src);
  });

  it('parse(serialize()) is structurally stable', () => {
    const src = 'Wireframe\n  Box 240px * dotted #editor\n';
    const doc = WiremarkDocument.parse(src);
    const reparsed = WiremarkDocument.parse(doc.serialize());
    expect(reparsed.frames.toJSON()).toEqual(doc.frames.toJSON());
  });
});
