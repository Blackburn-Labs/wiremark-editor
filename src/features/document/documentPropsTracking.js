// @ts-check
/**
 * Analytics props for a Document-properties change: what KIND of font and the
 * flow -- never the family name (it's document content).
 * @param {import('../../utils/documentProps.js').DocumentProps} props
 * @param {import('../../utils/fontCatalog.js').CatalogFont[]|null} catalog
 * @param {'dialog'|'inspector'} trigger
 * @returns {{ font: 'default'|'online'|'local', flow: 'TD'|'LR', trigger: 'dialog'|'inspector' }}
 */
export function documentPropsEvent(props, catalog, trigger) {
  let font = /** @type {'default'|'online'|'local'} */ ('default');
  if (props.font) {
    const key = props.font.family.toLowerCase();
    font = catalog && catalog.some((f) => f.family.toLowerCase() === key) ? 'online' : 'local';
  }
  return { font, flow: props.flow, trigger };
}
