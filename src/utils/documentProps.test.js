// @ts-check
import { describe, it, expect } from 'vitest';
import WiremarkDocument from '../domain/WiremarkDocument.js';
import {
  cleanFamily,
  isValidFamily,
  isBuiltinFamily,
  hasCoreWidthPreset,
  normalizeWidth,
  normalizeLeading,
  formatNumber,
  readFont,
  readFlow,
  readDocumentProps,
  fontTokens,
  flowTokens,
  samePropsInFile,
} from './documentProps.js';

describe('family names', () => {
  it('cleans whitespace', () => {
    expect(cleanFamily('  Patrick   Hand ')).toBe('Patrick Hand');
    expect(cleanFamily(undefined)).toBe('');
  });

  it("accepts exactly what core's family rule accepts", () => {
    expect(isValidFamily('Patrick Hand')).toBe(true);
    expect(isValidFamily('M PLUS 1p')).toBe(true);
    expect(isValidFamily('Brand_Sans-2.0')).toBe(true);
    expect(isValidFamily('')).toBe(false);
    expect(isValidFamily(' Leading')).toBe(false);
    expect(isValidFamily('Bad"Quote')).toBe(false);
    expect(isValidFamily("O'Brien")).toBe(false);
    expect(isValidFamily('x'.repeat(65))).toBe(false);
  });

  it('recognizes the built-in family and core presets case-insensitively', () => {
    expect(isBuiltinFamily('comic neue')).toBe(true);
    expect(isBuiltinFamily('Comic Sans MS')).toBe(false);
    expect(hasCoreWidthPreset('PATRICK HAND')).toBe(true);
    expect(hasCoreWidthPreset('Architects Daughter')).toBe(true);
    expect(hasCoreWidthPreset('Kalam')).toBe(false);
  });
});

describe('number normalization', () => {
  it('clamps width to 0.3..3 and rounds to 2 decimals; blank/invalid = not set', () => {
    expect(normalizeWidth('1.034')).toBe(1.03);
    expect(normalizeWidth(0.1)).toBe(0.3);
    expect(normalizeWidth('9')).toBe(3);
    expect(normalizeWidth('')).toBeNull();
    expect(normalizeWidth('abc')).toBeNull();
    expect(normalizeWidth(0)).toBeNull();
    expect(normalizeWidth(null)).toBeNull();
  });

  it('clamps leading to 0.8..4', () => {
    expect(normalizeLeading('0.5')).toBe(0.8);
    expect(normalizeLeading(5)).toBe(4);
    expect(normalizeLeading('1.25')).toBe(1.25);
  });

  it('formats without trailing zeros', () => {
    expect(formatNumber(1.1)).toBe('1.1');
    expect(formatNumber(1)).toBe('1');
    expect(formatNumber(0.876)).toBe('0.88');
  });
});

describe('reading the Font / Flow lines', () => {
  it('reads a full Font line', () => {
    const doc = WiremarkDocument.parse('Font "Kalam" width=1.03 leading=1.2\nWireframe\n');
    expect(readFont(doc.findDirective('Font'))).toEqual({ family: 'Kalam', width: 1.03, leading: 1.2 });
  });

  it('reads an unquoted family and ignores bad numbers', () => {
    const doc = WiremarkDocument.parse('Font Kalam width=wide\nWireframe\n');
    expect(readFont(doc.findDirective('Font'))).toEqual({ family: 'Kalam', width: null, leading: null });
  });

  it('treats a blank Font line or a non-Font directive as no font', () => {
    expect(readFont(WiremarkDocument.parse('Font\n').findDirective('Font'))).toBeNull();
    expect(readFont(undefined)).toBeNull();
    expect(readFont({ component: 'Flow', tokens: [] })).toBeNull();
  });

  it('reads Flow; anything but LR is the default TD', () => {
    expect(readFlow({ component: 'Flow', tokens: [{ kind: 'keyless', value: 'lr', quoted: false }] })).toBe('LR');
    expect(readFlow({ component: 'Flow', tokens: [{ kind: 'keyless', value: 'TD', quoted: false }] })).toBe('TD');
    expect(readFlow(undefined)).toBe('TD');
  });

  it('uses the first Font / Flow line, as core does', () => {
    const doc = WiremarkDocument.parse('Font "A"\nFont "B"\nFlow LR\nWireframe\n');
    expect(readDocumentProps(doc)).toEqual({ font: { family: 'A', width: null, leading: null }, flow: 'LR' });
    expect(readDocumentProps(WiremarkDocument.parse('Wireframe\n'))).toEqual({ font: null, flow: 'TD' });
    expect(readDocumentProps(null)).toEqual({ font: null, flow: 'TD' });
  });
});

describe('writing tokens', () => {
  it('writes the quoted family plus width, and leading only when not the default', () => {
    expect(fontTokens({ family: ' Kalam ', width: 1.034, leading: 1.4 })).toEqual([
      { kind: 'keyless', value: 'Kalam', quoted: true },
      { kind: 'keyed', key: 'width', value: '1.03', quoted: false },
    ]);
    expect(fontTokens({ family: 'Kalam', width: null, leading: 1.2 })).toEqual([
      { kind: 'keyless', value: 'Kalam', quoted: true },
      { kind: 'keyed', key: 'leading', value: '1.2', quoted: false },
    ]);
  });

  it('writes Flow LR', () => {
    expect(flowTokens('LR')).toEqual([{ kind: 'keyless', value: 'LR', quoted: false }]);
  });

  it('compares what two settings would write', () => {
    const a = { font: { family: 'Kalam', width: 1.03, leading: null }, flow: /** @type {'LR'} */ ('LR') };
    expect(samePropsInFile(a, { ...a, font: { family: 'Kalam', width: 1.034, leading: 1.4 } })).toBe(true);
    expect(samePropsInFile(a, { ...a, flow: 'TD' })).toBe(false);
    expect(samePropsInFile(a, { ...a, font: null })).toBe(false);
    expect(samePropsInFile({ font: null, flow: 'TD' }, { font: null, flow: 'TD' })).toBe(true);
  });
});
