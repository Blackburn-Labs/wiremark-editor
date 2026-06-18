// @ts-check
/**
 * pwaInstall -- pure, side-effect-free helpers backing the in-app PWA install
 * experience. No React, no event listeners, no DOM mutation: just UA-string and
 * environment inspection so they can be unit-tested in isolation (the stateful
 * lifecycle lives in `hooks/useInstallPrompt`, the UI in the layout components).
 */

/** @typedef {'chromium'|'ios-safari'|'ios-other'|'safari-desktop'|'firefox'|'unknown'} InstallPlatform */

/**
 * Classify the browser/platform from a user-agent string into a stable key the
 * install UI switches on. Only Chromium-family browsers fire
 * `beforeinstallprompt` (one-click install); the rest need manual "add to home
 * screen" / "add to dock" instructions, which is what the other keys drive.
 *
 * Pure: takes the UA string only and never throws. Note the iPadOS caveat --
 * modern iPads report a desktop-Mac UA (`Macintosh`), so a UA-only check cannot
 * always tell an iPad from a real Mac; such an iPad is classified as
 * `safari-desktop` (its "Add to Dock" instruction is close enough, and the
 * native prompt path is unaffected since Safari never fires it anyway).
 *
 * @param {string} [userAgent]
 * @returns {InstallPlatform}
 */
export function detectInstallPlatform(userAgent) {
  const ua = String(userAgent || '');

  // iOS (iPhone/iPod, and iPads that still report the legacy mobile UA).
  if (/iPad|iPhone|iPod/.test(ua)) {
    // Every iOS browser is WebKit underneath and uses the same Share -> Add to
    // Home Screen flow, but only Safari can actually perform it -- so split the
    // copy: dedicated Safari vs. "open in Safari first" for the rest.
    if (/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(ua)) return 'ios-other';
    return 'ios-safari';
  }

  // Chromium family (Chrome, Edge, Chromium, Samsung Internet, Brave, ...). Edge
  // and Chrome both carry "Chrome/"; checking it first avoids the Safari token
  // they also include from matching the desktop-Safari branch below.
  if (/Edg\/|Chrome\/|Chromium\//.test(ua)) return 'chromium';

  if (/Firefox\//.test(ua)) return 'firefox';

  // Real desktop Safari carries "Safari/" but none of the Chromium/iOS tokens.
  if (/Safari\//.test(ua)) return 'safari-desktop';

  return 'unknown';
}

/**
 * Whether the app is currently running as an installed/standalone PWA (so the
 * install affordance should be hidden). Checks the `display-mode` media queries
 * and the legacy iOS `navigator.standalone` flag.
 *
 * Guarded so it is safe under any environment (jsdom/Storybook may lack a real
 * `matchMedia` or `navigator`). Accepts an explicit `win` for testing; pass a
 * falsy non-`undefined` value (e.g. `null`) to exercise the no-window guard
 * without the default kicking in.
 *
 * @param {Window | { matchMedia?: Function, navigator?: any } | null | undefined} [win]
 * @returns {boolean}
 */
export function isStandalone(win = typeof window === 'undefined' ? undefined : window) {
  if (!win) return false;

  if (typeof win.matchMedia === 'function') {
    try {
      if (win.matchMedia('(display-mode: standalone)')?.matches) return true;
      if (win.matchMedia('(display-mode: window-controls-overlay)')?.matches) return true;
    } catch {
      // Some engines throw on an unsupported media feature; treat as "not standalone".
    }
  }

  // iOS Safari exposes this non-standard flag instead of supporting display-mode.
  if (win.navigator && win.navigator.standalone === true) return true;

  return false;
}

/**
 * Whether we can HONESTLY offer an install affordance. Per the documented
 * pattern (web.dev / MDN), install UI must only appear when there is a real
 * install path -- never a guessed one:
 *
 *  - a native prompt was captured (`beforeinstallprompt` fired on a Chromium
 *    browser that meets the install criteria), OR
 *  - the browser is iOS Safari / another iOS browser, where the reliable manual
 *    "Add to Home Screen" (or "open in Safari") flow always exists.
 *
 * It deliberately returns false for Chromium WITHOUT a captured prompt (the
 * address-bar install icon and menu item genuinely are not present then),
 * desktop Safari, Firefox, and unknown browsers -- we don't point users at UI
 * that may not exist.
 *
 * @param {{ isInstalled?: boolean, canPromptNative?: boolean, platform?: string }} args
 * @returns {boolean}
 */
export function canOfferInstall({ isInstalled, canPromptNative, platform } = {}) {
  if (isInstalled) return false;
  if (canPromptNative) return true;
  return platform === 'ios-safari' || platform === 'ios-other';
}
