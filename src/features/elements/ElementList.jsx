// @ts-check
/**
 * ElementList -- the category-grouped component palette. Presentational: builds
 * its groups from `registryAdapter.componentsByCategory()` and filters
 * case-insensitively by the optional `filter` string on the component name.
 * Each group gets a sticky subheader; each component renders an
 * `ElementListItem`. Selection + click are delegated up via props so this is
 * storyable without the store.
 */
import { useMemo } from 'react';
import PropTypes from 'prop-types';
import List from '@mui/material/List';
import ListSubheader from '@mui/material/ListSubheader';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

import { componentsByCategory } from '../../utils/registryAdapter.js';
import ElementListItem from './ElementListItem.jsx';

/**
 * Build the filtered, sorted, category-grouped view of the registry.
 * @param {string} filter
 * @returns {Array<{ category: string, names: string[] }>}
 */
function buildGroups(filter) {
  const needle = filter.trim().toLowerCase();
  const byCategory = componentsByCategory();
  return Object.keys(byCategory)
    .sort()
    .map((category) => ({
      category,
      names: byCategory[category].filter(
        (name) => !needle || name.toLowerCase().includes(needle),
      ),
    }))
    .filter((group) => group.names.length > 0);
}

export default function ElementList({ filter = '', selectedName = null, onSelect }) {
  const groups = useMemo(() => buildGroups(filter), [filter]);

  if (groups.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No components match{filter ? ` "${filter.trim()}"` : ''}.
        </Typography>
      </Box>
    );
  }

  return (
    <List dense disablePadding sx={{ width: '100%' }}>
      {groups.map((group) => (
        <li key={group.category}>
          <ul style={{ padding: 0, listStyle: 'none' }}>
            <ListSubheader
              disableSticky={false}
              sx={(theme) => ({
                lineHeight: '2em',
                textTransform: 'capitalize',
                fontWeight: 700,
                color: 'text.secondary',
                // Opaque base + a translucent action.hover tint on top so the
                // sticky header stays readable while rows scroll beneath it.
                bgcolor: 'background.paper',
                backgroundImage: `linear-gradient(${theme.palette.action.hover}, ${theme.palette.action.hover})`,
                borderBottom: `1px solid ${theme.palette.divider}`,
              })}
            >
              {group.category}
            </ListSubheader>
            {group.names.map((name) => (
              <ElementListItem
                key={name}
                name={name}
                selected={name === selectedName}
                onClick={onSelect}
              />
            ))}
          </ul>
        </li>
      ))}
    </List>
  );
}

ElementList.propTypes = {
  /** Case-insensitive substring filter applied to component names. */
  filter: PropTypes.string,
  /** The currently selected component name (highlights its row). */
  selectedName: PropTypes.string,
  /** Called with the component name when an item is selected. */
  onSelect: PropTypes.func,
};
