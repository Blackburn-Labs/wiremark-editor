import { FontSourceDialogView } from './FontSourceDialog.jsx';

const meta = {
  title: 'Document/FontSourceDialog',
  component: FontSourceDialogView,
  args: { open: true, onChoose: () => {}, onClose: () => {} },
};
export default meta;

/** First time: nothing preselected; "Use online fonts" waits for a choice. */
export const FirstTime = { args: { current: null } };

/** Changing the source later: the current one is selected and online fonts can be turned off. */
export const ChangingSource = { args: { current: 'bunny' } };
