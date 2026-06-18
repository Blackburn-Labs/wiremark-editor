// @ts-check
/**
 * HelpMenu -- the AppBar "Help" menu (SPEC mockup). External links (Report an
 * Issue, Getting Started, Component Reference) open in a new window; "About
 * Wiremark Editor" opens the AboutDialog whose open state is managed locally
 * here. Controlled via `anchorEl` + `open` + `onClose`.
 */
import { useState } from 'react';
import PropTypes from 'prop-types';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import BugReportIcon from '@mui/icons-material/BugReport';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import WidgetsIcon from '@mui/icons-material/Widgets';
import InfoIcon from '@mui/icons-material/Info';
import SecurityIcon from '@mui/icons-material/Security';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import InstallDesktopIcon from '@mui/icons-material/InstallDesktop';

import AboutDialog from './AboutDialog.jsx';
import PrivacyDialog from './PrivacyDialog.jsx';
import {
  ISSUES_URL,
  DOCS_GETTING_STARTED_URL,
  DOCS_COMPONENTS_URL,
} from '../../config/externalLinks.js';

const LINKS = [
  {
    key: 'issue',
    label: 'Report an Issue',
    href: ISSUES_URL,
    Icon: BugReportIcon,
  },
  {
    key: 'getting-started',
    label: 'Getting Started & Guides',
    href: DOCS_GETTING_STARTED_URL,
    Icon: MenuBookIcon,
  },
  {
    key: 'reference',
    label: 'Component Reference',
    href: DOCS_COMPONENTS_URL,
    Icon: WidgetsIcon,
  },
];

/**
 * Open a URL in a new window with safe rel options.
 * @param {string} href
 */
function openExternal(href) {
  if (typeof window !== 'undefined' && typeof window.open === 'function') {
    window.open(href, '_blank', 'noopener,noreferrer');
  }
}

export default function HelpMenu({ anchorEl, open, onClose, showInstall, onInstall }) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  /** @param {string} href */
  const handleLink = (href) => {
    openExternal(href);
    if (onClose) onClose();
  };

  const handleInstall = () => {
    if (onInstall) onInstall();
    if (onClose) onClose();
  };

  const handlePrivacy = () => {
    setPrivacyOpen(true);
    if (onClose) onClose();
  };

  const handleAbout = () => {
    setAboutOpen(true);
    if (onClose) onClose();
  };

  return (
    <>
      <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
        {LINKS.map(({ key, label, href, Icon }) => (
          <MenuItem key={key} onClick={() => handleLink(href)}>
            <ListItemIcon>
              <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{label}</ListItemText>
            <OpenInNewIcon fontSize="small" sx={{ ml: 2, color: 'text.disabled' }} />
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={handlePrivacy}>
          <ListItemIcon>
            <SecurityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Privacy &amp; Data</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleAbout}>
          <ListItemIcon>
            <InfoIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>About Wiremark Editor</ListItemText>
        </MenuItem>
        {showInstall ? (
          <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<InstallDesktopIcon />}
              onClick={handleInstall}
            >
              Install App
            </Button>
          </Box>
        ) : null}
      </Menu>
      <PrivacyDialog open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  );
}

HelpMenu.propTypes = {
  /** The element the menu anchors to. */
  anchorEl: PropTypes.any,
  /** Whether the menu is open. */
  open: PropTypes.bool.isRequired,
  /** Called when the menu requests close. */
  onClose: PropTypes.func.isRequired,
  /** Whether to show the "Install app" item (only when install can be offered). */
  showInstall: PropTypes.bool,
  /** Click handler for "Install app" (native prompt or instructions dialog). */
  onInstall: PropTypes.func,
};
