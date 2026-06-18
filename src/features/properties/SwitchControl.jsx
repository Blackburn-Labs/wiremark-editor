// @ts-check
/**
 * SwitchControl -- a toggle for a `boolean`-typed prop field.
 * In wiremark a boolean prop is a bare keyless flag (present == true), so
 * this control's `value` is interpreted truthily and `onChange` is called with a
 * boolean. Presentational / storyable.
 */
import PropTypes from 'prop-types';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';

/**
 * Coerce the loosely-typed incoming value to a boolean. Treats the literal
 * strings "false"/"0"/"" as off so a flag's stored value cannot read as on.
 * @param {*} value
 * @returns {boolean}
 */
function toBool(value) {
  if (typeof value === 'boolean') return value;
  if (value == null) return false;
  const s = String(value).toLowerCase();
  return s !== '' && s !== 'false' && s !== '0';
}

/**
 * @param {{
 *   field: { name: string },
 *   value: *,
 *   onChange: (on: boolean) => void,
 * }} props
 */
export default function SwitchControl({ field, value, onChange }) {
  const checked = toBool(value);
  return (
    <FormControlLabel
      label={field.name}
      control={
        <Switch
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          size="small"
        />
      }
    />
  );
}

SwitchControl.propTypes = {
  field: PropTypes.shape({
    name: PropTypes.string.isRequired,
  }).isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  value: PropTypes.any,
  onChange: PropTypes.func.isRequired,
};
