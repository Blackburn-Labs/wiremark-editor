// @ts-check
/**
 * Pane-toggle keyboard shortcuts (the toolbar's "toggle pane N" chords).
 *
 * The chord is platform-specific on purpose:
 *   - macOS / iOS:     Cmd+Option+N   (shown as "⌥⌘N")
 *   - everything else: Alt+N
 *
 * Plain Option+digit can NOT be used on a Mac: Option is the macOS "type a
 * special character" modifier, and on many layouts Option+digit is how common
 * characters are typed (Spanish: Option+3 = `#`, Option+2 = `@`, Option+1 = `|`;
 * Swedish/Finnish/Norwegian: Option+2 = `@`, Option+4 = `$`). Hijacking it would
 * make `to=#id` impossible to type in the editor. Cmd+Option never produces a
 * character, and is the same pairing Google Docs uses (Ctrl+Alt+N / Cmd+Option+N).
 *
 * On Windows we deliberately reject Ctrl+Alt: browsers report AltGr as
 * Ctrl+Alt, and AltGr+digit types characters on many layouts (German, Polish...).
 *
 * Matching uses `event.code` (the physical key) so the chord works regardless of
 * keyboard layout or what character the modifier combo would have produced.
 *
 * Pure: no React/DOM globals are read here; callers pass the navigator/event.
 */

/**
 * Whether the platform is an Apple one (macOS, or iPadOS/iOS with a hardware
 * keyboard), i.e. whether the primary modifier is Cmd.
 * @param {{ userAgentData?: { platform?: string }, platform?: string } | undefined | null} nav
 *   typically `globalThis.navigator`; may be absent (SSR/tests).
 * @returns {boolean}
 */
export function isApplePlatform(nav) {
  if (!nav) return false;
  const platform = nav.userAgentData?.platform || nav.platform || '';
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/**
 * Match a keydown against the pane-toggle chord.
 * @param {Pick<KeyboardEvent, 'code'|'altKey'|'ctrlKey'|'metaKey'|'shiftKey'|'repeat'|'isComposing'>} event
 * @param {boolean} isApple result of `isApplePlatform`
 * @param {number} count number of panes (digits 1..count are live; max 9)
 * @returns {number} 0-based pane index, or -1 when the event is not a pane chord
 */
export function matchPaneShortcut(event, isApple, count) {
  if (!event || event.repeat || event.isComposing || event.shiftKey) return -1;
  if (!event.altKey || event.ctrlKey) return -1;
  // Apple: Cmd is required (Option alone types characters). Others: Meta must
  // be absent (Win+Alt / Super+Alt belong to the OS).
  if (isApple ? !event.metaKey : event.metaKey) return -1;
  const m = /^Digit([1-9])$/.exec(event.code || '');
  if (!m) return -1;
  const index = Number(m[1]) - 1;
  return index < count ? index : -1;
}

/**
 * Human-readable label for the chord, for tooltips.
 * @param {number} index 0-based pane index
 * @param {boolean} isApple
 * @returns {string} e.g. "⌥⌘1" or "Alt+1"
 */
export function paneShortcutLabel(index, isApple) {
  const digit = index + 1;
  return isApple ? `⌥⌘${digit}` : `Alt+${digit}`;
}

/**
 * Value for the `aria-keyshortcuts` attribute (uses the spec's modifier names).
 * @param {number} index 0-based pane index
 * @param {boolean} isApple
 * @returns {string} e.g. "Meta+Alt+1" or "Alt+1"
 */
export function paneShortcutAria(index, isApple) {
  const digit = index + 1;
  return isApple ? `Meta+Alt+${digit}` : `Alt+${digit}`;
}
