// Build a square PWA source icon (512x512) by centering the official Wiremark
// wordmark on a rounded background. Run: node scripts/make-square-icon.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync(new URL('../public/wiremark-logo.svg', import.meta.url), 'utf-8');
// Extract the inner markup (defs + paths) of the 40x24 wordmark.
const inner = src.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();

// Wordmark is 40x24 (a wide 5:3 mark). Scale it to fill most of the square so
// the icon doesn't read as tiny-with-lots-of-padding, then center it. Tune
// WIDTH_FRAC to trade padding for size; the generator adds its own ~5% margin
// for the standard icons and ~30% safe-zone margin for the maskable icon.
const SIZE = 512;
const WIDTH_FRAC = 0.84; // wordmark spans 84% of the icon width
const scale = (SIZE * WIDTH_FRAC) / 40; // ~10.75
const tx = (SIZE - 40 * scale) / 2;
const ty = (SIZE - 24 * scale) / 2;

const square = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" rx="96" fill="#ffffff"/>
  <g transform="translate(${tx} ${ty}) scale(${scale})">
${inner}
  </g>
</svg>
`;

writeFileSync(new URL('../public/wiremark-icon.svg', import.meta.url), square);
console.log('Wrote public/wiremark-icon.svg (512x512 square brand icon)');
