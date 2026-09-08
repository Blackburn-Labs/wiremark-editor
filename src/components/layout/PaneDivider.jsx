// @ts-check
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';

import {
  EDITOR_WIDTH_DEFAULT,
  EDITOR_WIDTH_MAX,
  EDITOR_WIDTH_MIN,
} from '../../store/uiSlice.js';

const KEYBOARD_STEP = 5;

/**
 * Draggable, keyboard-accessible divider between the editor and renderer.
 */
export default function PaneDivider({ value, onChange }) {
  /** @param {number} next */
  const update = (next) => {
    onChange(Math.min(EDITOR_WIDTH_MAX, Math.max(EDITOR_WIDTH_MIN, next)));
  };

  /** @param {import('react').PointerEvent<HTMLElement>} event */
  const updateFromPointer = (event) => {
    const workspace = event.currentTarget.parentElement;
    if (!workspace) return;
    const bounds = workspace.getBoundingClientRect();
    if (bounds.width <= 0) return;
    update(((event.clientX - bounds.left) / bounds.width) * 100);
  };

  /** @param {import('react').KeyboardEvent<HTMLElement>} event */
  const handleKeyDown = (event) => {
    let next;
    if (event.key === 'ArrowLeft') next = value - KEYBOARD_STEP;
    else if (event.key === 'ArrowRight') next = value + KEYBOARD_STEP;
    else if (event.key === 'Home') next = EDITOR_WIDTH_MIN;
    else if (event.key === 'End') next = EDITOR_WIDTH_MAX;
    else return;
    event.preventDefault();
    update(next);
  };

  return (
    <Box
      role="separator"
      aria-label="Resize editor and renderer"
      aria-orientation="vertical"
      aria-valuemin={EDITOR_WIDTH_MIN}
      aria-valuemax={EDITOR_WIDTH_MAX}
      aria-valuenow={Math.round(value)}
      aria-valuetext={`${Math.round(value)}% editor`}
      tabIndex={0}
      title="Drag to resize. Use arrow keys to adjust. Double-click to reset."
      onDoubleClick={() => update(EDITOR_WIDTH_DEFAULT)}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        updateFromPointer(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) updateFromPointer(event);
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      sx={{
        position: 'relative',
        width: 9,
        flexShrink: 0,
        cursor: 'col-resize',
        touchAction: 'none',
        outline: 0,
        '&::before': {
          content: '""',
          position: 'absolute',
          insetBlock: 0,
          left: '50%',
          width: 1,
          transform: 'translateX(-50%)',
          bgcolor: 'divider',
        },
        '&:hover::before, &:focus-visible::before': {
          width: 3,
          bgcolor: 'primary.main',
        },
      }}
    />
  );
}

PaneDivider.propTypes = {
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};
