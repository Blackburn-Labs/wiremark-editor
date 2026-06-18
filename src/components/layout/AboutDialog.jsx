// @ts-check
/**
 * AboutDialog -- "About Wiremark Editor" (SPEC mockup). Shows the app version
 * (from the Vite-injected `__APP_VERSION__` global, guarded), the BrandLogo, the
 * Blackburn Labs sponsorship blurb, and a button that opens blackburnlabs.com in
 * a new window. Fully controlled via `open` + `onClose`.
 */
import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import BrandLogo from '../common/BrandLogo.jsx';
import BlackburnLabsLogo from '../common/BlackburnLabsLogo.jsx';
import { BLACKBURN_LABS_URL } from '../../config/externalLinks.js';

/** Resolve the app version from the Vite-injected global, guarded for tests/SB. */
function appVersion() {
  // eslint-disable-next-line no-undef
  return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
}

export default function AboutDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" aria-labelledby="about-dialog-title">
      <DialogTitle id="about-dialog-title">About Wiremark Editor</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <BrandLogo size={64} />
            <Box>
              <Typography variant="h6">Wiremark Editor</Typography>
              <Typography variant="body2" color="text.secondary">
                {`Version: ${appVersion()}`}
              </Typography>
            </Box>
          </Stack>

          <Divider />

          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{flex: 2}}>
              <Typography variant="h6" gutterBottom>
                Wiremark&trade; is proudly sponsored by Blackburn Labs
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                At Blackburn Labs, we are dedicated to delivering cutting-edge software
                solutions that empower businesses across various industries. Our expertise
                spans multiple domains, ensuring that we can meet the unique challenges and
                objectives of our clients.
              </Typography>
              <Box align="center" sx={{ pt: 2 }}>
                <Button
                  variant="contained"
                  endIcon={<OpenInNewIcon />}
                  href={BLACKBURN_LABS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Blackburn Labs
                </Button>
              </Box>
            </Box>
            <Box sx={{flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0}}>
              <BlackburnLabsLogo width="100%" title="Blackburn Labs Logo" />
            </Box>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

AboutDialog.propTypes = {
  /** Whether the dialog is open. */
  open: PropTypes.bool.isRequired,
  /** Called when the dialog requests close. */
  onClose: PropTypes.func.isRequired,
};
