// @ts-check
/**
 * NumberControl -- a numeric input for `number`/`ratio`-typed prop fields.
 * Values flow as strings (the token model is text); an
 * empty string clears the prop. Presentational / storyable.
 */
import PropTypes from 'prop-types';
import TextField from '@mui/material/TextField';

/**
 * @param {{
 *   field: { name: string, default?: * },
 *   value: string|undefined,
 *   onChange: (newValue: string) => void,
 * }} props
 */
export default function NumberControl({ field, value, onChange }) {
  const placeholder = field.default != null ? String(field.default) : '';
  return (
    <TextField
      type="number"
      label={field.name}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      size="small"
      fullWidth
      variant="outlined"
    />
  );
}

NumberControl.propTypes = {
  field: PropTypes.shape({
    name: PropTypes.string.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    default: PropTypes.any,
  }).isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};
