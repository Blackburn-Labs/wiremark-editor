// @ts-check
import { describe, it, expect } from 'vitest';
import { detectInstallPlatform, isStandalone, canOfferInstall } from './pwaInstall.js';

// Representative real-world user-agent strings.
const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1',
  iphoneFirefox:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/121.0 Mobile/15E148 Safari/604.1',
  chromeDesktop:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  edgeDesktop:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  firefoxDesktop:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  safariDesktop:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  samsungInternet:
    'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
};

describe('detectInstallPlatform', () => {
  it('classifies iOS Safari as the install-capable iOS browser', () => {
    expect(detectInstallPlatform(UA.iphoneSafari)).toBe('ios-safari');
  });

  it('classifies non-Safari iOS browsers as ios-other', () => {
    expect(detectInstallPlatform(UA.iphoneChrome)).toBe('ios-other');
    expect(detectInstallPlatform(UA.iphoneFirefox)).toBe('ios-other');
  });

  it('classifies Chromium-family desktop browsers (Chrome, Edge) as chromium', () => {
    expect(detectInstallPlatform(UA.chromeDesktop)).toBe('chromium');
    expect(detectInstallPlatform(UA.edgeDesktop)).toBe('chromium');
  });

  it('classifies Chromium-based Android browsers as chromium', () => {
    expect(detectInstallPlatform(UA.samsungInternet)).toBe('chromium');
  });

  it('classifies desktop Firefox as firefox', () => {
    expect(detectInstallPlatform(UA.firefoxDesktop)).toBe('firefox');
  });

  it('classifies desktop Safari as safari-desktop (not chromium)', () => {
    expect(detectInstallPlatform(UA.safariDesktop)).toBe('safari-desktop');
  });

  it('returns unknown for empty/garbage/missing input and never throws', () => {
    expect(detectInstallPlatform('')).toBe('unknown');
    expect(detectInstallPlatform(undefined)).toBe('unknown');
    expect(detectInstallPlatform('totally not a browser')).toBe('unknown');
  });

  it('is deterministic for the same input', () => {
    expect(detectInstallPlatform(UA.chromeDesktop)).toBe(
      detectInstallPlatform(UA.chromeDesktop),
    );
  });
});

describe('isStandalone', () => {
  it('returns true when display-mode: standalone matches', () => {
    const win = { matchMedia: (q) => ({ matches: q.includes('standalone') }) };
    expect(isStandalone(win)).toBe(true);
  });

  it('returns true when display-mode: window-controls-overlay matches', () => {
    const win = {
      matchMedia: (q) => ({ matches: q.includes('window-controls-overlay') }),
    };
    expect(isStandalone(win)).toBe(true);
  });

  it('returns true for the iOS navigator.standalone flag', () => {
    const win = {
      matchMedia: () => ({ matches: false }),
      navigator: { standalone: true },
    };
    expect(isStandalone(win)).toBe(true);
  });

  it('falls back to navigator.standalone when matchMedia is absent', () => {
    expect(isStandalone({ navigator: { standalone: true } })).toBe(true);
  });

  it('returns false in a normal browser tab', () => {
    const win = { matchMedia: () => ({ matches: false }), navigator: {} };
    expect(isStandalone(win)).toBe(false);
  });

  it('returns false (no throw) when no window is available', () => {
    // Pass null (not undefined) so the default param does not resolve to the
    // jsdom window, exercising the guard.
    expect(isStandalone(null)).toBe(false);
  });

  it('does not throw when matchMedia throws on an unsupported query', () => {
    const win = {
      matchMedia: () => {
        throw new Error('unsupported media feature');
      },
      navigator: {},
    };
    expect(isStandalone(win)).toBe(false);
  });
});

describe('canOfferInstall', () => {
  it('offers install when a native prompt was captured (any platform)', () => {
    expect(canOfferInstall({ canPromptNative: true, platform: 'chromium' })).toBe(true);
    expect(canOfferInstall({ canPromptNative: true, platform: 'unknown' })).toBe(true);
  });

  it('offers install on iOS browsers (reliable Add to Home Screen path)', () => {
    expect(canOfferInstall({ canPromptNative: false, platform: 'ios-safari' })).toBe(true);
    expect(canOfferInstall({ canPromptNative: false, platform: 'ios-other' })).toBe(true);
  });

  it('does NOT offer install on Chromium without a captured prompt', () => {
    // No address-bar icon / menu item exists in this state -- offering it would lie.
    expect(canOfferInstall({ canPromptNative: false, platform: 'chromium' })).toBe(false);
  });

  it('does NOT offer install on desktop Safari, Firefox, or unknown', () => {
    expect(canOfferInstall({ canPromptNative: false, platform: 'safari-desktop' })).toBe(false);
    expect(canOfferInstall({ canPromptNative: false, platform: 'firefox' })).toBe(false);
    expect(canOfferInstall({ canPromptNative: false, platform: 'unknown' })).toBe(false);
  });

  it('never offers install when already installed, even with a prompt', () => {
    expect(canOfferInstall({ isInstalled: true, canPromptNative: true, platform: 'chromium' })).toBe(false);
    expect(canOfferInstall({ isInstalled: true, platform: 'ios-safari' })).toBe(false);
  });

  it('returns false for empty/missing args without throwing', () => {
    expect(canOfferInstall()).toBe(false);
    expect(canOfferInstall({})).toBe(false);
  });
});
