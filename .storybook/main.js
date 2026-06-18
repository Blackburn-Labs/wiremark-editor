/** @type { import('@storybook/react-vite').StorybookConfig } */
const config = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs)'],
  addons: [],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  /**
   * Storybook's react-vite builder merges the project's vite.config.js. The PWA
   * plugin (service-worker / workbox precache) is meaningless for Storybook and
   * errors on Storybook's large manager runtime asset, so strip it here.
   */
  viteFinal(viteConfig) {
    // VitePWA() returns a nested array of plugins, so flatten before filtering.
    viteConfig.plugins = (viteConfig.plugins ?? []).flat(Infinity).filter((plugin) => {
      const name = plugin?.name ?? '';
      return !name.includes('pwa') && !name.includes('workbox');
    });
    return viteConfig;
  },
};

export default config;
