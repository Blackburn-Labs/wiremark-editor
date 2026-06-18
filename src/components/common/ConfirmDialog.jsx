// @ts-check
/**
 * ConfirmDialog -- a small, reusable confirm/cancel dialog. Presentational:
 * fully controlled via `open` + callbacks so it is storyable and reusable
 * (the File menu uses it to guard unsaved changes on New/Open).
 */
import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) {
  return (
    <Dialog open={open} onClose={onCancel} aria-labelledby="confirm-dialog-title">
      <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      {message ? (
        <DialogContent>
          <DialogContentText>{message}</DialogContentText>
        </DialogContent>
      ) : null}
      <DialogActions>
        <Button onClick={onCancel} color="inherit">
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm} variant="contained" color="primary" autoFocus>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

ConfirmDialog.propTypes = {
  /** Whether the dialog is open. */
  open: PropTypes.bool.isRequired,
  /** Dialog title. */
  title: PropTypes.string,
  /** Optional body message. */
  message: PropTypes.string,
  /** Label for the confirm button. */
  confirmLabel: PropTypes.string,
  /** Label for the cancel button. */
  cancelLabel: PropTypes.string,
  /** Called when the user confirms. */
  onConfirm: PropTypes.func,
  /** Called when the user cancels (or dismisses). */
  onCancel: PropTypes.func,
};
