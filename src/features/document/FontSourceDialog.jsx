// @ts-check
/**
 * FontSourceDialog -- "Load online fonts from": the one-time choice of where
 * online fonts download from (Bunny Fonts, Fontsource, Google Fonts). Opened
 * from the font list ("Search online fonts..." / "Change source") and from the
 * renderer's not-found notice. Nothing is preselected the first time; the
 * warning under the choices says the source sees the user's IP address.
 *
 * The choice is a browser preference (uiSlice.fontSource), never part of the
 * document. "Turn off online fonts" appears once a source is set.
 */
import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';

import { FONT_SOURCES } from '../../utils/fontSources.js';
import {
  closeFontSourceDialog,
  selectFontSource,
  selectFontSourceDialogOpen,
  setFontSource,
} from '../../store/uiSlice.js';
import useTrack from '../../hooks/useTrack.js';
import { EVENTS } from '../../utils/analytics.js';

/**
 * Presentational dialog.
 * @param {{
 *   open: boolean,
 *   current: import('../../utils/fontSources.js').FontSourceId|null,
 *   onChoose: (source: import('../../utils/fontSources.js').FontSourceId|null) => void,
 *   onClose: () => void,
 * }} props
 */
export function FontSourceDialogView({ open, current, onChoose, onClose }) {
  const [choice, setChoice] = useState(/** @type {string} */ (current ?? ''));
  useEffect(() => { if (open) setChoice(current ?? ''); }, [open, current]);
  const picked = FONT_SOURCES.find((s) => s.id === choice);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="font-source-title">
      <DialogTitle id="font-source-title">Load online fonts from</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body2">Font names are searched inside the editor.</Typography>
          <RadioGroup value={choice} onChange={(e) => setChoice(e.target.value)} aria-label="Font source">
            {FONT_SOURCES.map((s) => (
              <FormControlLabel
                key={s.id}
                value={s.id}
                control={<Radio size="small" />}
                sx={{ alignItems: 'flex-start', mb: 0.5, '& .MuiRadio-root': { pt: 0.5 } }}
                label={(
                  <Box>
                    <Typography variant="body2">{s.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{`${s.host}. ${s.note}`}</Typography>
                  </Box>
                )}
              />
            ))}
          </RadioGroup>
          <Alert severity="warning">
            Only the font you pick is downloaded, and whichever source serves it sees your IP
            address and may track or save it.
          </Alert>
          <Typography variant="caption" color="text.secondary">
            Saved in this browser. Change it from the font list at any time.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        {current && (
          <Button color="inherit" onClick={() => onChoose(null)} sx={{ mr: 'auto' }}>
            Turn off online fonts
          </Button>
        )}
        <Button onClick={onClose}>{current ? 'Cancel' : 'Not now'}</Button>
        <Button variant="contained" disabled={!picked} onClick={() => picked && onChoose(picked.id)}>
          Use online fonts
        </Button>
      </DialogActions>
    </Dialog>
  );
}

FontSourceDialogView.propTypes = {
  open: PropTypes.bool.isRequired,
  current: PropTypes.oneOf(['bunny', 'fontsource', 'google']),
  onChoose: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

/** The store-bound dialog, mounted once by EditorScreen. */
export default function FontSourceDialog() {
  const dispatch = useDispatch();
  const track = useTrack();
  const open = useSelector(selectFontSourceDialogOpen);
  const current = useSelector(selectFontSource);
  return (
    <FontSourceDialogView
      open={open}
      current={current}
      onClose={() => dispatch(closeFontSourceDialog())}
      onChoose={(source) => {
        dispatch(setFontSource(source));
        dispatch(closeFontSourceDialog());
        track(EVENTS.FONT_SOURCE, { source: source ?? 'off' });
      }}
    />
  );
}
