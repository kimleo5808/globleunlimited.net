// One-time build script: copy the flag SVG for each country we use into
// public/assets/flags/{cca2}.svg. Source: the world-countries package
// (already a devDependency), which ships public-domain flag SVGs named by cca3.
//
// Usage: node scripts/build-flags.mjs
import { readFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const requireCjs = createRequire(import.meta.url);
const world = requireCjs('world-countries');
const WC_DIR = 'node_modules/world-countries/data';
const OUT_DIR = 'public/assets/flags';

const cca2ToCca3 = new Map(world.map((w) => [w.cca2, w.cca3.toLowerCase()]));
const countries = JSON.parse(readFileSync('src/data/countries.json', 'utf8'));

mkdirSync(OUT_DIR, { recursive: true });

let copied = 0;
const missing = [];
for (const c of countries) {
  if (!c.cca2) continue;
  const cca3 = cca2ToCca3.get(c.cca2);
  const src = cca3 ? `${WC_DIR}/${cca3}.svg` : null;
  if (src && existsSync(src)) {
    copyFileSync(src, `${OUT_DIR}/${c.cca2.toLowerCase()}.svg`);
    copied++;
  } else {
    missing.push(`${c.name} (${c.cca2})`);
  }
}

console.log(`wrote ${copied} flags to ${OUT_DIR}`);
if (missing.length) console.log(`no flag for ${missing.length}:`, missing.join(', '));
