// @ts-check
import { describe, it, expect, beforeEach } from 'vitest';
import { safeRender, resetLastGoodSvg, getLastGoodSvg } from './wmRender.js';

const VALID = 'Wireframe #x mobile\n  Button "Hi"';
const INVALID = 'Wireframe #x\n  Blarg';

describe('safeRender', () => {
  beforeEach(() => {
    resetLastGoodSvg();
  });

  it('renders a valid document and returns svg with no error', () => {
    const result = safeRender(VALID, 'light');
    expect(result.error).toBeNull();
    expect(result.svg).toContain('<svg');
    expect(Array.isArray(result.diagnostics)).toBe(true);
    // valid sample renders without hard errors
    expect(result.diagnostics.every((d) => d.severity !== 'error')).toBe(true);
  });

  it('does NOT throw on an invalid document and surfaces the error line', () => {
    expect(() => safeRender(INVALID, 'light')).not.toThrow();
    const result = safeRender(INVALID, 'light');
    expect(result.error).not.toBeNull();
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].severity).toBe('error');
    expect(result.diagnostics[0].line).toBe(2);
    expect(result.diagnostics[0].message).toMatch(/Blarg|unknown component/i);
  });

  it('keeps the module-level last-good svg and returns it on a later error', () => {
    const good = safeRender(VALID, 'light');
    expect(good.svg).toContain('<svg');
    expect(getLastGoodSvg()).toBe(good.svg);

    const bad = safeRender(INVALID, 'light');
    expect(bad.error).not.toBeNull();
    // degrades to the last good svg rather than blanking
    expect(bad.svg).toBe(good.svg);
  });

  it('returns empty svg on error when there is no prior good render', () => {
    const bad = safeRender(INVALID, 'light');
    expect(bad.error).not.toBeNull();
    expect(bad.svg).toBe('');
  });

  it('defaults theme to light when omitted', () => {
    const result = safeRender(VALID);
    expect(result.error).toBeNull();
    expect(result.svg).toContain('<svg');
  });

  it('supports the dark theme', () => {
    const result = safeRender(VALID, 'dark');
    expect(result.error).toBeNull();
    expect(result.svg).toContain('<svg');
  });

  it('emits data-wm-line handles only when interactive is requested', () => {
    const plain = safeRender(VALID, 'light');
    expect(plain.svg).not.toContain('data-wm-line');

    const interactive = safeRender(VALID, 'light', { interactive: true });
    expect(interactive.error).toBeNull();
    expect(interactive.svg).toContain('data-wm-line');
    expect(interactive.svg).toContain('data-wm-component');
  });

  it('keeps plain and interactive last-good caches separate', () => {
    const plainGood = safeRender(VALID, 'light');
    const interactiveGood = safeRender(VALID, 'light', { interactive: true });
    expect(getLastGoodSvg()).toBe(plainGood.svg);
    expect(getLastGoodSvg(true)).toBe(interactiveGood.svg);
    expect(plainGood.svg).not.toBe(interactiveGood.svg);

    // A failing interactive render falls back to the interactive cache (handles
    // intact), not the plain one -- and vice versa.
    const interactiveBad = safeRender(INVALID, 'light', { interactive: true });
    expect(interactiveBad.error).not.toBeNull();
    expect(interactiveBad.svg).toBe(interactiveGood.svg);
    expect(interactiveBad.svg).toContain('data-wm-line');

    const plainBad = safeRender(INVALID, 'light');
    expect(plainBad.svg).toBe(plainGood.svg);
    expect(plainBad.svg).not.toContain('data-wm-line');
  });
});
