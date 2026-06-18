// @ts-check
/**
 * ThemeModeProvider -- resolves the user's themeMode preference
 * (light/dark/system) into a concrete MUI theme and applies it, following the
 * OS preference live when mode is "system". Also exposes the resolved mode via
 * context so the renderer can pass the matching `theme` to @wiremark/core.
 */
import { createContext, useContext, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { ThemeProvider, CssBaseline, useMediaQuery } from '@mui/material';
import { createAppTheme } from './index.js';
import { selectThemeMode } from '../store/uiSlice.js';

/** @type {import('react').Context<{ resolvedMode: 'light'|'dark' }>} */
const ResolvedModeContext = createContext({ resolvedMode: 'light' });

/** @returns {'light'|'dark'} the concrete mode after resolving "system". */
export function useResolvedThemeMode() {
  return useContext(ResolvedModeContext).resolvedMode;
}

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export default function ThemeModeProvider({ children }) {
  const themeMode = useSelector(selectThemeMode);
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  const resolvedMode = themeMode === 'system' ? (prefersDark ? 'dark' : 'light') : themeMode;
  const theme = useMemo(() => createAppTheme(resolvedMode), [resolvedMode]);

  return (
    <ResolvedModeContext.Provider value={{ resolvedMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ResolvedModeContext.Provider>
  );
}
