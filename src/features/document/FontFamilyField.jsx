// @ts-check
/**
 * FontFamilyField -- the one combobox that picks the document font.
 *
 * Typing filters the online font list that ships with the editor (no network
 * request), grouped under "Online fonts from <source>" with a "Change source"
 * link. Until the user has chosen a source, a "Search online fonts..." row
 * stands in for that group and opens the "Load online fonts from" prompt
 * instead. The last row always offers the typed name as a font installed on
 * this computer ("Use "X" from this computer"), which is never embedded.
 *
 * Presentational: the catalog, the source and every action come in as props.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import SearchIcon from '@mui/icons-material/Search';
import ComputerIcon from '@mui/icons-material/Computer';

import { cleanFamily, isValidFamily } from '../../utils/documentProps.js';
import { findFont, searchFonts } from '../../utils/fontCatalog.js';
import { getFontSource } from '../../utils/fontSources.js';

/**
 * @typedef {import('../../utils/fontCatalog.js').CatalogFont} CatalogFont
 * @typedef {{ kind: 'online', font: CatalogFont }
 *   | { kind: 'local', family: string, valid: boolean }
 *   | { kind: 'search' }} FamilyOption
 */

const GROUP = { online: 'online', local: 'local', search: 'search' };

/** @param {FamilyOption|string} o */
function labelOf(o) {
  if (typeof o === 'string') return o;
  if (o.kind === 'online') return o.font.family;
  if (o.kind === 'local') return o.family;
  return '';
}

/**
 * @param {{
 *   value: string,
 *   catalog: CatalogFont[]|null,
 *   source: import('../../utils/fontSources.js').FontSourceId|null,
 *   busy?: boolean,
 *   onPick: (family: string, entry: CatalogFont|null) => void,
 *   onRequestSource: () => void,
 *   autoFocus?: boolean,
 * }} props
 */
export default function FontFamilyField({
  value, catalog, source, busy = false, onPick, onRequestSource, autoFocus = false,
}) {
  const [input, setInput] = useState(value);
  useEffect(() => { setInput(value); }, [value]);
  // The source prompt takes focus; keep what was typed so the online matches
  // show for it as soon as focus comes back.
  const keepInputRef = useRef(false);

  const sourceLabel = getFontSource(source)?.label ?? '';
  const query = cleanFamily(input);
  const invalid = query !== '' && !isValidFamily(query);
  const count = catalog ? `${(Math.floor(catalog.length / 100) * 100).toLocaleString()}+` : '1,900+';

  /** @type {FamilyOption[]} */
  const options = useMemo(() => {
    /** @type {FamilyOption[]} */
    const out = [];
    if (source && catalog) {
      // Opening the list on the current value shows the default list, not one row.
      const q = query === cleanFamily(value) ? '' : query;
      for (const font of searchFonts(catalog, q, 40)) out.push({ kind: 'online', font });
    } else if (!source) {
      out.push({ kind: 'search' });
    }
    const exactOnline = source && catalog ? findFont(catalog, query) : undefined;
    if (query && !exactOnline) out.push({ kind: 'local', family: query, valid: isValidFamily(query) });
    return out;
  }, [catalog, source, query, value]);

  /** @param {FamilyOption|string|null} picked */
  const handlePick = (picked) => {
    if (picked == null) return;
    if (typeof picked === 'string') {
      const family = cleanFamily(picked);
      if (!isValidFamily(family)) return;
      const entry = source && catalog ? findFont(catalog, family) ?? null : null;
      setInput(entry ? entry.family : family);
      onPick(entry ? entry.family : family, entry);
      return;
    }
    if (picked.kind === 'search') {
      keepInputRef.current = true;
      onRequestSource();
      return;
    }
    if (picked.kind === 'local') {
      if (!picked.valid) return;
      setInput(picked.family);
      onPick(picked.family, null);
      return;
    }
    setInput(picked.font.family);
    onPick(picked.font.family, picked.font);
  };

  return (
    <Autocomplete
      freeSolo
      autoHighlight
      disableClearable
      options={options}
      value={value || ''}
      inputValue={input}
      filterOptions={(x) => x}
      getOptionLabel={labelOf}
      getOptionDisabled={(o) => typeof o !== 'string' && o.kind === 'local' && !o.valid}
      isOptionEqualToValue={(o, v) => labelOf(o) === labelOf(v)}
      groupBy={(o) => (typeof o === 'string' ? GROUP.local : GROUP[o.kind])}
      onChange={(_e, picked) => handlePick(/** @type {*} */ (picked))}
      onInputChange={(_e, next, reason) => {
        if (reason === 'input') setInput(next);
      }}
      openOnFocus
      onBlur={() => {
        // Leaving the field with an unpicked edit puts the committed value back
        // (except while the source prompt is open over it).
        if (keepInputRef.current) {
          keepInputRef.current = false;
          return;
        }
        if (cleanFamily(input) !== cleanFamily(value)) setInput(value);
      }}
      renderGroup={(params) => (
        <Box component="li" key={params.key} sx={{ listStyle: 'none' }}>
          {params.group === GROUP.online && (
            <Stack
              direction="row"
              alignItems="baseline"
              spacing={1}
              sx={{ px: 2, pt: 1, pb: 0.5, position: 'sticky', top: -8, bgcolor: 'background.paper', zIndex: 1 }}
            >
              <Typography variant="overline" color="text.secondary" sx={{ flex: 1, lineHeight: 1.6 }}>
                Online fonts from {sourceLabel}
              </Typography>
              <Link
                component="button"
                type="button"
                variant="caption"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  keepInputRef.current = true;
                  onRequestSource();
                }}
              >
                Change source
              </Link>
            </Stack>
          )}
          {params.group === GROUP.local && (
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ display: 'block', px: 2, pt: 1, lineHeight: 1.6 }}
            >
              On this computer
            </Typography>
          )}
          <Box component="ul" sx={{ p: 0 }}>{params.children}</Box>
        </Box>
      )}
      renderOption={(props, option) => {
        const { key, ...rest } = /** @type {*} */ (props);
        if (typeof option === 'string') return null;
        if (option.kind === 'search') {
          return (
            <Box component="li" key={key} {...rest} sx={{ gap: 1.5 }}>
              <SearchIcon fontSize="small" color="action" />
              <Box>
                <Typography variant="body2">Search online fonts&hellip;</Typography>
                <Typography variant="caption" color="text.secondary">
                  {count} free fonts, downloaded when picked
                </Typography>
              </Box>
            </Box>
          );
        }
        if (option.kind === 'local') {
          return (
            <Box component="li" key={key} {...rest} sx={{ gap: 1.5 }}>
              <ComputerIcon fontSize="small" color="action" />
              <Box>
                <Typography variant="body2">Use &ldquo;{option.family}&rdquo; from this computer</Typography>
                <Typography variant="caption" color={option.valid ? 'text.secondary' : 'error'}>
                  {option.valid ? 'Not embedded in exports' : 'Use letters, digits, spaces, - _ . only'}
                </Typography>
              </Box>
            </Box>
          );
        }
        return (
          <Box component="li" key={key} {...rest}>
            <Box>
              <Typography variant="body2">{option.font.family}</Typography>
              <Typography variant="caption" color="text.secondary">
                {option.font.category}
                {option.font.hasBold ? ', has bold' : ''}
              </Typography>
            </Box>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Font family"
          size="small"
          autoFocus={autoFocus}
          error={invalid}
          helperText={invalid ? 'Use letters, digits, spaces, - _ . only' : undefined}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              endAdornment: (
                <>
                  {busy && <CircularProgress size={16} aria-label="Loading font" />}
                  {params.slotProps.input.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
}

FontFamilyField.propTypes = {
  value: PropTypes.string.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  catalog: PropTypes.array,
  source: PropTypes.oneOf(['bunny', 'fontsource', 'google']),
  busy: PropTypes.bool,
  onPick: PropTypes.func.isRequired,
  onRequestSource: PropTypes.func.isRequired,
  autoFocus: PropTypes.bool,
};
