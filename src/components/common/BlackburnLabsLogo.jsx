// @ts-check
/**
 * BlackburnLabsLogo -- the Blackburn Labs wordmark (sponsor of Wiremark). Picks
 * the variant that reads on the current surface: the light/white-text logo on
 * dark surfaces, the dark/black-text logo on light surfaces. Override with an
 * explicit `mode`. `width` is the rendered WIDTH in px (these are horizontal
 * lockups); height derives from the wordmark's aspect ratio.
 */
import PropTypes from 'prop-types';
import { useResolvedThemeMode } from '../../theme/ThemeModeProvider.jsx';

// Named for the logo's own ink color: "light" = white text (for dark surfaces),
// "dark" = black text (for light surfaces). Vite resolves these to hashed URLs.
import LIGHT_SRC from '../../assets/images/logos/logo-light.png';
import DARK_SRC from '../../assets/images/logos/logo-dark.png';

export default function BlackburnLabsLogo({ width = 160, title = 'Blackburn Labs', mode }) {
  const resolved = useResolvedThemeMode();
  const effective = mode ?? resolved;
  const src = effective === 'dark' ? LIGHT_SRC : DARK_SRC;
  return (
    <img
      src={src}
      alt={title}
      width={width}
      style={{ width, height: 'auto', display: 'block' }}
    />
  );
}

BlackburnLabsLogo.propTypes = {
  /** Rendered width in px; height follows the aspect ratio. */
  width: PropTypes.number,
  /** Alt text / accessible name. */
  title: PropTypes.string,
  /** Force a variant regardless of the resolved theme mode. */
  mode: PropTypes.oneOf(['light', 'dark']),
};
