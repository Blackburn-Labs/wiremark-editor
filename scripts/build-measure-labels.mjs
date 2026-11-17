#!/usr/bin/env node
// Regenerate src/data/measureLabels.json -- the sample of typical UI labels the
// font picker measures a font against (utils/fontMeasure.js). Taken from the
// quoted strings in @wiremark/core's test fixtures, the same corpus core used to
// measure its own width presets. Run by a developer with the core repo checked
// out next to this one (or pass its fixtures directory):
//   npm run fonts:labels [-- ../wiremark/packages/core/test/fixtures]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = resolve(process.argv[2] || fileURLToPath(new URL('../../wiremark/packages/core/test/fixtures', import.meta.url)));
const OUT = fileURLToPath(new URL('../src/data/measureLabels.json', import.meta.url));

const labels = [];
for (const file of readdirSync(dir).filter((f) => f.endsWith('.wiremark')).sort()) {
  for (const line of readFileSync(join(dir, file), 'utf8').split('\n')) {
    if (/^\s*\/\//.test(line)) continue;
    for (const m of line.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
      const text = m[1].trim();
      // Skip icon path data and other non-label strings.
      if (text && !/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/.test(text)) labels.push(text);
    }
  }
}
writeFileSync(OUT, `${JSON.stringify(labels, null, 0)}\n`);
console.log(`wrote ${labels.length} labels from ${dir} to ${OUT}`);
