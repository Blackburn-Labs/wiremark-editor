// @ts-check
/**
 * App -- root layout shell. Renders the active route via React Router's Outlet.
 * Cross-cutting providers (Redux, theme, analytics) are applied in main.jsx
 * above the router so they wrap every route.
 *
 * Fires the one `app_opened` analytics event here -- the shell mounts exactly
 * once per app load -- tagged with the runtime surface (installed PWA vs
 * browser). No-ops entirely when analytics is disabled.
 */
import { useEffect } from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import useTrack from './hooks/useTrack.js';
import { EVENTS, surfaceTag } from './utils/analytics.js';

export default function App() {
  const track = useTrack();

  useEffect(() => {
    // Empty deps on purpose (not [track]): the Aptabase client identity flips
    // once when the provider finishes initializing, and we don't want that to
    // re-fire app_opened. Events sent before init are buffered by the SDK and
    // flushed on init, so exactly one send is guaranteed in production.
    track(EVENTS.APP_OPENED, { surface: surfaceTag() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box sx={{ height: '100vh', overflow: 'hidden' }}>
      <Outlet />
    </Box>
  );
}
