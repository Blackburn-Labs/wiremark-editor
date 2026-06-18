// @ts-check
import { describe, it, expect } from 'vitest';
import iconNamesDefault, { iconNames, ICON_NAMES } from './iconNames.js';

describe('iconNames', () => {
  it('exports a non-trivial curated array of icon names', () => {
    expect(Array.isArray(iconNames)).toBe(true);
    // A few hundred common names; assert a generous lower bound.
    expect(iconNames.length).toBeGreaterThanOrEqual(150);
    expect(iconNames.length).toBeLessThanOrEqual(600);
  });

  it('default export equals the named iconNames export', () => {
    expect(iconNamesDefault).toBe(iconNames);
  });

  it('contains the well-known names the contract calls out', () => {
    const expected = [
      'Search', 'Home', 'Settings', 'Delete', 'Add', 'Edit', 'Save', 'Close',
      'Menu', 'ChevronRight', 'ArrowUpward', 'ArrowDownward', 'FirstPage',
      'LastPage', 'LightMode', 'DarkMode', 'Undo', 'Redo', 'Article',
      'ViewAgenda', 'Dashboard', 'OpenInNew',
    ];
    for (const name of expected) {
      expect(iconNames).toContain(name);
    }
  });

  it('is de-duplicated (no repeated names)', () => {
    expect(new Set(iconNames).size).toBe(iconNames.length);
  });

  it('every entry is a non-empty PascalCase string', () => {
    for (const name of iconNames) {
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
      expect(name).toMatch(/^[A-Z][A-Za-z0-9]*$/);
    }
  });

  it('the deduped list is frozen (immutable)', () => {
    expect(Object.isFrozen(iconNames)).toBe(true);
  });

  it('the raw ICON_NAMES source is also exported and frozen', () => {
    expect(Object.isFrozen(ICON_NAMES)).toBe(true);
    expect(ICON_NAMES.length).toBeGreaterThanOrEqual(iconNames.length);
  });
});
