// @ts-check
/**
 * useInstallPrompt -- owns the PWA install lifecycle as transient browser state
 * (NOT Redux; it is window-event state, like the menu/dialog anchors the layout
 * keeps in local `useState`). It:
 *
 *  - captures the one-shot `beforeinstallprompt` event so we can fire the native
 *    install prompt on demand (`promptInstall`),
 *  - tracks whether the app is already running installed/standalone
 *    (`isInstalled`), updating live on `appinstalled` and display-mode changes,
 *  - exposes the detected `platform` so callers can fall back to manual
 *    instructions on browsers that never fire the event (iOS Safari, Firefox,
 *    desktop Safari).
 *
 * Returns `{ canPromptNative, isInstalled, platform, promptInstall }`.
 *
 * Gotchas handled here:
 *  - `beforeinstallprompt` fires once and its event is single-use, so
 *    `promptInstall` nulls the stashed event and clears `canPromptNative` BEFORE
 *    awaiting `prompt()`.
 *  - `appinstalled` (not the prompt's `userChoice`) is the source of truth for
 *    "installed" -- the prompt can resolve "accepted" before the OS finishes.
 *  - Safe under Storybook/jsdom where there is no service worker and these events
 *    never fire; all window/navigator/matchMedia access is guarded.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { detectInstallPlatform, isStandalone } from '../utils/pwaInstall.js';

const DISPLAY_MODE_QUERY = '(display-mode: standalone)';

export default function useInstallPrompt() {
  /** @type {import('react').MutableRefObject<any>} the stashed BeforeInstallPromptEvent */
  const deferredRef = useRef(null);
  const [canPromptNative, setCanPromptNative] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => isStandalone());

  const platform = useMemo(
    () => detectInstallPlatform(typeof navigator === 'undefined' ? '' : navigator.userAgent),
    [],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    // Adopt an event captured by the early inline script in index.html (Chrome
    // can fire `beforeinstallprompt` before this component ever mounts).
    if (window.__wmDeferredInstallPrompt) {
      deferredRef.current = window.__wmDeferredInstallPrompt;
      setCanPromptNative(true);
    }

    /** @param {Event} e */
    const onBeforeInstallPrompt = (e) => {
      // Suppress Chrome's mini-infobar; stash the event to trigger on demand.
      e.preventDefault();
      deferredRef.current = e;
      window.__wmDeferredInstallPrompt = e;
      setCanPromptNative(true);
    };
    const onAppInstalled = () => {
      deferredRef.current = null;
      window.__wmDeferredInstallPrompt = null;
      setCanPromptNative(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    // Catch installs that happen in another tab, or launching the installed app.
    let mql;
    /** @param {MediaQueryListEvent} ev */
    const onDisplayModeChange = (ev) => {
      if (ev.matches) setIsInstalled(true);
    };
    if (typeof window.matchMedia === 'function') {
      mql = window.matchMedia(DISPLAY_MODE_QUERY);
      if (mql && typeof mql.addEventListener === 'function') {
        mql.addEventListener('change', onDisplayModeChange);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      if (mql && typeof mql.removeEventListener === 'function') {
        mql.removeEventListener('change', onDisplayModeChange);
      }
    };
  }, []);

  /**
   * Trigger the native install prompt if one was captured. Returns the user's
   * choice (`{ outcome: 'accepted' | 'dismissed' }`) or `{ outcome: 'unavailable' }`
   * when no fresh prompt exists -- the caller then falls back to manual
   * instructions. Does not set `isInstalled`; the `appinstalled` event does.
   * @returns {Promise<{ outcome: 'accepted'|'dismissed'|'unavailable' }>}
   */
  const promptInstall = useCallback(async () => {
    const e = deferredRef.current;
    if (!e) return { outcome: 'unavailable' };
    // The event is single-use: spend it before awaiting so it can't be reused.
    deferredRef.current = null;
    if (typeof window !== 'undefined') window.__wmDeferredInstallPrompt = null;
    setCanPromptNative(false);
    try {
      e.prompt();
      return await e.userChoice;
    } catch {
      return { outcome: 'dismissed' };
    }
  }, []);

  return { canPromptNative, isInstalled, platform, promptInstall };
}
