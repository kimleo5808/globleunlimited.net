// Build game country data from public-domain sources.
//   metadata : world-countries  (cca2 for flags, altSpellings for aliases)
//   polygons : world-atlas 110m (Natural Earth) joined by numeric ISO (ccn3 === id)
//   centroid : d3.geoCentroid of each polygon (accurate to the rendered shape)
// Outputs:
//   src/data/countries.json  — guessable list [{name, cca2, lat, lng, aliases[]}]
//   src/data/world.geo.json  — FeatureCollection {properties:{name, cca2}} for globe.gl
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { feature } from 'topojson-client';
import { geoCentroid, geoArea } from 'd3-geo';

// Centroid of the largest polygon only — avoids skew from overseas territories
// (e.g. France + French Guiana, USA + Alaska). Rendering still uses full geometry.
function mainlandCentroid(geometry) {
  if (geometry.type !== 'MultiPolygon') return geoCentroid({ type: 'Feature', geometry });
  let best = null, bestArea = -1;
  for (const coords of geometry.coordinates) {
    const poly = { type: 'Polygon', coordinates: coords };
    const a = geoArea(poly);
    if (a > bestArea) { bestArea = a; best = poly; }
  }
  return geoCentroid(best);
}
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const worldCountries = require('world-countries');

const DATA_DIR = process.argv[2] || 'scripts/data';
const OUT_DIR = process.argv[3] || 'src/data';          // small, bundled (import)
const GEO_DIR = process.argv[4] || 'public/assets/data'; // large, fetched at runtime
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(GEO_DIR, { recursive: true });

const topo = JSON.parse(readFileSync(`${DATA_DIR}/countries-110m.json`));
const features = feature(topo, topo.objects.countries).features;

// numeric ISO (ccn3) -> metadata
const metaByCcn3 = new Map();
for (const c of worldCountries) {
  if (c.ccn3) metaByCcn3.set(String(+c.ccn3), c);
}

const normalize = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

const countries = [];
const geoFeatures = [];

for (const f of features) {
  const id = String(+f.id);
  const meta = metaByCcn3.get(id);
  const naturalName = f.properties.name;
  // Skip Antarctica (not guessable in Globle)
  if (naturalName === 'Antarctica') continue;

  const name = meta?.name?.common ?? naturalName;
  const cca2 = meta?.cca2 ?? '';
  const [lng, lat] = mainlandCentroid(f.geometry); // d3 returns [lng, lat]

  // Build alias set: common + official + altSpellings + natural-earth name
  const aliasSet = new Set();
  const add = (v) => { if (v) aliasSet.add(normalize(v)); };
  add(name);
  add(naturalName);
  if (meta) {
    add(meta.name?.official);
    (meta.altSpellings || []).forEach(add);
    Object.values(meta.name?.native || {}).forEach((n) => { add(n?.common); add(n?.official); });
  }
  aliasSet.delete(normalize(name)); // canonical handled separately

  countries.push({
    name,
    cca2,
    lat: +lat.toFixed(4),
    lng: +lng.toFixed(4),
    region: meta?.region ?? '',
    subregion: meta?.subregion ?? '',
    aliases: [...aliasSet].filter(Boolean),
  });

  geoFeatures.push({
    type: 'Feature',
    properties: { name, cca2 },
    geometry: f.geometry,
  });
}

countries.sort((a, b) => a.name.localeCompare(b.name));

writeFileSync(`${OUT_DIR}/countries.json`, JSON.stringify(countries));
writeFileSync(`${GEO_DIR}/world.geo.json`, JSON.stringify({ type: 'FeatureCollection', features: geoFeatures }));

console.log(`wrote ${countries.length} countries -> ${OUT_DIR}/countries.json`);
console.log(`wrote ${geoFeatures.length} features  -> ${GEO_DIR}/world.geo.json`);
// sanity sample
const jp = countries.find((c) => c.name === 'Japan');
console.log('sample Japan:', JSON.stringify(jp));
