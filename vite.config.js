/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

// https://vite.dev/config/
export default defineConfig({
  // App version surfaced in the About dialog; injected at build time so app code
  // never imports package.json directly (cleaner for the PWA bundle).
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'wiremark-icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: '/',
        name: 'Wiremark Editor',
        short_name: 'Wiremark',
        description: 'Edit Wiremark wireframes locally in your browser or as a desktop PWA.',
        lang: 'en',
        theme_color: '#282a36',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'wiremark-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
  build: {
    rolldownOptions: {
      output: {
        // Split the large eager vendor libs into long-term-cacheable chunks so a
        // change to app code doesn't bust React/MUI/CodeMirror downloads (and
        // vice versa). Each group below targets a specific statically-imported
        // dependency; we deliberately do NOT add a catch-all `/node_modules/`
        // group, because that would capture the heavy export libs
        // (jspdf/svg2pdf/html2canvas/dompurify) — which are lazy-loaded via
        // dynamic import() in utils/exporters — and hoist them into an eager
        // chunk, defeating the lazy split. Leaving them ungrouped lets Rolldown's
        // default code-splitting keep each in its own on-demand chunk.
        // Groups match by priority (highest first); path-separator-safe regexes
        // per Rolldown's Windows guidance. See output.codeSplitting.
        codeSplitting: {
          groups: [
            {
              name: 'codemirror',
              test: /node_modules[\\/](@codemirror|@uiw[\\/]react-codemirror|@lezer)[\\/]/,
              priority: 40,
            },
            {
              name: 'mui',
              test: /node_modules[\\/](@mui|@emotion)[\\/]/,
              priority: 30,
            },
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|react-redux|@reduxjs[\\/]toolkit|redux|redux-thunk|reselect|scheduler|use-sync-external-store)[\\/]/,
              priority: 20,
            },
            {
              name: 'wiremark',
              test: /node_modules[\\/]@wiremark[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
  // Vitest configuration. Unit tests target business logic only
  // (src/domain, src/utils, src/store); UI components are exercised via
  // Storybook + Chrome MCP per the project's testing strategy.
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/utils/**', 'src/store/**'],
      reporter: ['text', 'html'],
    },
  },
});
