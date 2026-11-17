import { DocumentPropertiesDialogView } from './DocumentPropertiesDialog.jsx';

const meta = {
  title: 'Document/DocumentPropertiesDialog',
  component: DocumentPropertiesDialogView,
  args: {
    open: true,
    source: null,
    onRequestSource: () => {},
    onSave: () => {},
    onClose: () => {},
  },
};
export default meta;

/** File > Document properties... on a file with no Font / Flow line. */
export const AllDefaults = { args: { initial: { font: null, flow: 'TD' } } };

/** On a file that already has `Font "Patrick Hand"` and `Flow LR`. */
export const ExistingSettings = {
  args: { initial: { font: { family: 'Patrick Hand', width: null, leading: null }, flow: 'LR' } },
};
