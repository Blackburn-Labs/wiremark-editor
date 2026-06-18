// @ts-check
/**
 * PrivacyDialog -- "Privacy & Data". A plain-language summary of how the app
 * handles user data: wireframe content stays on the user's device (it lives only
 * in memory while editing and in the .wiremark files they choose to save), the
 * app is an open-source, backend-less, offline PWA, exports are generated
 * locally, and the only analytics is privacy-first Aptabase (no cookies, no IP,
 * no personal data, never any wireframe content). A footer button links out to
 * `ISSUES_URL` for reporting an issue or privacy concern. Fully controlled via
 * `open` + `onClose`.
 */
import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import SecurityIcon from '@mui/icons-material/Security';
import BugReportIcon from '@mui/icons-material/BugReport';

import ExternalLink from '../common/ExternalLink.jsx';
import { SOURCE_URL, APTABASE_PRIVACY_URL, ISSUES_URL } from '../../config/externalLinks.js';

export default function PrivacyDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" aria-labelledby="privacy-dialog-title">
      <DialogTitle id="privacy-dialog-title">
        <Stack direction="row" spacing={1.5} alignItems="center">
          <SecurityIcon color="primary" />
          <span>Privacy &amp; Data</span>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography>
            <strong>Your documents stay on your device.</strong> While you are
            editing, your documents lives only in this app&apos;s memory -- it is
            never sent to a server, stored in the page URL, or written to your
            browser&apos;s storage. The only saved copy is the{' '}
            <code>.wiremark</code> file you choose to save to your own machine
            (or wherever you keep your files).
          </Typography>

          <Typography>
            Wiremark Editor is a fully open-source, client-side app with no
            backend and no account -- there is no server to send your work to. It
            works offline and can be installed as a Progressive Web App. You can{' '}
            <ExternalLink href={SOURCE_URL}>view the source on GitHub</ExternalLink>.
          </Typography>

          <Typography>
            Exports (SVG, PNG, and PDF) are generated entirely in your browser.
            Your wireframe is never uploaded to any third-party service.
          </Typography>

          <Typography>
            We use{' '}
            <ExternalLink href={APTABASE_PRIVACY_URL}>Aptabase</ExternalLink>, a
            privacy-first analytics service, to collect anonymous usage metadata
            (such as which features are used and how often). Aptabase uses no cookies,
            collects no IP address, and stores no personal data -- and we never send
            any of your document's content.
          </Typography>

          <Typography>
            The only thing kept in your browser between sessions is your
            light/dark theme preference.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Button
          component="a"
          href={ISSUES_URL}
          target="_blank"
          rel="noopener noreferrer"
          startIcon={<BugReportIcon />}
        >
          Report an Issue or Privacy Concern
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

PrivacyDialog.propTypes = {
  /** Whether the dialog is open. */
  open: PropTypes.bool.isRequired,
  /** Called when the dialog requests close. */
  onClose: PropTypes.func.isRequired,
};
