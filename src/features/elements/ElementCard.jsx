// @ts-check
/**
 * ElementCard -- a reference Card for a single component, shown when a palette
 * item is focused/selected. Presentational: reads everything from
 * `registryAdapter` (category, structural flags, and the editable prop list via
 * `fieldsFor`). Summarizes the props as a count plus the first few prop names.
 */
import PropTypes from 'prop-types';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';

import { categoryOf, flagsFor, fieldsFor } from '../../utils/registryAdapter.js';

/** How many prop names to spell out before summarizing the remainder. */
const MAX_PREVIEW_PROPS = 5;

/** Structural flags rendered as labeled chips when present. */
const FLAG_LABELS = [
  { key: 'container', label: 'Container' },
  { key: 'sizing', label: 'Sizing' },
  { key: 'text', label: 'Text' },
];

export default function ElementCard({ name }) {
  const category = categoryOf(name);
  const flags = flagsFor(name);
  const fields = fieldsFor(name);

  const propNames = fields.map((f) => f.name);
  const preview = propNames.slice(0, MAX_PREVIEW_PROPS);
  const remaining = propNames.length - preview.length;
  const activeFlags = FLAG_LABELS.filter((f) => flags[f.key]);

  return (
    <Card variant="outlined" sx={{ minWidth: 240, maxWidth: 360 }}>
      <CardContent>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1 }}
        >
          <Typography variant="h6" component="h3" noWrap>
            {name}
          </Typography>
          <Chip
            label={category}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ textTransform: 'capitalize' }}
          />
        </Stack>

        {activeFlags.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
            {activeFlags.map((f) => (
              <Chip key={f.key} label={f.label} size="small" variant="filled" />
            ))}
          </Stack>
        )}

        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {propNames.length} {propNames.length === 1 ? 'prop' : 'props'}
          </Typography>
          {preview.length > 0 ? (
            <Typography variant="body2" color="text.secondary">
              {preview.join(', ')}
              {remaining > 0 ? `, +${remaining} more` : ''}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No editable props.
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

ElementCard.propTypes = {
  /** The component name to describe (must exist in the core registry). */
  name: PropTypes.string.isRequired,
};
