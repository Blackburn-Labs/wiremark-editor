// @ts-check
/**
 * IdRefControl -- a `#id` picker for `id`/`ref`-typed prop fields such as `to=`
 * / `href=`. The select is seeded with the document's
 * existing ids (passed in as `idOptions`, WITHOUT the leading `#`); the UI shows
 * them with a `#` prefix. The stored value is kept WITHOUT the `#` (the token
 * model carries `to=home`, not `to=#home`). Also allows free typing of an id
 * that does not yet exist via a free-solo Autocomplete. Presentational.
 */
import PropTypes from 'prop-types';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

/**
 * @param {{
 *   field: { name: string },
 *   value: string|undefined,
 *   idOptions?: string[],
 *   onChange: (newValue: string) => void,
 * }} props
 */
export default function IdRefControl({ field, value, idOptions = [], onChange }) {
  // Strip a leading '#' if a caller stored it; display adds the '#' back.
  const strip = (/** @type {string} */ s) => (s.startsWith('#') ? s.slice(1) : s);
  const options = idOptions.map(strip);
  return (
    <Autocomplete
      freeSolo
      autoHighlight
      options={/** @type {string[]} */ (options)}
      value={value ?? ''}
      getOptionLabel={(opt) => (opt ? `#${strip(opt)}` : '')}
      onChange={(_e, newValue) => onChange(strip(newValue ?? ''))}
      onInputChange={(_e, newValue, reason) => {
        if (reason === 'input' || reason === 'clear') {
          // Free-typed text may include a leading '#'; normalize it off.
          onChange(strip((newValue ?? '').trim()));
        }
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={field.name}
          placeholder="#id"
          size="small"
          fullWidth
          variant="outlined"
        />
      )}
      size="small"
    />
  );
}

IdRefControl.propTypes = {
  field: PropTypes.shape({
    name: PropTypes.string.isRequired,
  }).isRequired,
  value: PropTypes.string,
  idOptions: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func.isRequired,
};
