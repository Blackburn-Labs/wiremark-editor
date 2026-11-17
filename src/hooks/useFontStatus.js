// @ts-check
/**
 * useFontStatus -- is the document's (or a draft's) font family usable in the
 * page, and where does it come from?
 *
 *  - 'default'  no custom font (or the built-in Comic Neue)
 *  - 'checking' looking it up
 *  - 'local'    installed on this computer (used by name; never embedded)
 *  - 'online'   downloaded from the chosen source and registered for the preview
 *  - 'loading'  downloading from the chosen source
 *  - 'missing'  not installed and not downloaded; `inCatalog` says whether an
 *               online font by that name exists (then it needs a source)
 *  - 'failed'   the download failed (offline, blocked, not on that mirror)
 *
 * A catalog font is downloaded automatically only when the user has chosen a
 * source -- never otherwise. `retry()` re-runs the lookup.
 *
 * @typedef {'default'|'checking'|'local'|'online'|'loading'|'missing'|'failed'} FontStatusKind
 * @typedef {{ status: FontStatusKind, family: string|null, inCatalog: boolean, bytes: number|null, retry: () => void }} FontStatus
 */
import { useCallback, useEffect, useState } from 'react';
import { isBuiltinFamily, isValidFamily } from '../utils/documentProps.js';
import { findFont, loadCatalog } from '../utils/fontCatalog.js';
import { isFontInstalled, isFontLoaded, loadPreviewFont } from '../utils/fontLoader.js';

/**
 * @param {string|null|undefined} family
 * @param {import('../utils/fontSources.js').FontSourceId|null} source
 * @returns {FontStatus}
 */
export default function useFontStatus(family, source) {
  const name = typeof family === 'string' ? family.trim() : '';
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState(
    /** @type {Omit<FontStatus, 'retry'>} */ ({ status: 'default', family: null, inCatalog: false, bytes: null }),
  );

  useEffect(() => {
    if (!name || isBuiltinFamily(name) || !isValidFamily(name)) {
      setState({ status: 'default', family: name || null, inCatalog: false, bytes: null });
      return undefined;
    }
    let live = true;
    /** @param {Omit<FontStatus, 'retry'>} next */
    const set = (next) => { if (live) setState(next); };
    setState((prev) => (prev.family === name ? prev : { status: 'checking', family: name, inCatalog: false, bytes: null }));
    (async () => {
      const entry = findFont(await loadCatalog(), name);
      if (!live) return;
      const base = { family: name, inCatalog: !!entry, bytes: null };
      if (entry && isFontLoaded(name) && source) {
        // Already downloaded this session: re-read its size from the cache.
        set({ ...base, status: 'loading' });
        try {
          const { bytes } = await loadPreviewFont(source, entry);
          set({ ...base, status: 'online', bytes });
        } catch {
          set({ ...base, status: 'failed' });
        }
        return;
      }
      if (isFontInstalled(name)) {
        set({ ...base, status: 'local' });
        return;
      }
      if (!entry || !source) {
        set({ ...base, status: 'missing' });
        return;
      }
      set({ ...base, status: 'loading' });
      try {
        const { bytes } = await loadPreviewFont(source, entry);
        set({ ...base, status: 'online', bytes });
      } catch {
        set({ ...base, status: 'failed' });
      }
    })();
    return () => { live = false; };
  }, [name, source, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
