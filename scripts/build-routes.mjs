// Build the land-route network for Globle Routes.
//
// Usage: node scripts/build-routes.mjs
//
// Two countries are linked when they share a land border (world-countries
// `borders`, kept to the 176-country pool), plus a short list of fixed
// crossings people actually drive or ride through. Overseas territories do not
// create links: France does not touch Brazil through French Guiana.
// Output: src/data/routes.json
//   { links: { [country]: string[] }, crossings: [a, b, label][] }
// Only countries with at least one link appear in `links`; the rest are the
// islands with no land route.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const WC = require('world-countries');
const COUNTRIES = JSON.parse(readFileSync('src/data/countries.json', 'utf8'));

/** Fixed crossings that join otherwise separate land masses. */
const CROSSINGS = [
  ['France', 'United Kingdom', 'Channel Tunnel'],
  ['Denmark', 'Sweden', 'Øresund Bridge'],
];

/** Pool entries with no ISO code, so no world-countries row to read. */
const NO_ISO_BORDERS = {
  Kosovo: ['Albania', 'North Macedonia', 'Montenegro', 'Serbia'],
  Somaliland: ['Djibouti', 'Ethiopia', 'Somalia'],
  'N. Cyprus': ['Cyprus'],
};

const pool = new Set(COUNTRIES.map((c) => c.name));
const byCca2 = new Map(COUNTRIES.filter((c) => c.cca2).map((c) => [c.cca2, c.name]));
const byCca3 = new Map(WC.map((w) => [w.cca3, w.cca2]));
const links = new Map(COUNTRIES.map((c) => [c.name, new Set()]));
const link = (a, b) => {
  if (!pool.has(a) || !pool.has(b) || a === b) return;
  links.get(a).add(b);
  links.get(b).add(a);
};

for (const w of WC) {
  const a = byCca2.get(w.cca2);
  if (!a) continue;
  for (const b3 of w.borders ?? []) link(a, byCca2.get(byCca3.get(b3)));
}
for (const [a, bs] of Object.entries(NO_ISO_BORDERS)) for (const b of bs) link(a, b);
for (const [a, b] of CROSSINGS) link(a, b);

const out = {
  links: Object.fromEntries(
    [...links]
      .filter(([, s]) => s.size)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, s]) => [k, [...s].sort()]),
  ),
  crossings: CROSSINGS,
};
writeFileSync('src/data/routes.json', JSON.stringify(out));
const linked = Object.keys(out.links).length;
console.log(`wrote ${linked} linked countries (${pool.size - linked} with no land route) -> src/data/routes.json`);
