// @ts-check
import { describe, it, expect } from 'vitest';
import {
  isApplePlatform,
  matchPaneShortcut,
  paneShortcutLabel,
  paneShortcutAria,
} from './paneShortcuts.js';

/** Build a keydown-like object with every modifier off by default. */
function key(code, mods = {}) {
  return {
    code,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    repeat: false,
    isComposing: false,
    ...mods,
  };
}

describe('isApplePlatform', () => {
  it('detects macOS via userAgentData and legacy navigator.platform', () => {
    expect(isApplePlatform({ userAgentData: { platform: 'macOS' } })).toBe(true);
    expect(isApplePlatform({ platform: 'MacIntel' })).toBe(true);
  });

  it('detects iOS / iPadOS', () => {
    expect(isApplePlatform({ platform: 'iPhone' })).toBe(true);
    expect(isApplePlatform({ platform: 'iPad' })).toBe(true);
  });

  it('is false for Windows, Linux, and a missing navigator', () => {
    expect(isApplePlatform({ userAgentData: { platform: 'Windows' } })).toBe(false);
    expect(isApplePlatform({ platform: 'Win32' })).toBe(false);
    expect(isApplePlatform({ platform: 'Linux x86_64' })).toBe(false);
    expect(isApplePlatform({})).toBe(false);
    expect(isApplePlatform(undefined)).toBe(false);
    expect(isApplePlatform(null)).toBe(false);
  });

  it('prefers userAgentData over the legacy platform string', () => {
    expect(isApplePlatform({ userAgentData: { platform: 'Windows' }, platform: 'MacIntel' })).toBe(
      false,
    );
  });
});

describe('matchPaneShortcut (Apple)', () => {
  it('matches Cmd+Option+digit and returns the 0-based index', () => {
    expect(matchPaneShortcut(key('Digit1', { metaKey: true, altKey: true }), true, 4)).toBe(0);
    expect(matchPaneShortcut(key('Digit4', { metaKey: true, altKey: true }), true, 4)).toBe(3);
  });

  it('ignores plain Option+digit so it can type characters (e.g. # on Spanish layouts)', () => {
    expect(matchPaneShortcut(key('Digit3', { altKey: true }), true, 4)).toBe(-1);
    expect(matchPaneShortcut(key('Digit2', { altKey: true }), true, 4)).toBe(-1);
  });

  it('ignores Cmd+digit (browser tab switching) and Cmd+Shift+digit (screenshots)', () => {
    expect(matchPaneShortcut(key('Digit1', { metaKey: true }), true, 4)).toBe(-1);
    expect(matchPaneShortcut(key('Digit3', { metaKey: true, shiftKey: true }), true, 4)).toBe(-1);
  });
});

describe('matchPaneShortcut (Windows / Linux)', () => {
  it('matches Alt+digit and returns the 0-based index', () => {
    expect(matchPaneShortcut(key('Digit1', { altKey: true }), false, 4)).toBe(0);
    expect(matchPaneShortcut(key('Digit3', { altKey: true }), false, 4)).toBe(2);
  });

  it('ignores AltGr (reported as Ctrl+Alt), which types characters', () => {
    expect(matchPaneShortcut(key('Digit2', { altKey: true, ctrlKey: true }), false, 4)).toBe(-1);
  });

  it('ignores Meta+Alt (OS-reserved) and the Apple chord', () => {
    expect(matchPaneShortcut(key('Digit1', { altKey: true, metaKey: true }), false, 4)).toBe(-1);
  });
});

describe('matchPaneShortcut (shared guards)', () => {
  it('ignores digits beyond the pane count and non-digit keys', () => {
    expect(matchPaneShortcut(key('Digit5', { altKey: true }), false, 4)).toBe(-1);
    expect(matchPaneShortcut(key('Digit0', { altKey: true }), false, 4)).toBe(-1);
    expect(matchPaneShortcut(key('KeyA', { altKey: true }), false, 4)).toBe(-1);
    expect(matchPaneShortcut(key('Numpad1', { altKey: true }), false, 4)).toBe(-1);
  });

  it('ignores shift, auto-repeat, and IME composition', () => {
    expect(matchPaneShortcut(key('Digit1', { altKey: true, shiftKey: true }), false, 4)).toBe(-1);
    expect(matchPaneShortcut(key('Digit1', { altKey: true, repeat: true }), false, 4)).toBe(-1);
    expect(matchPaneShortcut(key('Digit1', { altKey: true, isComposing: true }), false, 4)).toBe(
      -1,
    );
  });

  it('ignores a digit with no modifier, and tolerates a missing event/code', () => {
    expect(matchPaneShortcut(key('Digit1'), false, 4)).toBe(-1);
    expect(matchPaneShortcut(key('Digit1'), true, 4)).toBe(-1);
    // @ts-expect-error deliberately malformed
    expect(matchPaneShortcut(undefined, false, 4)).toBe(-1);
    expect(matchPaneShortcut(key(undefined, { altKey: true }), false, 4)).toBe(-1);
  });
});

describe('labels', () => {
  it('formats the tooltip label per platform', () => {
    expect(paneShortcutLabel(0, true)).toBe('⌥⌘1');
    expect(paneShortcutLabel(3, false)).toBe('Alt+4');
  });

  it('formats aria-keyshortcuts per platform', () => {
    expect(paneShortcutAria(1, true)).toBe('Meta+Alt+2');
    expect(paneShortcutAria(1, false)).toBe('Alt+2');
  });
});
