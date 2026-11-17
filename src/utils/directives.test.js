// @ts-check
import { describe, it, expect } from 'vitest';
import { parse } from './wmParser.js';
import { serialize } from './wmSerializer.js';
import WiremarkDocument from '../domain/WiremarkDocument.js';
import { buildLineIndex } from './lineIndex.js';
import { analyzeCompletion } from './completionContext.js';
import { safeRender } from './wmRender.js';
import {
  DOCUMENT_ID,
  DIRECTIVE_NAMES,
  isDirectiveName,
  isDocumentDirective,
  isDocumentId,
} from './directives.js';

const WITH_FONT = 'Font "Patrick Hand" width=0.8\nFlow LR\n\nWireframe #a mobile\n  Button "Go" to=#b\nWireframe #b mobile\n  Typography "B"\n';

describe('directive names', () => {
  it('knows Font, Flow and Icons; only Font and Flow are Document properties', () => {
    expect(DIRECTIVE_NAMES).toEqual(['Font', 'Flow', 'Icons']);
    expect(isDirectiveName('Font')).toBe(true);
    expect(isDirectiveName('Icons')).toBe(true);
    expect(isDirectiveName('Wireframe')).toBe(false);
    expect(isDirectiveName(undefined)).toBe(false);
    expect(isDocumentDirective('Flow')).toBe(true);
    expect(isDocumentDirective('Icons')).toBe(false);
    expect(isDocumentId(DOCUMENT_ID)).toBe(true);
    expect(isDocumentId('0')).toBe(false);
  });
});

describe('wmParser -- directives are not frames', () => {
  it('splits top-level Font/Flow out of frames, recording how many frames precede each', () => {
    const { frames, directives, diagnostics } = parse(WITH_FONT);
    expect(diagnostics).toEqual([]);
    expect(frames.map((f) => f.component)).toEqual(['Wireframe', 'Wireframe']);
    expect(directives.map((d) => [d.component, d.before, d.line])).toEqual([
      ['Font', 0, 1],
      ['Flow', 0, 2],
    ]);
    expect(directives[0].tokens).toEqual([
      { kind: 'keyless', value: 'Patrick Hand', quoted: true },
      { kind: 'keyed', key: 'width', value: '0.8', quoted: false },
    ]);
  });

  it('records the position of a directive between or after frames', () => {
    const { directives } = parse('Wireframe #a\nFlow LR\nWireframe #b\nFont "X"\n');
    expect(directives.map((d) => [d.component, d.before])).toEqual([['Flow', 1], ['Font', 2]]);
  });

  it('keeps Icons rows as directive children without component diagnostics', () => {
    const src = 'Icons\n  logo "M12 2 2 22h20z"\n  brand "M4 4h24v24H4z" viewBox=32\n\nWireframe #home\n  Icon logo\n';
    const { frames, directives, diagnostics } = parse(src);
    expect(diagnostics).toEqual([]);
    expect(frames).toHaveLength(1);
    expect(directives[0].component).toBe('Icons');
    expect(directives[0].children).toHaveLength(2);
  });

  it('still flags a non-component row outside a directive', () => {
    expect(parse('Wireframe\n  logo "x"\n').diagnostics).toHaveLength(1);
  });

  it('treats a nested Font line as an ordinary (unknown) element, as core does', () => {
    const { frames, directives } = parse('Wireframe\n  Font "X"\n');
    expect(directives).toEqual([]);
    expect(frames[0].children[0].component).toBe('Font');
  });
});

describe('wmSerializer -- directives round-trip in place', () => {
  it.each([
    ['top of file', WITH_FONT],
    ['between and after frames', 'Wireframe #a\n\n// note\nFlow LR\nWireframe #b\nFont "X" leading=1.2 // mine\n'],
    ['icons block', 'Icons\n  logo "M12 2 2 22h20z"\n\nWireframe #home\n  Icon logo\n'],
  ])('%s', (_name, src) => {
    expect(serialize(parse(src))).toBe(src);
  });

  it('puts a directive with a missing or oversized `before` at the top / end', () => {
    const frames = parse('Wireframe #a\n').frames;
    const font = { component: 'Font', tokens: [{ kind: 'keyless', value: 'X', quoted: true }], comment: null, leadingTrivia: [], children: [] };
    expect(serialize({ frames, directives: [font] })).toBe('Font "X"\nWireframe #a\n');
    expect(serialize({ frames, directives: [{ ...font, before: 9 }] })).toBe('Wireframe #a\nFont "X"\n');
  });
});

describe('WiremarkDocument -- directives', () => {
  it('keeps frame path ids stable whether or not a Font line is present', () => {
    const plain = WiremarkDocument.parse('Wireframe #a\n  Button "Go"\n');
    const withFont = WiremarkDocument.parse('Font "X"\n\nWireframe #a\n  Button "Go"\n');
    expect(withFont.frames.toJSON().map((f) => f.id)).toEqual(plain.frames.toJSON().map((f) => f.id));
    expect(withFont.findById('0.0')?.component).toBe('Button');
  });

  it('exposes the Document directives and round-trips through JSON + serialize', () => {
    const doc = WiremarkDocument.parse(WITH_FONT);
    expect(doc.hasDocumentProperties()).toBe(true);
    expect(doc.documentDirectives().map((d) => d.component)).toEqual(['Font', 'Flow']);
    expect(doc.findDirective('Font')?.firstValue()).toBe('Patrick Hand');
    expect(doc.findDirective('Font')?.keyedValue('width')).toBe('0.8');
    expect(doc.findDirective('Font')?.id).toBeNull();
    expect(new WiremarkDocument(doc.toJSON()).serialize()).toBe(WITH_FONT);
    expect(doc.serialize()).toBe(WITH_FONT);
  });

  it('an Icons block alone does not make Document properties', () => {
    const doc = WiremarkDocument.parse('Icons\n  logo "M1 1"\nWireframe\n');
    expect(doc.hasDocumentProperties()).toBe(false);
  });
});

describe('buildLineIndex -- the Document row', () => {
  it('maps every Font/Flow line to the Document id, and the id to the first one', () => {
    const { idToLine, lineToId } = buildLineIndex(WiremarkDocument.parse(WITH_FONT));
    expect(lineToId[1]).toBe(DOCUMENT_ID);
    expect(lineToId[2]).toBe(DOCUMENT_ID);
    expect(idToLine[DOCUMENT_ID]).toBe(1);
    expect(lineToId[4]).toBe('0');
    expect(lineToId[5]).toBe('0.0');
  });

  it('maps Icons lines to nothing', () => {
    const { idToLine, lineToId } = buildLineIndex(WiremarkDocument.parse('Icons\n  logo "M1 1"\nWireframe\n'));
    expect(lineToId[1]).toBeUndefined();
    expect(lineToId[2]).toBeUndefined();
    expect(idToLine[DOCUMENT_ID]).toBeUndefined();
    expect(lineToId[3]).toBe('0');
  });
});

describe('analyzeCompletion -- directives', () => {
  it('offers Font/Flow/Icons only at an unindented line start', () => {
    const top = analyzeCompletion({ lineText: 'Fo', columnInLine: 2 });
    expect(top.kind).toBe('component');
    expect(top.options).toEqual(expect.arrayContaining(['Font', 'Flow', 'Icons', 'Wireframe']));
    const nested = analyzeCompletion({ lineText: '  Fo', columnInLine: 4 });
    expect(nested.options).not.toContain('Font');
  });

  it('suggests LR / TD after a top-level Flow', () => {
    const r = analyzeCompletion({ lineText: 'Flow L', columnInLine: 6 });
    expect(r.kind).toBe('keyless');
    expect(r.token).toBe('L');
    expect(r.options).toEqual(['TD', 'LR']);
  });
});

describe('core 0.2.0 accepts what the editor writes', () => {
  it('renders a document with Font + Flow lines without a hard error', () => {
    const { error, svg } = safeRender(WITH_FONT, 'light');
    expect(error).toBeNull();
    expect(svg).toContain("'Patrick Hand'");
  });

  it('embeds the built-in Comic Neue only when there is no custom font', () => {
    const builtin = safeRender('Wireframe\n  Typography "Hi"\n', 'light').svg;
    expect(builtin).toContain("@font-face{font-family:'wiremark-sketch'");
    const custom = safeRender('Font "Kalam"\nWireframe\n  Typography "Hi"\n', 'light').svg;
    expect(custom).not.toContain("@font-face{font-family:'wiremark-sketch'");
  });
});
