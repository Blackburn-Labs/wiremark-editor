import { useState } from 'react';
import Box from '@mui/material/Box';
import ContentControl from './ContentControl.jsx';

const meta = {
  title: 'Properties/ContentControl',
  component: ContentControl,
  parameters: { layout: 'centered' },
};

export default meta;

const fillerStyleField = {
  name: 'filler',
  values: ['squiggle', 'lorem', 'blocks'],
  default: 'squiggle',
};

/**
 * Mirrors PropertyForm's mutual-exclusivity rule with local state: switching to
 * Filler clears the label and seeds a default `~3`; switching to Text clears the
 * filler amount and style.
 */
function Interactive({
  initialMode, initialLabel = '', initialFiller = '', initialStyle = '',
}) {
  const [mode, setMode] = useState(initialMode);
  const [label, setLabel] = useState(initialLabel);
  const [filler, setFiller] = useState(initialFiller);
  const [fillerStyle, setFillerStyle] = useState(initialStyle);

  const handleSwitchMode = (next) => {
    setMode(next);
    if (next === 'filler') {
      setLabel('');
      setFiller((f) => f || '~3');
    } else {
      setFiller('');
      setFillerStyle('');
    }
  };

  return (
    <Box sx={{ width: 320 }}>
      <ContentControl
        mode={mode}
        label={label}
        filler={filler}
        fillerStyleField={fillerStyleField}
        fillerStyle={fillerStyle}
        onSwitchMode={handleSwitchMode}
        onLabelChange={setLabel}
        onFillerChange={setFiller}
        onFillerStyleChange={setFillerStyle}
      />
    </Box>
  );
}

export const TextWithLabel = {
  render: () => <Interactive initialMode="text" initialLabel="Sign in" />,
};

export const FillerSentences = {
  render: () => <Interactive initialMode="filler" initialFiller="~3" initialStyle="squiggle" />,
};

export const FillerLines = {
  render: () => <Interactive initialMode="filler" initialFiller="~2l" />,
};

export const FillerBucket = {
  render: () => <Interactive initialMode="filler" initialFiller="__" />,
};
