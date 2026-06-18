// @ts-check
/**
 * FileMenu -- the AppBar "File" menu (SPEC mockup): New, Open, Save, and an
 * Export submenu (SVG / PNG / PDF).
 *
 * - New and Open guard unsaved changes (`selectIsDirty`) via a ConfirmDialog
 *   before discarding the current document.
 * - Open uses `fileIo.openWiremarkFile()` then `loadDocument`.
 * - Save uses `fileIo.saveWiremarkFile()` then `markSaved`. The label is "Save"
 *   when the File System Access API is supported or a handle exists, else
 *   "Download" (it degrades to a download).
 * - Export renders the current `safeRender(source, mode).svg` then calls the
 *   matching `exporters.export*`.
 *
 * Controlled via `anchorEl` + `open` + `onClose`.
 */
import { useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import {
  selectSource,
  selectFileName,
  selectIsDirty,
  selectHasHandle,
  loadDocument,
  markSaved,
  newDocument,
} from '../../store/documentSlice.js';
import {
  openWiremarkFile,
  saveWiremarkFile,
  isFileSystemAccessSupported,
} from '../../utils/fileIo.js';
import { safeRender } from '../../utils/wmRender.js';
import { exportSvg, exportPng, exportPdf } from '../../utils/exporters.js';
import { EVENTS } from '../../utils/analytics.js';
import useTrack from '../../hooks/useTrack.js';
import ConfirmDialog from '../common/ConfirmDialog.jsx';

export default function FileMenu({ anchorEl, open, onClose }) {
  const dispatch = useDispatch();
  const track = useTrack();
  const source = useSelector(selectSource);
  const fileName = useSelector(selectFileName);
  const isDirty = useSelector(selectIsDirty);
  const hasHandle = useSelector(selectHasHandle);

  const [exportAnchor, setExportAnchor] = useState(null);
  /** @type {['new'|'open'|null, import('react').Dispatch<*>]} */
  const [pendingAction, setPendingAction] = useState(null);

  // The render theme passed to safeRender: split/text export still renders.
  const renderTheme = 'light';

  const canSaveInPlace = isFileSystemAccessSupported() || hasHandle;
  const saveLabel = canSaveInPlace ? 'Save' : 'Download';

  const closeAll = () => {
    setExportAnchor(null);
    if (onClose) onClose();
  };

  const doNew = () => {
    dispatch(newDocument());
    track(EVENTS.FILE_NEW);
  };

  const doOpen = async () => {
    const result = await openWiremarkFile();
    if (result) {
      dispatch(loadDocument({ source: result.source, fileName: result.name }));
      track(EVENTS.FILE_OPEN);
    }
  };

  const handleNew = () => {
    if (isDirty) {
      setPendingAction('new');
      if (onClose) onClose();
    } else {
      closeAll();
      doNew();
    }
  };

  const handleOpen = () => {
    if (isDirty) {
      setPendingAction('open');
      if (onClose) onClose();
    } else {
      closeAll();
      doOpen();
    }
  };

  const confirmGuarded = () => {
    const action = pendingAction;
    setPendingAction(null);
    if (action === 'new') doNew();
    else if (action === 'open') doOpen();
  };

  const handleSave = async () => {
    closeAll();
    const result = await saveWiremarkFile({ source, name: fileName });
    if (result) {
      dispatch(markSaved({ fileName: result.name }));
      track(EVENTS.FILE_SAVE, { mode: canSaveInPlace ? 'save' : 'download' });
    }
  };

  /** @param {'svg'|'png'|'pdf'} kind */
  const handleExport = async (kind) => {
    closeAll();
    const { svg } = safeRender(source, renderTheme);
    if (!svg) return;
    const base = (fileName && fileName.replace(/\.wiremark$/i, '')) || 'wireframe';
    if (kind === 'svg') exportSvg(svg, `${base}.svg`);
    else if (kind === 'png') await exportPng(svg, `${base}.png`);
    else if (kind === 'pdf') await exportPdf(svg, `${base}.pdf`);
    track(EVENTS.EXPORT, { format: kind });
  };

  return (
    <>
      <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
        <MenuItem onClick={handleNew}>
          <ListItemIcon>
            <NoteAddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>New</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleOpen}>
          <ListItemIcon>
            <FolderOpenIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Open</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleSave}>
          <ListItemIcon>
            {canSaveInPlace ? <SaveIcon fontSize="small" /> : <DownloadIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText>{saveLabel}</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={(e) => setExportAnchor(e.currentTarget)}
          aria-haspopup="true"
        >
          <ListItemIcon>
            <FileDownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export</ListItemText>
          <ChevronRightIcon fontSize="small" sx={{ ml: 2, color: 'text.secondary' }} />
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={exportAnchor}
        open={Boolean(exportAnchor)}
        onClose={() => setExportAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <MenuItem onClick={() => handleExport('svg')}>SVG</MenuItem>
        <MenuItem onClick={() => handleExport('png')}>PNG</MenuItem>
        <MenuItem onClick={() => handleExport('pdf')}>PDF</MenuItem>
      </Menu>

      <ConfirmDialog
        open={pendingAction !== null}
        title="Discard unsaved changes?"
        message="You have unsaved changes that will be lost. Do you want to continue?"
        confirmLabel="Discard"
        cancelLabel="Cancel"
        onConfirm={confirmGuarded}
        onCancel={() => setPendingAction(null)}
      />
    </>
  );
}

FileMenu.propTypes = {
  /** The element the menu anchors to. */
  anchorEl: PropTypes.any,
  /** Whether the menu is open. */
  open: PropTypes.bool.isRequired,
  /** Called when the menu requests close. */
  onClose: PropTypes.func.isRequired,
};
