import { useState } from 'react';
import Box from '@mui/material/Box';
import FontFamilyField from './FontFamilyField.jsx';
import useFontCatalog from '../../hooks/useFontCatalog.js';

const meta = {
  title: 'Document/FontFamilyField',
  component: FontFamilyField,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <Box sx={{ width: 360 }}><Story /></Box>],
};
export default meta;

/** @param {{ source: 'bunny'|'fontsource'|'google'|null, initial?: string }} props */
function Harness({ source, initial = '' }) {
  const catalog = useFontCatalog();
  const [value, setValue] = useState(initial);
  return (
    <FontFamilyField
      value={value}
      catalog={catalog}
      source={source}
      onPick={(family) => setValue(family)}
      onRequestSource={() => {}}
    />
  );
}

/** No online source chosen yet: the list offers "Search online fonts..." and the typed name. */
export const NoSourceYet = { render: () => <Harness source={null} /> };

/**
 * A source is chosen: typing filters the bundled online list (no request is made
 * until a font is actually picked -- this story only lists names).
 */
export const WithSource = { render: () => <Harness source="bunny" initial="Kalam" /> };

/** A typed system font. */
export const SystemFont = { render: () => <Harness source={null} initial="Marker Felt" /> };
