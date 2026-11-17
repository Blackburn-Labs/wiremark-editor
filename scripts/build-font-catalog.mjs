#!/usr/bin/env node
// Regenerate src/data/fontCatalog.json -- the list of online fonts the Document
// properties font picker searches. Run by a developer (`npm run fonts:catalog`),
// NOT at build time and never in a user's browser: the generated file is checked
// in, so searching fonts in the editor makes no network request at all.
//
// Source: the Fontsource API (Google Fonts mirror, no API key). Kept: Google
// families with a Latin subset, excluding icon fonts, whose name passes core's
// family-name rule (anything else would be a hard render error).
//
// Row format (compact; parsed by src/utils/fontCatalog.js):
//   [id, family, category, regularWeight, hasBold]
//   category: s=sans-serif r=serif d=display h=handwriting m=monospace
//   regularWeight: 400 when available, else the weight closest to it
//   hasBold: 1 when a real 700 weight exists
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const API = 'https://api.fontsource.org/v1/fonts';
const OUT = fileURLToPath(new URL('../src/data/fontCatalog.json', import.meta.url));
const FAMILY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _.-]{0,63}$/; // core font.js
const CATEGORY = { 'sans-serif': 's', serif: 'r', display: 'd', handwriting: 'h', monospace: 'm' };

const res = await fetch(API, { headers: { 'user-agent': 'wiremark-editor font catalog script' } });
if (!res.ok) throw new Error(`Fontsource API answered ${res.status}`);
const all = await res.json();

const rows = all
  .filter((f) => f.type === 'google'
    && Array.isArray(f.subsets) && f.subsets.includes('latin')
    && Array.isArray(f.styles) && f.styles.includes('normal')
    && CATEGORY[f.category]
    && FAMILY_PATTERN.test(f.family)
    && Array.isArray(f.weights) && f.weights.length > 0)
  .map((f) => {
    const weights = [...f.weights].sort((a, b) => Math.abs(a - 400) - Math.abs(b - 400) || a - b);
    return [f.id, f.family, CATEGORY[f.category], weights[0], f.weights.includes(700) ? 1 : 0];
  })
  .sort((a, b) => a[1].localeCompare(b[1]));

const body = `[\n${rows.map((r) => JSON.stringify(r)).join(',\n')}\n]\n`;
writeFileSync(OUT, body);
console.log(`wrote ${rows.length} fonts to ${OUT} (${(body.length / 1024).toFixed(1)} KB)`);
