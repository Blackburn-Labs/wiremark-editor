// @ts-check
/**
 * DocumentPropertiesForm -- the one form for the document-level `Font` and
 * `Flow` lines. The File > Document properties modal edits a draft and applies
 * it on Save; the Inspector's Document panel applies each change immediately.
 * Both pass `value` (read from the file) and get the next value via `onChange`.
 *
 * Font: a "Custom font" switch (off = the built-in Comic Neue = no `Font` line),
 * the family combobox (online fonts + any typed system font), and width / line
 * height. Picking a font makes it usable in the page (downloading it from the
 * chosen source when it is an online font), measures its width, and only then
 * reports one change -- so the Inspector records a single undo step.
 *
 * Flow: top to bottom (core's default, no line) or left to right (`Flow LR`).
 */
import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';

import FontFamilyField from './FontFamilyField.jsx';
import useFontCatalog from '../../hooks/useFontCatalog.js';
import useFontStatus from '../../hooks/useFontStatus.js';
import {
  CORE_WIDTH_PRESETS,
  LEADING_DEFAULT,
  formatNumber,
  hasCoreWidthPreset,
  isBuiltinFamily,
  normalizeLeading,
  normalizeWidth,
} from '../../utils/documentProps.js';
import { getFontSource } from '../../utils/fontSources.js';
import { isFontInstalled, loadPreviewFont } from '../../utils/fontLoader.js';
import { measureFontWidth } from '../../utils/fontMeasure.js';

/**
 * The last font turned off this session, so switching back on restores it.
 * Session memory only: never persisted, never in the document.
 * @type {import('../../utils/documentProps.js').FontSetting|null}
 */
let lastFont = null;

/**
 * A number field that commits on blur / Enter (not per keystroke), so a half-
 * typed value never reaches the file. Blank = not set.
 * @param {{ label: string, value: number|null, placeholder?: string, helperText?: string, onCommit: (raw: string) => void, disabled?: boolean }} props
 */
function NumberField({ label, value, placeholder, helperText, onCommit, disabled = false }) {
  const shown = value == null ? '' : formatNumber(value);
  const [text, setText] = useState(shown);
  useEffect(() => { setText(shown); }, [shown]);
  const commit = () => { if (text.trim() !== shown) onCommit(text); };
  return (
    <TextField
      label={label}
      size="small"
      value={text}
      placeholder={placeholder}
      helperText={helperText}
      disabled={disabled}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
      slotProps={{ htmlInput: { inputMode: 'decimal' } }}
      sx={{ flex: 1 }}
    />
  );
}

NumberField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number,
  placeholder: PropTypes.string,
  helperText: PropTypes.string,
  onCommit: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

/**
 * @param {{
 *   value: import('../../utils/documentProps.js').DocumentProps,
 *   onChange: (next: import('../../utils/documentProps.js').DocumentProps) => void,
 *   source: import('../../utils/fontSources.js').FontSourceId|null,
 *   onRequestSource: () => void,
 *   autoFocus?: boolean,
 * }} props
 */
export default function DocumentPropertiesForm({
  value, onChange, source, onRequestSource, autoFocus = false,
}) {
  const font = value.font;
  const family = font ? font.family : '';
  // Switched on but no family picked yet: nothing can be written until one is.
  const [pendingOn, setPendingOn] = useState(false);
  useEffect(() => { if (font) setPendingOn(false); }, [font]);
  const fontOn = !!font || pendingOn;

  const [busy, setBusy] = useState(false);
  const requestRef = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  const catalog = useFontCatalog(fontOn);
  const status = useFontStatus(family, source);
  const sourceLabel = getFontSource(source)?.label ?? '';

  /** @param {import('../../utils/documentProps.js').FontSetting|null} next */
  const setFont = (next) => onChange({ ...valueRef.current, font: next });

  /**
   * Make the picked family usable, measure it, then report one change.
   * @param {string} picked
   * @param {import('../../utils/fontCatalog.js').CatalogFont|null} entry
   */
  const pickFamily = async (picked, entry) => {
    const request = requestRef.current + 1;
    requestRef.current = request;
    const leading = valueRef.current.font ? valueRef.current.font.leading : null;
    let width = null;
    if (!hasCoreWidthPreset(picked) && !isBuiltinFamily(picked)) {
      setBusy(true);
      try {
        let usable = false;
        if (entry && source) {
          usable = await loadPreviewFont(source, entry).then(() => true, () => false);
        } else {
          usable = isFontInstalled(picked);
        }
        if (usable) width = await measureFontWidth(picked);
      } finally {
        if (requestRef.current === request) setBusy(false);
      }
    }
    if (requestRef.current !== request) return; // a newer pick won
    setFont({ family: picked, width, leading });
  };

  const toggleFont = (/** @type {boolean} */ on) => {
    if (on) {
      if (lastFont) setFont(lastFont);
      else setPendingOn(true);
    } else {
      if (font) lastFont = font;
      setPendingOn(false);
      requestRef.current += 1;
      setFont(null);
    }
  };

  const preset = hasCoreWidthPreset(family)
    ? CORE_WIDTH_PRESETS[/** @type {keyof typeof CORE_WIDTH_PRESETS} */ (family.toLowerCase())]
    : null;
  let widthHelp = 'Empty = 1, as wide as Comic Neue';
  if (busy) widthHelp = 'Measuring...';
  else if (font && font.width == null && preset != null) widthHelp = `Empty = core's own ${preset}`;
  else if (font && font.width != null) widthHelp = 'Raise it if text overflows its boxes';

  const kb = status.bytes ? Math.round((status.bytes * 4) / 3 / 1000) : null;
  const entry = catalog && family ? catalog.find((f) => f.family.toLowerCase() === family.toLowerCase()) : undefined;

  return (
    <Stack spacing={2}>
      <FormControlLabel
        control={<Switch checked={fontOn} onChange={(e) => toggleFont(e.target.checked)} />}
        label="Custom font"
      />

      {!fontOn && (
        <Typography variant="caption" color="text.secondary">
          Off: text uses Comic Neue, built into every export.
        </Typography>
      )}

      {fontOn && (
        <>
          <FontFamilyField
            value={family}
            catalog={catalog}
            source={source}
            busy={busy}
            autoFocus={autoFocus && !family}
            onPick={pickFamily}
            onRequestSource={onRequestSource}
          />

          {family && (status.status === 'checking' || status.status === 'loading') && (
            <Typography variant="caption" color="text.secondary">
              {status.status === 'loading' ? `Downloading ${family} from ${sourceLabel}...` : `Looking for ${family}...`}
            </Typography>
          )}

          {family && status.status === 'local' && (
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">
                Found on this computer, so the preview uses it.
              </Typography>
              <Alert severity="warning" variant="outlined" sx={{ py: 0 }}>Not embedded in exports</Alert>
              <Typography variant="caption" color="text.secondary">
                Exports and other machines show Comic Neue unless {family} is installed there.
              </Typography>
            </Stack>
          )}

          {family && status.status === 'online' && (
            <Stack spacing={0.5}>
              <Typography variant="caption" color="text.secondary">
                From {sourceLabel}.{kb != null && ` Embedded in exports: +${kb} KB${entry?.hasBold ? ', bold about the same' : ''}.`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                The CLI, IntelliJ and GitHub show it only if it&apos;s installed; otherwise Comic Neue.
              </Typography>
            </Stack>
          )}

          {family && status.status === 'missing' && (
            <Typography variant="caption" color="warning.main">
              {family} isn&apos;t installed on this computer. The preview uses Comic Neue.
              {status.inCatalog && !source && (
                <>
                  {' '}
                  <Link component="button" type="button" variant="caption" onClick={onRequestSource}>
                    Search online fonts&hellip;
                  </Link>
                </>
              )}
            </Typography>
          )}

          {family && status.status === 'failed' && (
            <Typography variant="caption" color="warning.main">
              {family} couldn&apos;t be downloaded from {sourceLabel}. The preview uses Comic Neue.{' '}
              <Link component="button" type="button" variant="caption" onClick={status.retry}>Retry</Link>
            </Typography>
          )}

          <Stack direction="row" spacing={1}>
            <NumberField
              label="Width"
              value={font ? font.width : null}
              placeholder={preset != null ? String(preset) : '1'}
              helperText={widthHelp}
              disabled={!font || busy}
              onCommit={(raw) => font && setFont({ ...font, width: normalizeWidth(raw) })}
            />
            <NumberField
              label="Line height"
              value={font ? font.leading : null}
              placeholder={String(LEADING_DEFAULT)}
              helperText={`Empty = ${LEADING_DEFAULT}`}
              disabled={!font || busy}
              onCommit={(raw) => font && setFont({ ...font, leading: normalizeLeading(raw) })}
            />
          </Stack>
        </>
      )}

      <Divider />

      <Stack spacing={0.5}>
        <TextField
          select
          label="Flow"
          size="small"
          value={value.flow}
          onChange={(e) => onChange({ ...valueRef.current, flow: e.target.value === 'LR' ? 'LR' : 'TD' })}
        >
          <MenuItem value="TD">Top to bottom (default)</MenuItem>
          <MenuItem value="LR">Left to right</MenuItem>
        </TextField>
        <Typography variant="caption" color="text.secondary">
          Direction of the flow chart when there is more than one screen.
        </Typography>
      </Stack>
    </Stack>
  );
}

DocumentPropertiesForm.propTypes = {
  value: PropTypes.shape({
    font: PropTypes.shape({
      family: PropTypes.string.isRequired,
      width: PropTypes.number,
      leading: PropTypes.number,
    }),
    flow: PropTypes.oneOf(['TD', 'LR']).isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  source: PropTypes.oneOf(['bunny', 'fontsource', 'google']),
  onRequestSource: PropTypes.func.isRequired,
  autoFocus: PropTypes.bool,
};
