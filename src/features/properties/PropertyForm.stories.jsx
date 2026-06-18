import { useState } from 'react';
import Box from '@mui/material/Box';
import WiremarkElement from '../../domain/WiremarkElement.js';
import PropertyForm from './PropertyForm.jsx';

const meta = {
  title: 'Properties/PropertyForm',
  component: PropertyForm,
  parameters: { layout: 'fullscreen' },
};

export default meta;

const idOptions = ['home', 'settings', 'profile'];

/**
 * Drives the form with local token state, rebuilding the WiremarkElement on
 * every change so `getValue` reflects the latest tokens (mirroring how the app
 * reparses the source after a structural edit).
 */
function Interactive({ component, initialTokens }) {
  const [tokens, setTokens] = useState(initialTokens);
  const element = new WiremarkElement({ component, tokens });
  return (
    <Box sx={{ width: 360, borderLeft: '1px solid', borderColor: 'divider', minHeight: '100vh' }}>
      <PropertyForm element={element} idOptions={idOptions} onChangeTokens={setTokens} />
    </Box>
  );
}

export const Button = {
  render: () => (
    <Interactive
      component="Button"
      initialTokens={[
        { kind: 'keyless', value: 'Save', quoted: true },
        { kind: 'keyless', value: 'contained', quoted: false },
      ]}
    />
  ),
};

export const WithId = {
  render: () => (
    <Interactive
      component="Button"
      initialTokens={[
        { kind: 'keyless', value: '#saveBtn', quoted: false },
        { kind: 'keyless', value: 'Save', quoted: true },
        { kind: 'keyed', key: 'to', value: 'home', quoted: false },
      ]}
    />
  ),
};

export const TypographyText = {
  render: () => (
    <Interactive
      component="Typography"
      initialTokens={[{ kind: 'keyless', value: 'subtitle1', quoted: false }]}
    />
  ),
};

export const TypographyFiller = {
  render: () => (
    <Interactive
      component="Typography"
      initialTokens={[{ kind: 'keyless', value: '~2l', quoted: false }]}
    />
  ),
};

export const EmptyElement = {
  render: () => <Interactive component="Card" initialTokens={[]} />,
};
