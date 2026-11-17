// @ts-check
import { describe, it, expect } from 'vitest';
import { widthFromRatios, labelRatios, MEASURE_SIZE, BASELINE_SCALE } from './fontMeasure.js';
import labels from '../data/measureLabels.json';

describe('widthFromRatios', () => {
  it('takes the 99th percentile and rounds UP to 2 decimals', () => {
    const ratios = Array.from({ length: 100 }, (_, i) => 0.8 + i * 0.001); // 0.800 .. 0.899
    expect(widthFromRatios(ratios)).toBe(0.9); // p99 = 0.899 -> 0.90
    expect(widthFromRatios([1.0300000001])).toBe(1.03);
    expect(widthFromRatios([1.031])).toBe(1.04);
  });

  it("clamps to core's 0.3..3 range and ignores junk", () => {
    expect(widthFromRatios([0.05])).toBe(0.3);
    expect(widthFromRatios([7])).toBe(3);
    expect(widthFromRatios([NaN, -1, 0])).toBeNull();
    expect(widthFromRatios([])).toBeNull();
  });
});

describe('labelRatios', () => {
  it('divides the candidate width by the baseline width per label, skipping blanks', () => {
    const r = labelRatios(['ab', '', 'abcd'], (t) => t.length * 9, (t) => t.length * 10);
    expect(r).toEqual([0.9, 0.9]);
  });

  it('a font identical to the baseline at 110% measures exactly 1', () => {
    const glyph = 7;
    const candidate = (/** @type {string} */ t) => t.length * glyph * BASELINE_SCALE * MEASURE_SIZE;
    const baseline = (/** @type {string} */ t) => t.length * glyph * MEASURE_SIZE * BASELINE_SCALE;
    expect(widthFromRatios(labelRatios(labels, candidate, baseline))).toBe(1);
  });
});

describe('the label corpus', () => {
  it('has a few hundred non-empty labels', () => {
    expect(labels.length).toBeGreaterThan(200);
    expect(labels.every((l) => typeof l === 'string' && l.trim() !== '')).toBe(true);
  });
});
