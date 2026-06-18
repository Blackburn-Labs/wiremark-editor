// @ts-check
/**
 * ContentControl -- the text-content editor for `text:true` components.
 *
 * An element's drawn text is conceptually ONE thing: either a literal string the
 * user types, or a placeholder ("filler") amount the renderer fills in. They are
 * mutually exclusive, so this offers a `Text | Filler` toggle and shows only the
 * active mode's inputs:
 *  - Text   -> one text field bound to the quoted literal label.
 *  - Filler -> a unit dropdown + amount (the bare `~N` token) plus the filler
 *    *style* select (squiggle/lorem/blocks), which only matters once filler is on.
 *
 * Presentational: the parent (PropertyForm) derives `mode` from the tokens and
 * owns all token math; this component just renders inputs and reports changes.
 */
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import SelectControl from './SelectControl.jsx';
import { parseFiller, formatFiller, isNumericUnit } from '../../utils/fillerFormat.js';

/** Unit options for the filler-amount dropdown; labels show the token form. */
const UNIT_OPTIONS = [
  { value: 'sentences', label: 'Sentences (~N)' },
  { value: 'words', label: 'Words (~Nw)' },
  { value: 'lines', label: 'Lines (~Nl)' },
  { value: 'short', label: 'Short (_)' },
  { value: 'medium', label: 'Medium (__)' },
  { value: 'long', label: 'Long (___)' },
];

/** When no/invalid filler is present, seed the inputs with this. */
const DEFAULT_AMOUNT = 3;

/**
 * @param {{
 *   mode: 'text'|'filler',
 *   label?: string,
 *   filler?: string,
 *   fillerStyleField?: object|null,
 *   fillerStyle?: string,
 *   onSwitchMode: (mode: 'text'|'filler') => void,
 *   onLabelChange: (value: string) => void,
 *   onFillerChange: (value: string) => void,
 *   onFillerStyleChange: (value: string) => void,
 * }} props
 */
export default function ContentControl({
  mode,
  label = '',
  filler = '',
  fillerStyleField = null,
  fillerStyle,
  onSwitchMode,
  onLabelChange,
  onFillerChange,
  onFillerStyleChange,
}) {
  const parsed = parseFiller(filler) || { unit: 'sentences', amount: DEFAULT_AMOUNT };
  const { unit } = parsed;
  const amount = parsed.amount ?? DEFAULT_AMOUNT;

  const handleUnitChange = (nextUnit) => {
    onFillerChange(
      isNumericUnit(nextUnit)
        ? formatFiller({ unit: nextUnit, amount })
        : formatFiller({ unit: nextUnit }),
    );
  };

  const handleAmountChange = (raw) => {
    const n = Math.max(1, Math.floor(Number(raw) || 1));
    onFillerChange(formatFiller({ unit, amount: n }));
  };

  return (
    <Box>
      <Box align="right" sx={{ pb: 1.5 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={mode}
          // ToggleButtonGroup yields null when the active button is re-clicked;
          // ignore it so a content mode is always selected.
          onChange={(_e, next) => { if (next) onSwitchMode(next); }}
          aria-label="content type"
          sx={{ mb: 1.5 }}
        >
          <ToggleButton value="text">Text</ToggleButton>
          <ToggleButton value="filler">Filler</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      {mode === 'text' ? (
        <TextField
          label="label"
          value={label}
          placeholder="(none)"
          onChange={(e) => onLabelChange(e.target.value)}
          size="small"
          fullWidth
          variant="outlined"
        />
      ) : (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <TextField
              select
              label="filler"
              value={unit}
              onChange={(e) => handleUnitChange(e.target.value)}
              size="small"
              fullWidth
              variant="outlined"
            >
              {UNIT_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
            {isNumericUnit(unit) && (
              <TextField
                type="number"
                label="amount"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                size="small"
                variant="outlined"
                sx={{ width: 96, flexShrink: 0 }}
              />
            )}
          </Stack>
          {fillerStyleField && (
            <SelectControl
              field={fillerStyleField}
              value={fillerStyle}
              onChange={onFillerStyleChange}
            />
          )}
        </Stack>
      )}
    </Box>
  );
}

ContentControl.propTypes = {
  mode: PropTypes.oneOf(['text', 'filler']).isRequired,
  label: PropTypes.string,
  filler: PropTypes.string,
  // The `filler` enum Field descriptor (squiggle/lorem/blocks), or null.
  // eslint-disable-next-line react/forbid-prop-types
  fillerStyleField: PropTypes.object,
  fillerStyle: PropTypes.string,
  onSwitchMode: PropTypes.func.isRequired,
  onLabelChange: PropTypes.func.isRequired,
  onFillerChange: PropTypes.func.isRequired,
  onFillerStyleChange: PropTypes.func.isRequired,
};
