// @ts-check
/**
 * External links surfaced in the UI (the Help menu and the About dialog).
 * Centralized here so the handful of outbound URLs live in one place.
 *
 * These are public, static, non-sensitive URLs -- deliberately plain constants
 * rather than build-time env vars. There is nothing per-deployment to configure,
 * so an env layer would only add indirection.
 */

/** Report an issue against the wiremark project (Help menu). */
export const ISSUES_URL = 'https://github.com/Blackburn-Labs/wiremark/issues';

/** Wiremark "Getting Started" guide (Help menu). */
export const DOCS_GETTING_STARTED_URL = 'https://docs.wiremark.dev/guides/getting-started';

/** Wiremark component reference (Help menu). */
export const DOCS_COMPONENTS_URL = 'https://docs.wiremark.dev/reference/components';

/** Blackburn Labs marketing site, the project's sponsor (About dialog). */
export const BLACKBURN_LABS_URL = 'https://blackburnlabs.com';

/** Wiremark source repository (Privacy & Data dialog -- "open source"). */
export const SOURCE_URL = 'https://github.com/Blackburn-Labs/wiremark';

/** Aptabase privacy policy (Privacy & Data dialog -- analytics paragraph). */
export const APTABASE_PRIVACY_URL = 'https://aptabase.com/legal/privacy';
