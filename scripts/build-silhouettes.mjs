// One-time build script: pre-render each country as a normalized SVG silhouette path.
// Source: public/assets/data/world.geo.json (the same polygons the globe uses).
// Projection: d3-geo geoMercator, fitted per-country into a fixed square viewBox.
// Output:   public/assets/data/silhouettes.json  ->  { [name]: { cca2, path } }
//
// Usage: node scripts/build-silhouettes.mjs [world.geo.json] [out.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { geoMercator, geoPath, geoArea, geoCentroid } from 'd3-geo';

const IN  = process.argv[2] || 'public/assets/data/world.geo.json';
const OUT = process.argv[3] || 'public/assets/data/silhouettes.json';

// viewBox the client renders into; padding keeps the outline off the edges.
const BOX = 300;
const PAD = 18;

/** Keep the main landmass plus nearby significant islands; drop far-flung
 *  territories (e.g. French Guiana, Alaska, Hawaii) that would blow up the
 *  bounding box and make the silhouette unrecognisable. */
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
    const dLat = Math.abs(c[1] - mainC[1]);
    return dLng <= 25 && dLat <= 25;
  };
  const kept = polys
    .filter((p) => p.area >= 0.08 * maxArea && near(geoCentroid(p.poly)))
    .map((p) => p.poly.coordinates);
  return { ...feat, geometry: { type: 'MultiPolygon', coordinates: kept.length ? kept : [main.poly.coordinates] } };
}

const fc = JSON.parse(readFileSync(IN, 'utf8'));
const out = {};

for (const feat of fc.features) {
  const name = feat.properties?.name;
  const cca2 = feat.properties?.cca2 || '';
  if (!name) continue;
  const shape = significantGeometry(feat);
  const proj = geoMercator().fitExtent([[PAD, PAD], [BOX - PAD, BOX - PAD]], shape);
  const d = geoPath(proj)(shape);
  if (d) out[name] = { cca2, path: d };
}

writeFileSync(OUT, JSON.stringify(out));
console.log(`wrote ${OUT} — ${Object.keys(out).length} silhouettes, viewBox ${BOX}×${BOX}`);
