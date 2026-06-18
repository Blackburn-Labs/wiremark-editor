// @ts-check
import { afterEach, describe, expect, it, vi } from 'vitest';
import { aptabaseKey, isAnalyticsEnabled, surfaceTag, EVENTS } from './analytics.js';
import * as pwaInstall from './pwaInstall.js';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('aptabaseKey / isAnalyticsEnabled', () => {
  it('is disabled with no key (the dev / test / Storybook default)', () => {
    expect(aptabaseKey()).toBe('');
    expect(isAnalyticsEnabled()).toBe(false);
  });

  it('is enabled when VITE_APTABASE_KEY is set (production build)', () => {
    vi.stubEnv('VITE_APTABASE_KEY', 'A-US-1234567890');
    expect(aptabaseKey()).toBe('A-US-1234567890');
    expect(isAnalyticsEnabled()).toBe(true);
  });
});

describe('surfaceTag', () => {
  it("returns 'browser' when not running standalone", () => {
    vi.spyOn(pwaInstall, 'isStandalone').mockReturnValue(false);
    expect(surfaceTag()).toBe('browser');
  });

  it("returns 'pwa' when running as an installed standalone app", () => {
    vi.spyOn(pwaInstall, 'isStandalone').mockReturnValue(true);
    expect(surfaceTag()).toBe('pwa');
  });
});

describe('EVENTS', () => {
  it('exposes stable, frozen event names', () => {
    expect(EVENTS).toMatchObject({
      APP_OPENED: 'app_opened',
      EXPORT: 'export',
      FILE_OPEN: 'file_open',
      FILE_SAVE: 'file_save',
      FILE_NEW: 'file_new',
      VIEW_MODE: 'view_mode',
    });
    expect(Object.isFrozen(EVENTS)).toBe(true);
  });
});
