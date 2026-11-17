// @ts-check
/**
 * useFontCatalog -- the bundled online-font list (utils/fontCatalog.js), loaded
 * lazily the first time a component asks for it. The list is part of the app
 * (a code-split JSON chunk from the editor's own origin), so loading it contacts
 * no third party. Returns null until loaded.
 */
import { useEffect, useState } from 'react';
import { loadCatalog } from '../utils/fontCatalog.js';

/**
 * @param {boolean} [enabled] load only when true (default true)
 * @returns {import('../utils/fontCatalog.js').CatalogFont[]|null}
 */
export default function useFontCatalog(enabled = true) {
  const [catalog, setCatalog] = useState(/** @type {import('../utils/fontCatalog.js').CatalogFont[]|null} */ (null));
  useEffect(() => {
    if (!enabled || catalog) return undefined;
    let live = true;
    loadCatalog().then((list) => { if (live) setCatalog(list); });
    return () => { live = false; };
  }, [enabled, catalog]);
  return catalog;
}
