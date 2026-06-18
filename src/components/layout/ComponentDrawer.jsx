// @ts-check
/**
 * ComponentDrawer -- the left palette drawer (SPEC layout mockup). A "Filter"
 * TextField (search icon) drives local filter state, feeding the elements
 * feature's `ElementList`. Selecting a component appends a starter line for it
 * to the END of the current source (text-bearing components get a quoted
 * placeholder label), then dispatches `applyEdit`.
 */
import { useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';

import { selectSource, applyEdit } from '../../store/documentSlice.js';
import { flagsFor } from '../../utils/registryAdapter.js';
import ElementList from '../../features/elements/ElementList.jsx';

const DEFAULT_WIDTH = 280;

/**
 * Build a starter line for `name` and append it to `source` at an appropriate
 * indent. The new line is placed at the END of the document; its indent matches
 * the indentation of the last non-blank line so it lands as a sibling there.
 * Text-bearing components (per `flagsFor(name).text`) get a quoted placeholder.
 * @param {string} source the current wiremark source
 * @param {string} name the component to insert
 * @returns {string} the new source
 */
export function buildInsertedSource(source, name) {
  const text = typeof source === 'string' ? source : '';
  const lines = text.length ? text.replace(/\n+$/, '').split('\n') : [];

  // Find the indent of the last non-blank line to place the new line as a sibling.
  let indent = '';
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (lines[i].trim() !== '') {
      const m = lines[i].match(/^(\s*)/);
      indent = m ? m[1] : '';
      break;
    }
  }

  const flags = flagsFor(name);
  const starter = flags.text ? `${name} "${name}"` : name;
  const newLine = `${indent}${starter}`;

  if (lines.length === 0) return `${newLine}\n`;
  return `${lines.join('\n')}\n${newLine}\n`;
}

export default function ComponentDrawer({ width = DEFAULT_WIDTH, variant = 'permanent' }) {
  const dispatch = useDispatch();
  const source = useSelector(selectSource);
  const [filter, setFilter] = useState('');
  const [selectedName, setSelectedName] = useState(null);

  /** @param {string} name */
  const handleSelect = (name) => {
    setSelectedName(name);
    dispatch(applyEdit(buildInsertedSource(source, name)));
  };

  return (
    <Drawer
      variant={variant}
      anchor="left"
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          position: variant === 'permanent' ? 'relative' : undefined,
        },
      }}
    >
      <Stack spacing={1} sx={{ p: 1, height: '100%', overflow: 'hidden' }}>
        <TextField
          placeholder="Filter"
          size="small"
          fullWidth
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <ElementList filter={filter} selectedName={selectedName} onSelect={handleSelect} />
        </Box>
      </Stack>
    </Drawer>
  );
}

ComponentDrawer.propTypes = {
  /** Drawer width in pixels. */
  width: PropTypes.number,
  /** MUI Drawer variant. */
  variant: PropTypes.oneOf(['permanent', 'persistent', 'temporary']),
};
