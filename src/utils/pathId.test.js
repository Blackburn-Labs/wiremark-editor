// @ts-check
import { describe, it, expect } from 'vitest';
import { pathId, parsePathId } from './pathId.js';

describe('pathId', () => {
  it('joins a path into a dotted string', () => {
    expect(pathId([0, 2, 1])).toBe('0.2.1');
  });

  it('handles a single-segment path', () => {
    expect(pathId([3])).toBe('3');
  });

  it('handles an empty path', () => {
    expect(pathId([])).toBe('');
  });

  it('throws on non-array input', () => {
    // @ts-expect-error testing runtime guard
    expect(() => pathId('0.1')).toThrow(TypeError);
  });
});

describe('parsePathId', () => {
  it('splits a dotted string into numbers', () => {
    expect(parsePathId('0.2.1')).toEqual([0, 2, 1]);
  });

  it('parses a single segment', () => {
    expect(parsePathId('3')).toEqual([3]);
  });

  it('returns empty array for empty string', () => {
    expect(parsePathId('')).toEqual([]);
  });

  it('round-trips with pathId', () => {
    const path = [0, 10, 4, 0];
    expect(parsePathId(pathId(path))).toEqual(path);
  });

  it('throws on a non-integer segment', () => {
    expect(() => parsePathId('0.x.1')).toThrow(TypeError);
  });

  it('throws on a negative segment', () => {
    expect(() => parsePathId('0.-1')).toThrow(TypeError);
  });

  it('throws on non-string input', () => {
    // @ts-expect-error testing runtime guard
    expect(() => parsePathId(['0', '1'])).toThrow(TypeError);
  });
});
