// @ts-check
/**
 * ElementListItem -- one component row in the palette. Presentational: takes a
 * component `name` plus selection/click props and reads its metadata straight
 * from `registryAdapter` (a pure, never-throwing bridge into the core
 * registry). Shows the component name, its category as a small Chip, and tiny
 * letter-chip affordances for the structural flags (Container / Sizing / Text).
 */
import PropTypes from 'prop-types';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';

import { categoryOf, flagsFor } from '../../utils/registryAdapter.js';

/**
 * The structural-flag affordances, in display order. Each renders as a tiny
 * letter Chip with a tooltip when the flag is present for the component.
 * @type {Array<{ key: 'container'|'sizing'|'text', letter: string, label: string, color: 'primary'|'secondary'|'info' }>}
 */
const FLAG_AFFORDANCES = [
  { key: 'container', letter: 'C', label: 'Container (can hold children)', color: 'primary' },
  { key: 'sizing', letter: 'S', label: 'Sizing (width/height)', color: 'secondary' },
  { key: 'text', letter: 'T', label: 'Text (filler content)', color: 'info' },
];

export default function ElementListItem({ name, selected = false, onClick }) {
  const category = categoryOf(name);
  const flags = flagsFor(name);

  return (
    <ListItemButton
      dense
      selected={selected}
      onClick={onClick ? () => onClick(name) : undefined}
      sx={{ borderRadius: 1, gap: 1 }}
    >
      <ListItemText
        primary={name}
        primaryTypographyProps={{ variant: 'body2', noWrap: true }}
      />
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
        {FLAG_AFFORDANCES.filter((f) => flags[f.key]).map((f) => (
          <Tooltip key={f.key} title={f.label} arrow>
            <Chip
              label={f.letter}
              size="small"
              color={f.color}
              variant="outlined"
              sx={{
                height: 18,
                minWidth: 18,
                '& .MuiChip-label': { px: 0.5, fontSize: 10, fontWeight: 700 },
              }}
            />
          </Tooltip>
        ))}
        <Chip
          label={category}
          size="small"
          variant="filled"
          sx={{ height: 18, '& .MuiChip-label': { px: 0.75, fontSize: 10 } }}
        />
      </Stack>
    </ListItemButton>
  );
}

ElementListItem.propTypes = {
  /** The component name to display (must exist in the core registry). */
  name: PropTypes.string.isRequired,
  /** Whether this row is the selected one. */
  selected: PropTypes.bool,
  /** Called with the component name when the row is clicked. */
  onClick: PropTypes.func,
};
