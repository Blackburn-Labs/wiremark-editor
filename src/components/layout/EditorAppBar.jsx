// @ts-check
/**
 * EditorAppBar -- the top app bar (SPEC layout mockup). Contains the BrandLogo,
 * a "File" button (opens FileMenu), a "Help" button (opens HelpMenu), a flexible
 * spacer, Undo/Redo IconButtons (disabled per `selectCanUndo`/`selectCanRedo`),
 * the ThemeModeToggle, and a tri-state ToggleButtonGroup bound to `viewMode`
 * (Article=text, ViewAgenda=split, Dashboard=render).
 *
 * Menu anchors are local component state (transient UI, not Redux).
 */
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import FormatIndentIncreaseIcon from '@mui/icons-material/FormatIndentIncrease';
import VerticalSplitIcon from '@mui/icons-material/VerticalSplit';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

import {
  selectCanUndo,
  selectCanRedo,
  selectFileName,
  undo,
  redo,
} from '../../store/documentSlice.js';
import { selectViewMode, setViewMode } from '../../store/uiSlice.js';
import useInstallPrompt from '../../hooks/useInstallPrompt.js';
import useTrack from '../../hooks/useTrack.js';
import { canOfferInstall } from '../../utils/pwaInstall.js';
import { EVENTS } from '../../utils/analytics.js';
import BrandLogo from '../common/BrandLogo.jsx';
import FileMenu from './FileMenu.jsx';
import HelpMenu from './HelpMenu.jsx';
import ThemeModeToggle from './ThemeModeToggle.jsx';
import InstallButton from './InstallButton.jsx';
import InstallInstructionsDialog from './InstallInstructionsDialog.jsx';

export default function EditorAppBar() {
  const dispatch = useDispatch();
  const track = useTrack();
  const canUndo = useSelector(selectCanUndo);
  const canRedo = useSelector(selectCanRedo);
  const fileName = useSelector(selectFileName);
  const viewMode = useSelector(selectViewMode);

  // PWA install lifecycle (transient browser state). Owned here so there is a
  // single capture site + one instructions dialog shared with the Help menu.
  const { canPromptNative, isInstalled, platform, promptInstall } = useInstallPrompt();

  const [fileAnchor, setFileAnchor] = useState(null);
  const [helpAnchor, setHelpAnchor] = useState(null);
  const [installOpen, setInstallOpen] = useState(false);

  /** @param {*} _e @param {'text'|'split'|'render'|null} next */
  const handleViewMode = (_e, next) => {
    if (next) {
      dispatch(setViewMode(next));
      track(EVENTS.VIEW_MODE, { mode: next });
    }
  };

  const showInstall = canOfferInstall({ isInstalled, canPromptNative, platform });

  // Native one-click prompt where supported (Chromium); otherwise (iOS) show the
  // manual Add-to-Home-Screen instructions.
  const handleInstall = () => {
    if (canPromptNative) {
      promptInstall();
    } else {
      setInstallOpen(true);
    }
  };

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar variant="dense" sx={{ gap: 1 }}>
        <BrandLogo size={26} />
        <Box sx={{ width: 8 }} />

        <Button
          color="inherit"
          endIcon={<ArrowDropDownIcon />}
          onClick={(e) => setFileAnchor(e.currentTarget)}
        >
          File
        </Button>
        <Button
          color="inherit"
          endIcon={<ArrowDropDownIcon />}
          onClick={(e) => setHelpAnchor(e.currentTarget)}
        >
          Help
        </Button>

        {/*
          Name of the open file (omitted for a new/untitled doc). The browser's
          File System Access API never exposes the absolute path -- only the file
          name -- so the tooltip shows the full name (useful when the caption
          truncates), not a directory path.
        */}
        {fileName && (
          <Tooltip title={fileName}>
            <Typography
              variant="caption"
              color="textDisabled"
              noWrap
              sx={{ ml: 2, maxWidth: 260, cursor: 'default' }}
            >
              {fileName}
            </Typography>
          </Tooltip>
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Tooltip title="Undo">
          <span>
            <IconButton
              color="inherit"
              disabled={!canUndo}
              aria-label="Undo"
              onClick={() => dispatch(undo())}
            >
              <UndoIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Redo">
          <span>
            <IconButton
              color="inherit"
              disabled={!canRedo}
              aria-label="Redo"
              onClick={() => dispatch(redo())}
            >
              <RedoIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <InstallButton
          isInstalled={isInstalled}
          canPromptNative={canPromptNative}
          platform={platform}
          onInstall={handleInstall}
        />

        <ThemeModeToggle />

        <ToggleButtonGroup
          size="small"
          exclusive
          value={viewMode}
          onChange={handleViewMode}
          aria-label="View mode"
          sx={{ ml: 1 }}
        >
          <ToggleButton value="text" aria-label="Text only">
            <Tooltip title="Text only">
              <FormatIndentIncreaseIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="split" aria-label="Split view">
            <Tooltip title="Split view">
              <VerticalSplitIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="render" aria-label="Render only">
            <Tooltip title="Render only">
              <DashboardIcon fontSize="small" />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Toolbar>

      <FileMenu
        anchorEl={fileAnchor}
        open={Boolean(fileAnchor)}
        onClose={() => setFileAnchor(null)}
      />
      <HelpMenu
        anchorEl={helpAnchor}
        open={Boolean(helpAnchor)}
        onClose={() => setHelpAnchor(null)}
        showInstall={showInstall}
        onInstall={handleInstall}
      />
      <InstallInstructionsDialog
        open={installOpen}
        onClose={() => setInstallOpen(false)}
        platform={platform}
      />
    </AppBar>
  );
}
