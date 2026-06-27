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

capitals.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(`${OUT_DIR}/capitals.json`, JSON.stringify(capitals));
console.log(`wrote ${capitals.length} capitals -> ${OUT_DIR}/capitals.json`);
for (const n of ['France', 'Japan', 'United States of America', 'Australia']) {
  const c = capitals.find((x) => x.country === n);
  console.log(' ', n, '->', c ? `${c.name} (${c.lat},${c.lng}) [${c.cca2}]` : 'NONE');
}
