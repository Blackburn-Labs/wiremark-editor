// @ts-check
/**
 * FontNotice -- the renderer's warning when the document's `Font` line names a
 * font the page can't use: not installed on this computer and not downloaded
 * (a file from someone else, an online font with no source chosen yet, or a
 * typo), or a download that failed. The message stays neutral ("not found");
 * "Search online fonts..." appears only when the name matches the online font
 * list and no source is chosen. Nothing is fetched without that choice.
 */
import PropTypes from 'prop-types';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

/**
 * @param {{
 *   family: string,
 *   status: 'missing'|'failed',
 *   canSearchOnline: boolean,
 *   sourceLabel?: string,
 *   onSearchOnline: () => void,
 *   onRetry: () => void,
 *   onEditFont: () => void,
 *   onDismiss: () => void,
 * }} props
 */
export default function FontNotice({
  family, status, canSearchOnline, sourceLabel = '', onSearchOnline, onRetry, onEditFont, onDismiss,
}) {
  const message = status === 'failed'
    ? `Font "${family}" couldn't be downloaded from ${sourceLabel}. Showing Comic Neue.`
    : `Font "${family}" not found. Showing Comic Neue.`;
  return (
    <Alert severity="warning" onClose={onDismiss} sx={{ borderRadius: 0, alignItems: 'center' }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <span>{message}</span>
        {status === 'missing' && canSearchOnline && (
          <Button size="small" variant="outlined" color="inherit" onClick={onSearchOnline}>
            Search online fonts&hellip;
          </Button>
        )}
        {status === 'failed' && (
          <Button size="small" variant="outlined" color="inherit" onClick={onRetry}>Retry</Button>
        )}
        <Button size="small" color="inherit" onClick={onEditFont}>Edit font</Button>
      </Stack>
    </Alert>
  );
}

FontNotice.propTypes = {
  family: PropTypes.string.isRequired,
  status: PropTypes.oneOf(['missing', 'failed']).isRequired,
  canSearchOnline: PropTypes.bool.isRequired,
  sourceLabel: PropTypes.string,
  onSearchOnline: PropTypes.func.isRequired,
  onRetry: PropTypes.func.isRequired,
  onEditFont: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
};
