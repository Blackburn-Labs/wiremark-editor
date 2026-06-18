// @ts-check
/**
 * SelectControl -- a dropdown for an `enum`-typed prop field.
 * The select is seeded with the field's enum `values`. A leading "(unset)"
 * option clears the prop (onChange('')). Presentational / storyable.
 */
import PropTypes from 'prop-types';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';

/**
 * @param {{
 *   field: { name: string, values?: string[], default?: * },
 *   value: string|undefined,
 *   onChange: (newValue: string) => void,
 * }} props
 */
export default function SelectControl({ field, value, onChange }) {
  const values = Array.isArray(field.values) ? field.values : [];
  return (
    <TextField
      select
      label={field.name}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      size="small"
      fullWidth
      variant="outlined"
    >
      <MenuItem value="">
        <em>(unset)</em>
      </MenuItem>
      {values.map((v) => (
        <MenuItem key={v} value={v}>
          {v}
          {field.default === v ? ' (default)' : ''}
        </MenuItem>
      ))}
    </TextField>
  );
}

SelectControl.propTypes = {
  field: PropTypes.shape({
    name: PropTypes.string.isRequired,
    values: PropTypes.arrayOf(PropTypes.string),
    // eslint-disable-next-line react/forbid-prop-types
    default: PropTypes.any,
  }).isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};
