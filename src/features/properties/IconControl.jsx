// @ts-check
/**
 * IconControl -- a searchable picker for an `icon`-typed prop field.
 * Icon names are free-form in wiremark, so this uses a
 * free-solo Autocomplete seeded with the curated `registryAdapter.iconNames()`
 * list: the user can pick a suggestion or type any name. Clearing sets ''.
 * Presentational / storyable (no store access).
 */
import PropTypes from 'prop-types';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { iconNames } from '../../utils/registryAdapter.js';

/**
 * @param {{
 *   field: { name: string },
 *   value: string|undefined,
 *   onChange: (newValue: string) => void,
 * }} props
 */
export default function IconControl({ field, value, onChange }) {
  const options = iconNames();
  return (
    <Autocomplete
      freeSolo
      autoHighlight
      options={/** @type {string[]} */ ([...options])}
      value={value ?? ''}
      onChange={(_e, newValue) => onChange(newValue ?? '')}
      onInputChange={(_e, newValue, reason) => {
        if (reason === 'input' || reason === 'clear') onChange(newValue ?? '');
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={field.name}
          size="small"
          fullWidth
          variant="outlined"
        />
      )}
      size="small"
    />
  );
}

IconControl.propTypes = {
  field: PropTypes.shape({
    name: PropTypes.string.isRequired,
  }).isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};
