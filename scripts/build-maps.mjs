// One-time build script: generate REAL-geography SVG assets from Natural Earth data.
// Data: world-atlas (Natural Earth) TopoJSON. Projection: d3-geo.
// Outputs: assets/svg/how-to-play.svg, assets/svg/og-image.svg
import { readFileSync, writeFileSync } from 'node:fs';
import { geoMercator, geoOrthographic, geoPath, geoGraticule10, geoArea } from 'd3-geo';
import { feature, merge } from 'topojson-client';

// Return a feature containing ONLY the largest polygon (mainland), dropping
// overseas territories that would otherwise blow up the bounding box (e.g. France).
function mainland(feat) {
  if (feat.geometry.type !== 'MultiPolygon') return feat;
  let best = null, bestArea = -1;
  for (const coords of feat.geometry.coordinates) {
    const poly = { type: 'Polygon', coordinates: coords };
    const a = geoArea(poly);
    if (a > bestArea) { bestArea = a; best = poly; }
  }
  return { ...feat, geometry: best };
}

const DATA_DIR = process.argv[2] || '.';
const OUT_DIR  = process.argv[3] || '.';

const topo50  = JSON.parse(readFileSync(`${DATA_DIR}/countries-50m.json`));
const topo110 = JSON.parse(readFileSync(`${DATA_DIR}/countries-110m.json`));

const countries50 = feature(topo50, topo50.objects.countries).features;
const byId = (feats, id) => feats.find(f => +f.id === id);

// ---------- how-to-play.svg : 4 real country outlines colored by closeness to Japan ----------
function buildHowToPlay() {
  const items = [
    { id: 250, name: 'France',      color: '#FFEDA0', label: '#FFEDA0' }, // far / cold
    { id: 524, name: 'Nepal',       color: '#FEB24C', label: '#FEB24C' },
    { id: 496, name: 'Mongolia',    color: '#E8743B', label: '#E8743B' },
    { id: 410, name: 'South Korea', color: '#8B0000', label: '#E06A5A' }, // near / hot
  ];
  const cellW = 160, cellH = 130, startX = 40, gap = 30, topY = 90;
  const cells = items.map((it, i) => {
    const feat = mainland(byId(countries50, it.id));
    const x = startX + i * (cellW + gap);
    const proj = geoMercator().fitExtent([[x + 14, topY + 14], [x + cellW - 14, topY + cellH - 14]], feat);
    const d = geoPath(proj)(feat);
    const cx = x + cellW / 2;
    return `  <g>
    <path d="${d}" fill="${it.color}" stroke="#0B1622" stroke-width="1" stroke-linejoin="round"/>
    <text x="${cx}" y="${topY + cellH + 26}" text-anchor="middle" font-size="15" fill="${it.label}">${it.name}</text>
  </g>`;
  }).join('\n');

  const W = startX * 2 + items.length * cellW + (items.length - 1) * gap; // 40*2 + 640 + 90 = 810
  const H = 300;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="'Hanken Grotesk', system-ui, sans-serif">
  <defs>
    <linearGradient id="htp-bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#13243A"/><stop offset="1" stop-color="#0B1622"/>
    </linearGradient>
    <marker id="ah" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="#F4C95D"/></marker>
  </defs>
  <rect width="${W}" height="${H}" rx="14" fill="url(#htp-bg)"/>
  <text x="40" y="42" fill="#EAF2F8" font-size="20" font-family="'Fraunces',serif" font-weight="600">If the mystery country is Japan…</text>
  <text x="40" y="66" fill="#9DB2C6" font-size="13">…these real countries light up by how close they are. Hotter = closer.</text>
${cells}
  <line x1="${startX + cellW/2}" y1="262" x2="${W - startX - cellW/2}" y2="262" stroke="#F4C95D" stroke-width="1.5" opacity=".5" marker-end="url(#ah)"/>
  <text x="${startX + cellW/2}" y="284" fill="#9DB2C6" font-size="12" text-anchor="middle">colder · far</text>
  <text x="${W - startX - cellW/2}" y="284" fill="#E06A5A" font-size="12" text-anchor="middle">hotter · near</text>
</svg>
`;
  writeFileSync(`${OUT_DIR}/how-to-play.svg`, svg);
  console.log('wrote how-to-play.svg', W, 'x', H);
}

// ---------- og-image.svg : real orthographic globe (1200x630) ----------
function buildOG() {
  const W = 1200, H = 630;
  const cx = 900, cy = 315, R = 210;
  // rotate to show Africa/Europe/Asia nicely centered
  const proj = geoOrthographic().scale(R).translate([cx, cy]).rotate([-20, -8, 0]).clipAngle(90);
  const path = geoPath(proj);

  // merge all land into one shape (visible hemisphere only, thanks to clipAngle)
  const land = merge(topo110, topo110.objects.countries.geometries);
  const landPath = path(land);
  const graticule = path(geoGraticule10());
  const sphere = path({ type: 'Sphere' });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="'Fraunces', Georgia, serif">
  <defs>
    <radialGradient id="og-space" cx="70%" cy="40%" r="80%"><stop offset="0" stop-color="#15304d"/><stop offset="1" stop-color="#0B1622"/></radialGradient>
    <radialGradient id="og-ocean" cx="40%" cy="35%" r="80%"><stop offset="0" stop-color="#2C84BE"/><stop offset="0.7" stop-color="#1E5F8C"/><stop offset="1" stop-color="#143E5C"/></radialGradient>
    <radialGradient id="og-glow" cx="50%" cy="50%" r="50%"><stop offset="0.62" stop-color="#F4C95D" stop-opacity="0"/><stop offset="0.85" stop-color="#F4C95D" stop-opacity=".22"/><stop offset="1" stop-color="#F4C95D" stop-opacity="0"/></radialGradient>
    <clipPath id="og-clip"><path d="${sphere}"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#og-space)"/>
  <g fill="#EAF2F8">
    <circle cx="120" cy="90" r="2" opacity=".7"/><circle cx="260" cy="180" r="1.4" opacity=".5"/>
    <circle cx="80" cy="420" r="1.8" opacity=".6"/><circle cx="500" cy="120" r="1.4" opacity=".5"/>
    <circle cx="180" cy="540" r="1.6" opacity=".5"/><circle cx="620" cy="560" r="1.4" opacity=".4"/>
  </g>
  <circle cx="${cx}" cy="${cy}" r="${R + 60}" fill="url(#og-glow)"/>
  <path d="${sphere}" fill="url(#og-ocean)" stroke="rgba(244,201,93,.4)" stroke-width="2"/>
  <g clip-path="url(#og-clip)">
    <path d="${graticule}" fill="none" stroke="rgba(244,201,93,.18)" stroke-width="1"/>
    <path d="${landPath}" fill="#E8D9B5" fill-opacity=".95" stroke="#caa86f" stroke-width="0.4"/>
  </g>
  <text x="80" y="250" fill="#EAF2F8" font-size="84" font-weight="600">Globle</text>
  <text x="80" y="338" fill="#F4C95D" font-size="84" font-weight="600">Unlimited</text>
  <text x="80" y="398" fill="#9DB2C6" font-size="29" font-family="'Hanken Grotesk',system-ui,sans-serif">Guess the mystery country on a 3D globe.</text>
  <text x="80" y="436" fill="#9DB2C6" font-size="29" font-family="'Hanken Grotesk',system-ui,sans-serif">Unlimited rounds — no daily wait.</text>
  <rect x="80" y="478" width="300" height="62" rx="31" fill="#F4C95D"/>
  <text x="230" y="518" fill="#0B1622" font-size="26" font-weight="700" text-anchor="middle" font-family="'Hanken Grotesk',system-ui,sans-serif">▶  Play Free Now</text>
</svg>
`;
  writeFileSync(`${OUT_DIR}/og-image.svg`, svg);
  console.log('wrote og-image.svg', W, 'x', H);
}

buildHowToPlay();
buildOG();
console.log('done.');
