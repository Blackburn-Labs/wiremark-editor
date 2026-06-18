import ExternalLink from './ExternalLink.jsx';

const meta = {
  title: 'Common/ExternalLink',
  component: ExternalLink,
  args: {
    href: 'https://blackburnlabs.com',
    children: 'Blackburn Labs',
  },
};

export default meta;

export const Default = {};

export const DocsLink = {
  args: {
    href: 'https://docs.wiremark.dev/guides/getting-started',
    children: 'Getting Started Guide',
  },
};
