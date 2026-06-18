// @ts-check
/**
 * ErrorScreen -- the route `errorElement`. A render/runtime error anywhere in the
 * tree lands here (instead of React Router's bare default) with a friendly,
 * recoverable message. The wiremark source lives in the store + (after Save) on
 * disk, so reloading is safe.
 */
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useRouteError } from 'react-router-dom';
import BrandLogo from '../components/common/BrandLogo.jsx';

export default function ErrorScreen() {
  const error = useRouteError();
  const message =
    (error && (error.message || (typeof error === 'string' ? error : ''))) || 'Unexpected error';

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        bgcolor: 'background.default',
      }}
    >
      <Stack spacing={2} alignItems="center" sx={{ maxWidth: 560, textAlign: 'center' }}>
        <BrandLogo size={36} />
        <Typography variant="h5">Something went wrong</Typography>
        <Typography variant="body2" color="text.secondary">
          The editor hit an unexpected error. Reloading is safe — your work lives in this tab (and
          on disk if you&apos;ve saved). If it persists, copy your wiremark text out as a backup.
        </Typography>
        <Box
          component="pre"
          sx={{
            width: '100%',
            textAlign: 'left',
            overflow: 'auto',
            maxHeight: 200,
            p: 1.5,
            borderRadius: 1,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            fontSize: 12,
          }}
        >
          {message}
        </Box>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={() => window.location.reload()}
        >
          Reload editor
        </Button>
      </Stack>
    </Box>
  );
}
