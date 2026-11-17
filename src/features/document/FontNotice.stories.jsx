import Box from '@mui/material/Box';
import FontNotice from './FontNotice.jsx';

const meta = {
  title: 'Document/FontNotice',
  component: FontNotice,
  parameters: { layout: 'padded' },
  decorators: [(Story) => <Box sx={{ width: 640 }}><Story /></Box>],
  args: {
    family: 'Lobster',
    onSearchOnline: () => {},
    onRetry: () => {},
    onEditFont: () => {},
    onDismiss: () => {},
  },
};
export default meta;

/** Not installed, matches an online font, and online fonts are off. */
export const NotFoundSearchable = { args: { status: 'missing', canSearchOnline: true } };

/** Not installed and not an online font (e.g. a typo). */
export const NotFound = { args: { family: 'Lobstr', status: 'missing', canSearchOnline: false } };

/** The download from the chosen source failed. */
export const DownloadFailed = { args: { status: 'failed', canSearchOnline: false, sourceLabel: 'Bunny Fonts' } };
