// Build the population table for Higher or Lower.
//
// Usage: node scripts/build-population.mjs
//
// Source: World Bank SP.POP.TOTL, 2024 (CC BY 4.0), cached at
// scripts/data/wb-pop-2024.json. To refresh the cache:
//   curl "https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&date=2024&per_page=400" -o scripts/data/wb-pop-2024.json
// Pool countries the World Bank does not cover (Taiwan and five territories)
// are left out of population rounds rather than filled from a second source.
// Output: src/data/population.json  { year, source, people: { [country]: number } }
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const WC = require('world-countries');
const COUNTRIES = JSON.parse(readFileSync('src/data/countries.json', 'utf8'));
const [meta, rows] = JSON.parse(readFileSync('scripts/data/wb-pop-2024.json', 'utf8'));

const year = rows.find((r) => r.value != null)?.date;
const popBy3 = new Map(rows.filter((r) => r.value != null).map((r) => [r.countryiso3code, r.value]));
const iso3 = new Map(WC.map((w) => [w.cca2, w.cca3]));
// No ISO alpha-2 in the pool, but the World Bank uses XKX for Kosovo.
const NO_ISO = { Kosovo: 'XKX' };

const people = {};
const missing = [];
for (const c of COUNTRIES) {
  const code = c.cca2 ? iso3.get(c.cca2) : NO_ISO[c.name];
  const value = code ? popBy3.get(code) : undefined;
  if (value) people[c.name] = value;
  else missing.push(c.name);
}

writeFileSync('src/data/population.json', JSON.stringify({ year, source: 'World Bank SP.POP.TOTL (CC BY 4.0)', updated: meta.lastupdated, people }));
console.log(`wrote ${Object.keys(people).length} populations (${year}) -> src/data/population.json`);
console.log(`no data: ${missing.join(', ')}`);
