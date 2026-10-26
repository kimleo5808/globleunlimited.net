// Build capital-city data for Globle Capitals mode from Natural Earth
// populated places (ne_110m_populated_places_simple), filtered to admin-0 capitals.
// Output: src/data/capitals.json  [{name, country, cca2, lat, lng, aliases[]}]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const DATA = process.argv[2] || 'scripts/data/ne_places.json';
const OUT_DIR = process.argv[3] || 'src/data';
mkdirSync(OUT_DIR, { recursive: true });

const geo = JSON.parse(readFileSync(DATA));

const normalize = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

const seen = new Set();
const capitals = [];

for (const f of geo.features) {
  const p = f.properties;
  if (p.adm0cap !== 1) continue;
  const name = p.name || p.nameascii;
  if (!name) continue;
  const key = normalize(name);
  if (seen.has(key)) continue; // de-dupe shared names
  seen.add(key);

  const [lng, lat] = f.geometry.coordinates;
  const cca2 = p.iso_a2 && p.iso_a2 !== '-99' ? p.iso_a2 : '';

  const aliasSet = new Set();
  const add = (v) => { if (v) aliasSet.add(normalize(v)); };
  add(p.nameascii);
  add(p.namealt);
  aliasSet.delete(key);

  capitals.push({
    name,
    country: p.adm0name || '',
    cca2,
    lat: +(+lat).toFixed(4),
    lng: +(+lng).toFixed(4),
    aliases: [...aliasSet].filter(Boolean),
  });
}

// Natural Earth's 110m places flag some former capitals and seats of government
// as admin-0 capitals, keeps Astana's 2019–2022 name and Burundi's pre-2019
// capital, and has no row for Juba.
const DROP = new Set(['Abidjan']); // Ivory Coast's capital is Yamoussoukro (1983)
const REPLACE = {
  'Dar es Salaam': { name: 'Dodoma', lat: -6.163, lng: 35.7516, aliases: [] },
  Cotonou: { name: 'Porto-Novo', lat: 6.4969, lng: 2.6289, aliases: [] },
  'Nur-Sultan': { name: 'Astana', lat: 51.1811, lng: 71.4278, aliases: ['nur sultan'] },
  // Burundi moved its political capital in 2019; Bujumbura stays the economic one.
  Bujumbura: { name: 'Gitega', lat: -3.4271, lng: 29.9246, aliases: [] },
};
const ADD = [
  { name: 'Juba', country: 'South Sudan', cca2: 'SS', lat: 4.8594, lng: 31.5713, aliases: [] },
];
for (let i = capitals.length - 1; i >= 0; i--) {
  const c = capitals[i];
  if (DROP.has(c.name)) capitals.splice(i, 1);
  else if (REPLACE[c.name]) capitals[i] = { ...c, ...REPLACE[c.name] };
}
capitals.push(...ADD);

capitals.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(`${OUT_DIR}/capitals.json`, JSON.stringify(capitals));
console.log(`wrote ${capitals.length} capitals -> ${OUT_DIR}/capitals.json`);
for (const n of ['France', 'Japan', 'United States of America', 'Australia']) {
  const c = capitals.find((x) => x.country === n);
  console.log(' ', n, '->', c ? `${c.name} (${c.lat},${c.lng}) [${c.cca2}]` : 'NONE');
}
