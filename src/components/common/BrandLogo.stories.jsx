import BrandLogo from './BrandLogo.jsx';

const meta = {
  title: 'Common/BrandLogo',
  component: BrandLogo,
  args: { size: 96, title: 'Wiremark Editor' },
  argTypes: {
    size: { control: { type: 'range', min: 16, max: 256, step: 8 } },
  },
};

export default meta;

export const Default = {};

export const Small = { args: { size: 32 } };

export const Large = { args: { size: 192 } };
