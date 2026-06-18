// @ts-check
/**
 * TextControl -- a single-line text input for a `string`-typed prop field.
 * Presentational: it takes the registryAdapter `Field`,
 * the current string value, and an `onChange(newValue)` callback. It holds no
 * store state so it is fully storyable.
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
export default function TextControl({ field, value, onChange }) {
  const placeholder = field.default != null ? String(field.default) : '';
  return (
    <TextField
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

TextControl.propTypes = {
  field: PropTypes.shape({
    name: PropTypes.string.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    default: PropTypes.any,
  }).isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};
