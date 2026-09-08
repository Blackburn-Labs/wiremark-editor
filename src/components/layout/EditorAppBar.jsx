// @ts-check
/**
 * EditorAppBar -- the top app bar (SPEC layout mockup). Contains the BrandLogo,
 * a "File" button (opens FileMenu), a "Help" button (opens HelpMenu), a flexible
 * spacer, Undo/Redo IconButtons (disabled per `selectCanUndo`/`selectCanRedo`),
 * the ThemeModeToggle, and four independent pane toggles with Alt+1 through
 * Alt+4 shortcuts.
 *
 * Menu anchors are local component state (transient UI, not Redux).
 */
import { useEffect, useRef, useState } from 'react';
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
import WidgetsIcon from '@mui/icons-material/Widgets';
import FormatIndentIncreaseIcon from '@mui/icons-material/FormatIndentIncrease';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

import {
  selectCanUndo,
  selectCanRedo,
  selectFileName,
  undo,
  redo,
} from '../../store/documentSlice.js';
import {
  PANE_IDS,
  selectVisiblePanes,
  setVisiblePanes,
  togglePane,
} from '../../store/uiSlice.js';
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

const PANE_CONTROLS = Object.freeze([
  { id: 'components', label: 'Components', shortcut: 'Alt+1', code: 'Digit1', Icon: WidgetsIcon },
  {
    id: 'editor',
    label: 'Editor',
    shortcut: 'Alt+2',
    code: 'Digit2',
    Icon: FormatIndentIncreaseIcon,
  },
  { id: 'renderer', label: 'Renderer', shortcut: 'Alt+3', code: 'Digit3', Icon: DashboardIcon },
  {
    id: 'inspector',
    label: 'Inspector',
    shortcut: 'Alt+4',
    code: 'Digit4',
    Icon: AccountTreeIcon,
  },
]);

export default function EditorAppBar() {
  const dispatch = useDispatch();
  const track = useTrack();
  const canUndo = useSelector(selectCanUndo);
  const canRedo = useSelector(selectCanRedo);
  const fileName = useSelector(selectFileName);
  const visiblePanes = useSelector(selectVisiblePanes);
  const visiblePanesRef = useRef(visiblePanes);
  visiblePanesRef.current = visiblePanes;

  // PWA install lifecycle (transient browser state). Owned here so there is a
  // single capture site + one instructions dialog shared with the Help menu.
  const { canPromptNative, isInstalled, platform, promptInstall } = useInstallPrompt();

  const [fileAnchor, setFileAnchor] = useState(null);
  const [helpAnchor, setHelpAnchor] = useState(null);
  const [installOpen, setInstallOpen] = useState(false);

  /** @param {*} _e @param {string[]} next */
  const handleVisiblePanes = (_e, next) => {
    const pane = PANE_IDS.find((id) => visiblePanes.includes(id) !== next.includes(id));
    if (!pane) return;
    dispatch(setVisiblePanes(next));
    track(EVENTS.PANE_TOGGLE, {
      pane,
      visible: next.includes(pane),
      trigger: 'toolbar',
    });
  };

  useEffect(() => {
    /** @param {KeyboardEvent} event */
    const handlePaneShortcut = (event) => {
      if (
        !event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.repeat ||
        event.isComposing
      ) {
        return;
      }
      const control = PANE_CONTROLS.find(({ code }) => code === event.code);
      if (!control) return;
      event.preventDefault();
      const visible = !visiblePanesRef.current.includes(control.id);
      dispatch(togglePane(control.id));
      track(EVENTS.PANE_TOGGLE, {
        pane: control.id,
        visible,
        trigger: 'keyboard',
      });
    };

    window.addEventListener('keydown', handlePaneShortcut, true);
    return () => window.removeEventListener('keydown', handlePaneShortcut, true);
  }, [dispatch, track]);

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
          value={visiblePanes}
          onChange={handleVisiblePanes}
          aria-label="Visible panes"
          sx={{ ml: 1 }}
        >
          {PANE_CONTROLS.map(({ id, label, shortcut, Icon }) => (
            <Tooltip title={`Toggle ${label.toLowerCase()} (${shortcut})`} key={id}>
              <ToggleButton
                value={id}
                aria-label={`Toggle ${label.toLowerCase()}`}
                aria-keyshortcuts={shortcut}
              >
                <Icon fontSize="small" />
              </ToggleButton>
            </Tooltip>
          ))}
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
