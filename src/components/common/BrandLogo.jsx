// @ts-check
/**
 * BrandLogo -- the official Wiremark wordmark. Renders the light or dark variant
 * (the dark one uses a lighter "mark" stroke so it reads on dark surfaces) based
 * on the resolved theme mode, unless a `mode` is passed explicitly. `size` is the
 * rendered HEIGHT in px; width derives from the wordmark's aspect ratio.
 */
import PropTypes from 'prop-types';
import { useResolvedThemeMode } from '../../theme/ThemeModeProvider.jsx';

const LIGHT_SRC = '/wiremark-logo.svg';
const DARK_SRC = '/wiremark-logo-dark.svg';

export default function BrandLogo({ size = 24, title = 'Wiremark Editor', mode }) {
  const resolved = useResolvedThemeMode();
  const effective = mode ?? resolved;
  const src = effective === 'dark' ? DARK_SRC : LIGHT_SRC;
  return (
    <img
      src={src}
      alt={title}
      height={size}
      style={{ height: size, width: 'auto', display: 'block' }}
    />
  );
}

BrandLogo.propTypes = {
  size: PropTypes.number,
  title: PropTypes.string,
  mode: PropTypes.oneOf(['light', 'dark']),
};
