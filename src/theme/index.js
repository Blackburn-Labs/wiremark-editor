// @ts-check
/**
 * MUI theme factory. Produces a light or dark theme sharing one brand palette.
 * The brand accent borrows from the wiremark home page's Dracula-ish tones so
 * the app chrome and the rendered wireframes feel of a piece.
 */
import { createTheme } from '@mui/material/styles';

/** @typedef {'light'|'dark'} ResolvedMode */

const BRAND = {
  teal: '#5ccede',
  blue: '#2b6cb0',
  purple: '#7c4dff',
  violet: '#d54dff',
  green: '#2e9e5b',
  pink: '#d6336c',
};

/**
 * @param {ResolvedMode} mode
 * @returns {import('@mui/material/styles').Theme}
 */
export function createAppTheme(mode) {
  const isDark = mode === 'dark';
  return createTheme({
    palette: {
      mode,
      primary: isDark ? { main: BRAND.violet } : { main: BRAND.purple },
      secondary: { main: BRAND.purple },
      success: { main: BRAND.green },
      error: { main: BRAND.pink },
      info: { main: BRAND.teal },
      ...(isDark
        ? { background: { default: '#1e1f29', paper: '#282a36' } }
        : { background: { default: '#f6f7fb', paper: '#ffffff' } }),
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: 'Roboto, system-ui, -apple-system, sans-serif',
    },
    components: {
      MuiButton: { defaultProps: { disableElevation: true } },
    },
  });
}

export default createAppTheme;
