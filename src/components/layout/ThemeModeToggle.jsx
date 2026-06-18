// @ts-check
/**
 * ThemeModeToggle -- an IconButton that cycles the app theme mode in the order
 * system -> light -> dark -> system. The icon reflects the CURRENT mode:
 * SettingsBrightness for system, LightMode for light, DarkMode for dark.
 * Reads `selectThemeMode` and dispatches `setThemeMode`.
 */
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';

import { selectThemeMode, setThemeMode } from '../../store/uiSlice.js';

/** @type {Record<'system'|'light'|'dark', 'system'|'light'|'dark'>} */
const NEXT_MODE = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

/**
 * Map a theme mode to its icon component + human label.
 * @param {'system'|'light'|'dark'} mode
 */
function describe(mode) {
  switch (mode) {
    case 'light':
      return { Icon: LightModeIcon, label: 'Light mode' };
    case 'dark':
      return { Icon: DarkModeIcon, label: 'Dark mode' };
    default:
      return { Icon: SettingsBrightnessIcon, label: 'System mode' };
  }
}

export default function ThemeModeToggle({ size = 'medium' }) {
  const dispatch = useDispatch();
  const mode = useSelector(selectThemeMode);
  const { Icon, label } = describe(mode);

  return (
    <Tooltip title={`Theme: ${label} (click to change)`}>
      <IconButton
        size={size}
        color="inherit"
        aria-label={`Theme mode: ${label}`}
        onClick={() => dispatch(setThemeMode(NEXT_MODE[mode] || 'system'))}
      >
        <Icon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

ThemeModeToggle.propTypes = {
  /** IconButton size. */
  size: PropTypes.oneOf(['small', 'medium', 'large']),
};
