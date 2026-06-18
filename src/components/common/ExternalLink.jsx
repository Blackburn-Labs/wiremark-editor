// @ts-check
/**
 * ExternalLink -- an anchor that always opens in a new window/tab with safe
 * `rel="noopener noreferrer"`. Thin wrapper over MUI Link so external
 * navigation is consistent (Help menu items, About dialog) and storyable.
 */
import PropTypes from 'prop-types';
import Link from '@mui/material/Link';

export default function ExternalLink({ href, children, ...rest }) {
  return (
    <Link href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </Link>
  );
}

ExternalLink.propTypes = {
  /** The URL to open in a new window. */
  href: PropTypes.string.isRequired,
  /** Link contents. */
  children: PropTypes.node,
};
