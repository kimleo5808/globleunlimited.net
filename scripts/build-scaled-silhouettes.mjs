// Build same-scale country outlines for the Higher or Lower cards.
//
// Usage: node scripts/build-scaled-silhouettes.mjs
//
// Each country is drawn with an azimuthal equal-area projection centred on
// itself, in kilometres, so any two outlines can be shown side by side at
// their true relative size. Parts more than 2,500 km from the mainland are
// dropped (French Guiana from France, Alaska and Hawaii from the US): they
// would shrink the main shape to a speck without telling the player anything.
// Output: public/assets/data/scaled-silhouettes.json
//   { [country]: { d: path in km, w, h } }  (path centred on its own box)
import { readFileSync, writeFileSync } from 'node:fs';
import { geoAzimuthalEqualArea, geoPath, geoArea, geoCentroid, geoDistance } from 'd3-geo';

const WORLD = JSON.parse(readFileSync('public/assets/data/world.geo.json', 'utf8'));
const EARTH_KM = 6371;
const MAX_KM = 2500;

const out = {};
for (const f of WORLD.features) {
  const g = f.geometry;
  const polys = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates];
  const main = polys.reduce((best, p) => (geoArea({ type: 'Polygon', coordinates: p }) > geoArea({ type: 'Polygon', coordinates: best }) ? p : best));
  const centre = geoCentroid({ type: 'Polygon', coordinates: main });
  const kept = polys.filter((p) => geoDistance(centre, geoCentroid({ type: 'Polygon', coordinates: p })) * EARTH_KM <= MAX_KM);
  const shape = { type: 'MultiPolygon', coordinates: kept };

  const projection = geoAzimuthalEqualArea().rotate([-centre[0], -centre[1]]).scale(EARTH_KM).translate([0, 0]);
  const path = geoPath(projection);
  const [[x0, y0], [x1, y1]] = path.bounds(shape);
  // Re-centre on the box so the client only needs width and height.
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const centred = geoPath(projection.translate([-cx, -cy]));
  const d = centred(shape).replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n))));
  out[f.properties.name] = { d, w: Math.round(x1 - x0), h: Math.round(y1 - y0) };
}

writeFileSync('public/assets/data/scaled-silhouettes.json', JSON.stringify(out));
const size = Buffer.byteLength(JSON.stringify(out));
console.log(`wrote ${Object.keys(out).length} outlines (${Math.round(size / 1024)} KB) -> public/assets/data/scaled-silhouettes.json`);
for (const n of ['Russia', 'Canada', 'India', 'France', 'United States', 'Lebanon']) console.log(' ', n, out[n].w, 'x', out[n].h, 'km');
