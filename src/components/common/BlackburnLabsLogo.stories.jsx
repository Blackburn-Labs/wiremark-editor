import BlackburnLabsLogo from './BlackburnLabsLogo.jsx';

const meta = {
  title: 'Common/BlackburnLabsLogo',
  component: BlackburnLabsLogo,
  args: { width: 220, title: 'Blackburn Labs' },
  argTypes: {
    width: { control: { type: 'range', min: 80, max: 480, step: 10 } },
    mode: { control: { type: 'inline-radio' }, options: [undefined, 'light', 'dark'] },
  },
};

export default meta;

export const Default = {};

/** The dark/black-text variant, for light surfaces. */
export const OnLightSurface = { args: { mode: 'light' } };

/** The light/white-text variant; rendered on a dark panel so the text reads. */
export const OnDarkSurface = {
  args: { mode: 'dark' },
  decorators: [
    (Story) => (
      <div style={{ background: '#282a36', padding: 24, display: 'inline-block' }}>
        <Story />
      </div>
    ),
  ],
};
