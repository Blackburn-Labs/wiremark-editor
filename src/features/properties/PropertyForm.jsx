// @ts-check
/**
 * PropertyForm -- the dynamic, registry-driven property editor for one
 * `WiremarkElement` (the SPEC's "element property panel").
 *
 * Presentational: it takes the element, the document's `#id` options, and an
 * `onChangeTokens(newTokens)` callback. It derives the editable fields from the
 * live `@wiremark/core` registry via `registryAdapter.fieldsFor` /
 * `flagsFor`, reads current values off the element (`element.getValue`), and on
 * any control change computes the next `Token[]` with the pure `utils/tokenEdit`
 * helpers and hands it back. It never touches the store, so it is storyable.
 *
 * Layout:
 *  - a dedicated `#id` text field at the top,
 *  - for `text:true` components, a `ContentControl` (a Text|Filler toggle) that
 *    owns the literal label OR the bare filler amount plus the relocated `filler`
 *    style enum; for other components with a literal slot, a plain keyless "label"
 *    field,
 *  - width / height controls when the component is `sizing`,
 *  - the `component`-group fields (a non-text component's `filler` enum still
 *    surfaces here as a normal Select),
 *  - the `universal`-group fields collapsed under an "Advanced" Accordion.
 */
import { useMemo } from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Chip from '@mui/material/Chip';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import {
  fieldsFor,
  flagsFor,
  keylessSlotsFor,
} from '../../utils/registryAdapter.js';
import {
  setKeyedProp,
  clearKeyedProp,
  setProp,
  clearProp,
  toggleFlag,
  setKeylessLabel,
  setIdToken,
  getKeylessFiller,
  setKeylessFiller,
} from '../../utils/tokenEdit.js';

import TextControl from './TextControl.jsx';
import SelectControl from './SelectControl.jsx';
import SwitchControl from './SwitchControl.jsx';
import NumberControl from './NumberControl.jsx';
import IconControl from './IconControl.jsx';
import IdRefControl from './IdRefControl.jsx';
import ContentControl from './ContentControl.jsx';

/**
 * Whether a string value needs double-quoting when stored as a token value
 * (contains whitespace). The serializer re-quotes any token flagged `quoted`.
 * @param {string} v
 * @returns {boolean}
 */
function needsQuoting(v) {
  return /\s/.test(v);
}

/**
 * Whether `value` can be written as the BARE keyless token for `field`'s slot,
 * so a prop currently held by a keyless token can be updated in place rather
 * than converted to a keyed `key=value` token. Enum/preset values must be in the
 * field's domain; number values must parse as a number. Everything else converts.
 * @param {import('../../utils/registryAdapter.js').Field} field
 * @param {string} value
 * @returns {boolean}
 */
function canStayKeyless(field, value) {
  if (field.control === 'select') return Array.isArray(field.values) && field.values.includes(value);
  if (field.control === 'number') return value.trim() !== '' && !Number.isNaN(Number(value));
  return false;
}

/**
 * The current value to feed a field's control. Boolean `switch` fields are bare
 * flags (present == true), which `getValue` cannot resolve, so read their
 * presence via `hasFlag`; every other field resolves through `getValue`.
 * @param {import('../../domain/WiremarkElement.js').default} element
 * @param {import('../../utils/registryAdapter.js').Field} field
 * @returns {*}
 */
function valueForField(element, field) {
  if (field.control === 'switch') return element.hasFlag(field.name);
  return element.getValue(field.name);
}

/**
 * Render the right control for a field. `value` is the current resolved string
 * (or undefined). `onChange(newValue)` receives the control's new value.
 * @param {{
 *   field: import('../../utils/registryAdapter.js').Field,
 *   value: string|undefined,
 *   idOptions: string[],
 *   onChange: (v: *) => void,
 * }} args
 */
function renderControl({ field, value, idOptions, onChange }) {
  switch (field.control) {
    case 'select':
      return <SelectControl field={field} value={value} onChange={onChange} />;
    case 'switch':
      return <SwitchControl field={field} value={value} onChange={onChange} />;
    case 'number':
      return <NumberControl field={field} value={value} onChange={onChange} />;
    case 'icon':
      return <IconControl field={field} value={value} onChange={onChange} />;
    case 'idref':
      return (
        <IdRefControl
          field={field}
          value={value}
          idOptions={idOptions}
          onChange={onChange}
        />
      );
    case 'text':
    default:
      return <TextControl field={field} value={value} onChange={onChange} />;
  }
}

/**
 * @param {{
 *   element: import('../../domain/WiremarkElement.js').default,
 *   idOptions?: string[],
 *   onChangeTokens: (tokens: import('../../utils/wmParser.js').Token[]) => void,
 * }} props
 */
export default function PropertyForm({ element, idOptions = [], onChangeTokens }) {
  const componentName = element?.component || '';

  const { fields, flags, hasLiteralSlot, literalSlotProps } = useMemo(() => {
    if (!componentName) {
      return {
        fields: [],
        flags: { container: false, sizing: false, text: false },
        hasLiteralSlot: false,
        literalSlotProps: new Set(),
      };
    }
    const all = fieldsFor(componentName);
    const slots = keylessSlotsFor(componentName);
    const literalSlots = slots.filter((s) => s.kind === 'literal');
    return {
      fields: all,
      flags: flagsFor(componentName),
      hasLiteralSlot: literalSlots.length > 0,
      // Prop names already edited by the dedicated keyless "label" field at the
      // top -- skip them in the keyed field lists so they don't render twice.
      literalSlotProps: new Set(literalSlots.map((s) => s.to)),
    };
  }, [componentName]);

  const tokens = element?.tokens ?? [];
  // For text components the `filler` STYLE enum is relocated into ContentControl
  // (it only matters when filler is on), so drop it from the keyed field lists.
  const fillerStyleField = flags.text ? fields.find((f) => f.name === 'filler') ?? null : null;
  const componentFields = fields.filter(
    (f) => f.group === 'component'
      && !literalSlotProps.has(f.name)
      && !(flags.text && f.name === 'filler'),
  );
  const universalFields = fields.filter(
    (f) => f.group === 'universal' && !literalSlotProps.has(f.name),
  );

  // ----- change handlers (each computes a fresh Token[] then bubbles up) -----

  /**
   * Apply a keyed prop change. Empty/undefined clears the prop. `switch` fields
   * route through `toggleFlag` instead (booleans are bare flags in wiremark).
   * @param {import('../../utils/registryAdapter.js').Field} field
   * @param {*} newValue
   */
  const handleFieldChange = (field, newValue) => {
    if (field.control === 'switch') {
      onChangeTokens(toggleFlag(tokens, field.name, !!newValue));
      return;
    }
    const str = newValue == null ? '' : String(newValue);
    // A prop can currently be set by a keyless token (e.g. the `body2` in
    // `Typography "Hi" body2` fills the `variant` slot). Find it so we update it
    // in place instead of appending a conflicting `variant=...` keyed token.
    const keylessIndex = typeof element?.keylessIndexFor === 'function'
      ? element.keylessIndexFor(field.name)
      : -1;
    if (str === '') {
      onChangeTokens(clearProp(tokens, field.name, keylessIndex));
      return;
    }
    onChangeTokens(setProp(tokens, field.name, str, {
      quoted: needsQuoting(str),
      keylessIndex,
      keepKeyless: keylessIndex >= 0 && canStayKeyless(field, str),
    }));
  };

  /** @param {string} newId */
  const handleIdChange = (newId) => {
    const trimmed = (newId || '').trim();
    onChangeTokens(setIdToken(tokens, trimmed === '' ? null : trimmed));
  };

  /** @param {string} label */
  const handleLabelChange = (label) => {
    // Empty string is a valid label (""), so only null removes it. The text
    // field cannot represent "no label" distinctly from "" here, so we keep ""
    // as a present empty label, matching tokenEdit semantics.
    onChangeTokens(setKeylessLabel(tokens, label));
  };

  /**
   * Width / height are stored as keyed tokens (lossless round-trip).
   * @param {string} key
   * @param {string} value
   */
  const handleSizingChange = (key, value) => {
    if (value === '') onChangeTokens(clearKeyedProp(tokens, key));
    else onChangeTokens(setKeyedProp(tokens, key, value, { quoted: needsQuoting(value) }));
  };

  /**
   * Switch a text component between literal-text and filler content. The two are
   * mutually exclusive, so switching clears the other side: entering Filler drops
   * the quoted label and seeds a default `~3`; leaving it removes the filler
   * amount AND the now-pointless `filler` style prop.
   * @param {'text'|'filler'} next
   */
  const handleSwitchContentMode = (next) => {
    if (next === 'filler') {
      onChangeTokens(setKeylessFiller(setKeylessLabel(tokens, null), '~3'));
    } else {
      onChangeTokens(clearKeyedProp(setKeylessFiller(tokens, null), 'filler'));
    }
  };

  /** @param {string} raw the new filler token (e.g. `~2l`); empty clears it */
  const handleFillerChange = (raw) => {
    onChangeTokens(setKeylessFiller(tokens, raw || null));
  };

  if (!element) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No element selected.
        </Typography>
      </Box>
    );
  }

  const currentId = element.wmId() ?? '';
  // The keyless literal label: the first quoted keyless token's value.
  const literalToken = tokens.find((t) => t.kind === 'keyless' && t.quoted);
  const currentLabel = literalToken ? literalToken.value : '';
  // Content mode is derived purely from the tokens (no hidden UI state): a bare
  // filler token present => Filler, otherwise Text.
  const currentFiller = getKeylessFiller(tokens);
  const contentMode = currentFiller != null ? 'filler' : 'text';
  const currentFillerStyle = element.getValue('filler') ?? '';

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {componentName || 'Unknown'}
        </Typography>
        {flags.container && <Chip size="small" label="container" variant="outlined" />}
        {flags.sizing && <Chip size="small" label="sizing" variant="outlined" />}
        {flags.text && <Chip size="small" label="text" variant="outlined" />}
      </Stack>

      {componentName && fields.length === 0 && (
        <Typography variant="caption" color="warning.main" sx={{ display: 'block', mb: 1.5 }}>
          Unknown component &quot;{componentName}&quot; — finish typing a valid component name to edit
          its properties.
        </Typography>
      )}

      <Stack spacing={2}>
        <TextField
          label="#id"
          value={currentId}
          placeholder="(none)"
          onChange={(e) => handleIdChange(e.target.value)}
          size="small"
          fullWidth
          variant="outlined"
        />

        {hasLiteralSlot && !flags.text && (
          <TextField
            label="label"
            value={currentLabel}
            placeholder="(none)"
            onChange={(e) => handleLabelChange(e.target.value)}
            size="small"
            fullWidth
            variant="outlined"
          />
        )}

        {flags.text && (
          <ContentControl
            mode={contentMode}
            label={currentLabel}
            filler={currentFiller ?? ''}
            fillerStyleField={fillerStyleField}
            fillerStyle={currentFillerStyle}
            onSwitchMode={handleSwitchContentMode}
            onLabelChange={handleLabelChange}
            onFillerChange={handleFillerChange}
            onFillerStyleChange={(v) => handleFieldChange(fillerStyleField, v)}
          />
        )}

        {flags.sizing && (
          <>
            <Divider textAlign="left">
              <Typography variant="caption" color="text.secondary">
                Sizing
              </Typography>
            </Divider>
            <Stack direction="row" spacing={2}>
              <TextField
                label="width"
                value={element.getValue('width') ?? ''}
                onChange={(e) => handleSizingChange('width', e.target.value)}
                size="small"
                fullWidth
                variant="outlined"
              />
              <TextField
                label="height"
                value={element.getValue('height') ?? ''}
                onChange={(e) => handleSizingChange('height', e.target.value)}
                size="small"
                fullWidth
                variant="outlined"
              />
            </Stack>
          </>
        )}

        {componentFields.length > 0 && (
          <>
            <Divider textAlign="left">
              <Typography variant="caption" color="text.secondary">
                Properties
              </Typography>
            </Divider>
            {componentFields.map((field) => (
              <Box key={field.name}>
                {renderControl({
                  field,
                  value: valueForField(element, field),
                  idOptions,
                  onChange: (v) => handleFieldChange(field, v),
                })}
              </Box>
            ))}
          </>
        )}

        {universalFields.length > 0 && (
          <Accordion disableGutters elevation={0} sx={{ '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0 }}>
              <Typography variant="subtitle2">Advanced</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0 }}>
              <Stack spacing={2}>
                {universalFields.map((field) => (
                  <Box key={field.name}>
                    {renderControl({
                      field,
                      value: valueForField(element, field),
                      idOptions,
                      onChange: (v) => handleFieldChange(field, v),
                    })}
                  </Box>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        )}
      </Stack>
    </Box>
  );
}

PropertyForm.propTypes = {
  // A WiremarkElement instance (duck-typed: exposes component, tokens,
  // getValue, wmId). Not validated structurally beyond presence.
  // eslint-disable-next-line react/forbid-prop-types
  element: PropTypes.object,
  idOptions: PropTypes.arrayOf(PropTypes.string),
  onChangeTokens: PropTypes.func.isRequired,
};
