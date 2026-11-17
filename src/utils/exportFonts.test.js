// @ts-check
import { describe, it, expect } from 'vitest';
import { hasBoldText, renderForExport } from './exportFonts.js';
import { safeRender } from './wmRender.js';

describe('hasBoldText', () => {
  it('detects text at weight 600+', () => {
    expect(hasBoldText('<text font-weight="400">a</text><text font-weight="600">b</text>')).toBe(true);
    expect(hasBoldText('<text font-weight="bold">a</text>')).toBe(true);
    expect(hasBoldText('<text font-weight="400">a</text>')).toBe(false);
    expect(hasBoldText(undefined)).toBe(false);
  });

  it('matches what core draws for a heading', () => {
    const svg = safeRender('Wireframe\n  Typography h4 "Title"\n', 'light').svg;
    expect(hasBoldText(svg)).toBe(true);
  });
});

describe('renderForExport (no network)', () => {
  it('passes the default-font document straight through', async () => {
    const src = 'Wireframe\n  Typography "Hi"\n';
    const { svg, notice } = await renderForExport(src, { fontSource: 'bunny' });
    expect(svg).toBe(safeRender(src, 'light').svg);
    expect(notice).toBeNull();
  });

  it('leaves an installed (non-catalog) font referenced by name, with no notice', async () => {
    const { svg, notice } = await renderForExport('Font "Brand Sans"\nWireframe\n  Typography "Hi"\n', { fontSource: 'bunny' });
    expect(svg).toContain("'Brand Sans'");
    expect(notice).toBeNull();
  });

  it('exports an online font without downloading when online fonts are off, and says so', async () => {
    const { svg, notice } = await renderForExport('Font "Kalam"\nWireframe\n  Typography "Hi"\n', { fontSource: null });
    expect(svg).toContain("'Kalam'");
    expect(notice).toMatch(/without Kalam/);
  });
});
