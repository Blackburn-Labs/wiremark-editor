import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import DocumentPropertiesForm from './DocumentPropertiesForm.jsx';

const meta = {
  title: 'Document/DocumentPropertiesForm',
  component: DocumentPropertiesForm,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <Paper variant="outlined" sx={{ width: 380, p: 2 }}><Story /></Paper>],
};
export default meta;

/** @param {{ initial: import('../../utils/documentProps.js').DocumentProps }} props */
function Harness({ initial }) {
  const [value, setValue] = useState(initial);
  return (
    <Box>
      <DocumentPropertiesForm value={value} onChange={setValue} source={null} onRequestSource={() => {}} />
      <Box component="pre" sx={{ mt: 2, fontSize: 12, color: 'text.secondary' }}>{JSON.stringify(value)}</Box>
    </Box>
  );
}

/** All defaults: no Font line, flow top to bottom. */
export const Defaults = { render: () => <Harness initial={{ font: null, flow: 'TD' }} /> };

/**
 * An online font in a browser with online fonts off: it isn't installed, so the
 * form says so and offers "Search online fonts...". Nothing is downloaded.
 */
export const OnlineFontNoSource = {
  render: () => <Harness initial={{ font: { family: 'Kalam', width: 1.03, leading: null }, flow: 'LR' }} />,
};

/** A typed font name that is not installed and not an online font. */
export const UnknownFont = {
  render: () => <Harness initial={{ font: { family: 'Brand Sans', width: null, leading: 1.2 }, flow: 'TD' }} />,
};
