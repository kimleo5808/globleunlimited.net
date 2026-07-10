// One-time build: US-state silhouettes + guessable data for the /states mode.
// Source: us-atlas states-10m.json (Natural Earth / Census, public domain).
// Outputs:
//   public/assets/data/us-states.silhouettes.json  -> { [name]: { abbr, path } }
//   src/data/us-states.json                         -> [{ name, cca2(abbr), lat, lng, aliases }]
import { writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { geoMercator, geoPath, geoArea, geoCentroid } from 'd3-geo';
import { feature } from 'topojson-client';

const requireCjs = createRequire(import.meta.url);
const topo = requireCjs('us-atlas/states-10m.json');

const ABBR = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA',
  Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD',
  Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO',
  Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH',
  Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT',
  Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY',
};

const BOX = 300, PAD = 18;

/** Keep the main landmass + nearby significant islands; drop far outliers
 *  (Aleutians, remote Hawaiian specks) that wreck the bounding box. */
function significantGeometry(feat) {
  if (feat.geometry.type !== 'MultiPolygon') return feat;
  const polys = feat.geometry.coordinates.map((coords) => ({
    poly: { type: 'Polygon', coordinates: coords },
    area: geoArea({ type: 'Polygon', coordinates: coords }),
  }));
  const maxArea = Math.max(...polys.map((p) => p.area));
  const main = polys.find((p) => p.area === maxArea);
  const mainC = geoCentroid(main.poly);
  const near = (c) => {
    const dLng = Math.abs(((c[0] - mainC[0] + 540) % 360) - 180);
    return dLng <= 20 && Math.abs(c[1] - mainC[1]) <= 20;
  };
  const kept = polys.filter((p) => p.area >= 0.06 * maxArea && near(geoCentroid(p.poly))).map((p) => p.poly.coordinates);
  return { ...feat, geometry: { type: 'MultiPolygon', coordinates: kept.length ? kept : [main.poly.coordinates] } };
}

const normalize = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

const fc = feature(topo, topo.objects.states);
const silhouettes = {};
const states = [];

for (const feat of fc.features) {
  const name = feat.properties?.name;
  const abbr = ABBR[name];
  if (!abbr) continue; // skip DC + territories

  const shape = significantGeometry(feat);
  const proj = geoMercator().fitExtent([[PAD, PAD], [BOX - PAD, BOX - PAD]], shape);
  const path = geoPath(proj)(shape);
  if (path) silhouettes[name] = { abbr, path };

  const [lng, lat] = geoCentroid(shape);
  states.push({
    name,
    cca2: abbr, // reuse cca2 slot to carry the 2-letter state code
    lat: +lat.toFixed(4),
    lng: +lng.toFixed(4),
    aliases: [normalize(abbr)],
  });
}

states.sort((a, b) => a.name.localeCompare(b.name));

mkdirSync('public/assets/data', { recursive: true });
mkdirSync('src/data', { recursive: true });
writeFileSync('public/assets/data/us-states.silhouettes.json', JSON.stringify(silhouettes));
writeFileSync('src/data/us-states.json', JSON.stringify(states));
console.log(`wrote ${states.length} states -> src/data/us-states.json + silhouettes`);
