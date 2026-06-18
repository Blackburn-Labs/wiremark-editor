// @ts-check
/**
 * useTrack -- the single seam UI code uses to record analytics events.
 *
 * Wraps Aptabase's `useAptabase()` and returns a `track(name, props)` that:
 *  - no-ops when analytics is disabled (dev / unit tests / Storybook -- no key),
 *  - is fire-and-forget and swallows any error, so analytics can never throw or
 *    reject into the UI and break the editor (same spirit as `safeRender`).
 *
 * Calling `useAptabase()` outside an `AptabaseProvider` is safe -- the SDK
 * returns a warning no-op rather than throwing -- but because `track()` returns
 * early when disabled, that path is never exercised in dev/tests/Storybook.
 */
import { useCallback } from 'react';
import { useAptabase } from '@aptabase/react';
import { isAnalyticsEnabled } from '../utils/analytics.js';

/**
 * @returns {(name: string, props?: Record<string, string|number|boolean>) => void}
 */
export default function useTrack() {
  const { trackEvent } = useAptabase();
  return useCallback(
    (name, props) => {
      if (!isAnalyticsEnabled()) return;
      try {
        // trackEvent already catches network errors internally and resolves; the
        // extra guards here are belt-and-suspenders so the editor never breaks.
        Promise.resolve(trackEvent(name, props)).catch(() => {});
      } catch {
        /* analytics must never break the app */
      }
    },
    [trackEvent],
  );
}
