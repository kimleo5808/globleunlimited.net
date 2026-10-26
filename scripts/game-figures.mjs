// Generates the hub cover cards and the in-page plates for the three planned
// game pages: Globle Routes, Higher or Lower, and the Map Quiz series.
//
// Usage: node scripts/game-figures.mjs
//
// Like scripts/blog-figures.mjs, every figure encodes values computed here
// from the game's own data, so the numbers quoted in the page copy can be
// regenerated rather than asserted. Plates follow the atlas-plate convention
// (1000x560, #0E1C2E ground, gold hairline frame, Georgia titles, Space Mono
// annotation); covers follow the 400x250 game-card convention.
//
// Population is World Bank SP.POP.TOTL for 2024 (CC BY 4.0), cached at
// scripts/data/wb-pop-2024.json. To refresh it:
//   curl "https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&date=2024&per_page=400"
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { geoAzimuthalEqualArea, geoEqualEarth, geoPath, geoArea } from 'd3-geo';

const require = createRequire(import.meta.url);
const WC = require('world-countries');

const COUNTRIES = JSON.parse(readFileSync('src/data/countries.json', 'utf8'));
const WORLD = JSON.parse(readFileSync('public/assets/data/world.geo.json', 'utf8'));
const FEATURES = WORLD.features;
const featureOf = new Map(FEATURES.map((f) => [f.properties.name, f]));
const countryOf = new Map(COUNTRIES.map((c) => [c.name, c]));
const wcBy2 = new Map(WC.map((w) => [w.cca2, w]));

// ── palette (mirrors src/styles/tokens.css) ────────────────────────────────
const C = {
  ground: '#0E1C2E',
  deep: '#0B1622',
  panel: '#1B3350',
  panel2: '#13243A',
  gold: '#F4C95D',
  text: '#EAF2F8',
  dim: '#9DB2C6',
  mute: '#5E7891',
  heat: ['#FFEDA0', '#FEB24C', '#E8743B', '#C42D1C', '#8B0000'],
  sea: '#1E5F8C',
  land: '#E8D9B5',
  win: '#2E9E4F',
  danger: '#E06A5A',
};
const REGION_COLOUR = {
  Africa: '#E8743B',
  Europe: '#7FB3D5',
  Asia: '#FEB24C',
  'North America': '#2E9E4F',
  'South America': '#9BD08A',
  Oceania: '#C39BD3',
};
const MONO = `'Space Mono',ui-monospace,monospace`;
const SERIF = `Georgia,'Times New Roman',serif`;
const SANS = `'Hanken Grotesk',system-ui,sans-serif`;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const millions = (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : `${Math.round(n / 1e3)}K`);

/** d3 path data carries ~6 decimals; one is plenty at plate scale. */
const tidy = (d) => (d ?? '').replace(/-?\d+\.\d+/g, (n) => (Math.round(Number(n) * 10) / 10).toString());
/** Whole pixels for world maps, where a country is rarely more than a few
 *  dozen pixels across; it halves the file with no visible change. */
const tidyInt = (d) => (d ?? '').replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n))));

/** Only features whose projected box touches the view: clipped-away outlines
 *  would otherwise still ship in the file. */
const inView = (path, [[x0, y0], [x1, y1]]) => (f) => {
  const [[a, b], [c, d]] = path.bounds(f);
  return c >= x0 && a <= x1 && d >= y0 && b <= y1;
};

/** Largest polygon of a feature: France without French Guiana, the US
 *  without Alaska. Used for fitting views and placing labels, never for fill. */
function mainland(f) {
  if (f.geometry.type !== 'MultiPolygon') return f;
  let best = null, bestArea = -1;
  for (const coords of f.geometry.coordinates) {
    const poly = { type: 'Polygon', coordinates: coords };
    const a = geoArea(poly);
    if (a > bestArea) { bestArea = a; best = poly; }
  }
  return { type: 'Feature', properties: f.properties, geometry: best };
}
const collection = (features) => ({ type: 'FeatureCollection', features });

/** Standard 1000x560 plate shell. */
function plate({ title, sub, aria, body, footer, defs = '' }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="560" viewBox="0 0 1000 560" role="img" aria-label="${esc(aria)}">
  ${defs}<rect width="1000" height="560" fill="${C.ground}"/>
  <rect x="16" y="16" width="968" height="528" fill="none" stroke="${C.gold}" stroke-opacity="0.3"/>
  <text x="50" y="62" font-family="${SERIF}" font-size="27" fill="${C.text}">${esc(title)}</text>
  <text x="50" y="90" font-family="${MONO}" font-size="15" fill="${C.mute}">${esc(sub)}</text>
${body}
  <text x="50" y="524" font-family="${MONO}" font-size="13" fill="${C.mute}">${esc(footer ?? 'globleunlimited.net')}</text>
</svg>
`;
}

/** 400x250 hub card shell, matching public/assets/svg/games/*.svg. */
function card(id, body, { grid = true } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250" width="400" height="250" font-family="${MONO}">
  <defs>
    <linearGradient id="${id}-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#15304d"/><stop offset="1" stop-color="#0B1622"/></linearGradient>
    <pattern id="${id}-grid" width="26" height="26" patternUnits="userSpaceOnUse">
      <path d="M26 0H0V26" fill="none" stroke="rgba(244,201,93,.12)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="400" height="250" fill="url(#${id}-bg)"/>
${grid ? `  <rect width="400" height="250" fill="url(#${id}-grid)"/>\n` : ''}${body}
</svg>
`;
}

/** Horizontal bar chart. rows: [label, value, colour, shown?]. */
function bars(rows, { x = 300, y = 120, w = 560, rowH = 36, max, unit = '' }) {
  const peak = max ?? Math.max(...rows.map((r) => r[1]));
  return rows
    .map(([label, value, colour, shown], i) => {
      const top = y + i * rowH;
      const bw = Math.max(3, (value / peak) * w);
      return `  <g font-family="${MONO}" font-size="15">
    <text x="${x - 12}" y="${top + 15}" text-anchor="end" fill="${C.text}">${esc(label)}</text>
    <rect x="${x}" y="${top}" width="${bw.toFixed(0)}" height="21" fill="${colour}"/>
    <text x="${x + bw + 10}" y="${top + 16}" fill="${C.dim}">${esc(shown ?? value.toLocaleString('en-US') + unit)}</text>
  </g>`;
    })
    .join('\n');
}

function write(path, svg) {
  mkdirSync(path.slice(0, path.lastIndexOf('/')), { recursive: true });
  writeFileSync(path, svg);
  console.log(`${String(Buffer.byteLength(svg)).padStart(7)}  ${path}`);
}

// ════════════════════════════════════════════════════════════════════════════
// Route network, as built by scripts/build-routes.mjs (the same file the game
// loads). Countries with no land route are kept as isolated nodes.
// ════════════════════════════════════════════════════════════════════════════
const ROUTES = JSON.parse(readFileSync('src/data/routes.json', 'utf8'));
const ADJ = new Map(COUNTRIES.map((c) => [c.name, new Set(ROUTES.links[c.name] ?? [])]));

const NODES = [...ADJ.keys()];
const component = new Map();
const COMPONENTS = [];
for (const n of NODES) {
  if (component.has(n)) continue;
  const comp = [];
  const q = [n];
  component.set(n, COMPONENTS.length);
  while (q.length) {
    const x = q.shift();
    comp.push(x);
    for (const y of ADJ.get(x)) if (!component.has(y)) { component.set(y, COMPONENTS.length); q.push(y); }
  }
  COMPONENTS.push(comp);
}
const compSize = (n) => COMPONENTS[component.get(n)].length;

function shortestPath(a, b) {
  const prev = new Map([[a, null]]);
  const q = [a];
  while (q.length) {
    const x = q.shift();
    if (x === b) break;
    for (const y of [...ADJ.get(x)].sort()) if (!prev.has(y)) { prev.set(y, x); q.push(y); }
  }
  const path = [];
  for (let x = b; x; x = prev.get(x)) path.unshift(x);
  return path;
}

// Brandes betweenness + distribution of countries-between for every pair.
const between = new Map(NODES.map((n) => [n, 0]));
const lenHist = {};
for (const s of NODES) {
  const stack = [], preds = new Map(), sigma = new Map([[s, 1]]), dist = new Map([[s, 0]]);
  const q = [s];
  while (q.length) {
    const v = q.shift();
    stack.push(v);
    for (const w of ADJ.get(v)) {
      if (!dist.has(w)) { dist.set(w, dist.get(v) + 1); q.push(w); }
      if (dist.get(w) === dist.get(v) + 1) {
        sigma.set(w, (sigma.get(w) ?? 0) + sigma.get(v));
        if (!preds.has(w)) preds.set(w, []);
        preds.get(w).push(v);
      }
    }
  }
  const delta = new Map();
  while (stack.length) {
    const w = stack.pop();
    for (const v of preds.get(w) ?? []) delta.set(v, (delta.get(v) ?? 0) + (sigma.get(v) / sigma.get(w)) * (1 + (delta.get(w) ?? 0)));
    if (w !== s) between.set(w, between.get(w) + (delta.get(w) ?? 0));
  }
  for (const [t, d] of dist) if (t > s && d >= 2) lenHist[d - 1] = (lenHist[d - 1] ?? 0) + 1;
}
const TOTAL_ROUTES = Object.values(lenHist).reduce((a, b) => a + b, 0);
// Undirected: Brandes counts every pair from both ends.
const CHOKEPOINTS = [...between]
  .map(([n, v]) => [n, ((v / 2) / TOTAL_ROUTES) * 100])
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

// ════════════════════════════════════════════════════════════════════════════
// Population (World Bank 2024) joined to the pool.
// ════════════════════════════════════════════════════════════════════════════
const wb = JSON.parse(readFileSync('scripts/data/wb-pop-2024.json', 'utf8'))[1];
const popBy3 = new Map(wb.filter((r) => r.value != null).map((r) => [r.countryiso3code, r.value]));
const POP = COUNTRIES.map((c) => {
  const iso3 = c.cca2 ? wcBy2.get(c.cca2)?.cca3 : c.name === 'Kosovo' ? 'XKX' : null;
  const pop = iso3 ? popBy3.get(iso3) : undefined;
  return pop && c.area ? { ...c, pop, density: pop / c.area } : null;
}).filter(Boolean);
const popOf = new Map(POP.map((c) => [c.name, c]));
let agree = 0, pairs = 0;
for (let i = 0; i < POP.length; i++) for (let j = i + 1; j < POP.length; j++) {
  pairs++;
  if ((POP[i].area > POP[j].area) === (POP[i].pop > POP[j].pop)) agree++;
}
const AREA_RULE_PCT = (agree / pairs) * 100;

// ════════════════════════════════════════════════════════════════════════════
// Map-quiz regions (UN members; Vatican City is an observer state, so it is
// counted apart even though world-countries flags it as a member).
// ════════════════════════════════════════════════════════════════════════════
const quizRegion = (w) => (w.region === 'Americas' ? (w.subregion === 'South America' ? 'South America' : 'North America') : w.region);
const UN = WC.filter((w) => w.unMember && w.cca2 !== 'VA');
const REGIONS = ['Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America'];
const drawable = new Set(COUNTRIES.map((c) => c.cca2).filter(Boolean));

const OUT = 'public/assets/games';

// ── Routes ────────────────────────────────────────────────────────────────
{
  const route = shortestPath('Portugal', 'Poland');
  const routeFeatures = route.map((n) => mainland(featureOf.get(n)));
  const proj = geoAzimuthalEqualArea().rotate([-6, -48]).fitExtent([[70, 120], [590, 495]], collection(routeFeatures)).clipExtent([[40, 106], [620, 506]]);
  const path = geoPath(proj);
  const stepOf = new Map(route.map((n, i) => [n, i]));
  const shapes = FEATURES.filter(inView(path, [[40, 106], [620, 506]])).map((f) => {
    const i = stepOf.get(f.properties.name);
    const fill = i === undefined ? C.land : i === 0 || i === route.length - 1 ? C.gold : C.heat[2];
    const op = i === undefined ? 0.16 : 0.95;
    return `<path d="${tidy(path(f))}" fill="${fill}" fill-opacity="${op}" stroke="${C.ground}" stroke-width="0.8"/>`;
  }).join('');
  const pts = routeFeatures.map((f) => path.centroid(f));
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const dots = pts.map((p, i) => {
    const end = i === 0 || i === pts.length - 1;
    return `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${end ? 9 : 13}" fill="${end ? C.ground : C.deep}" stroke="${C.gold}" stroke-width="2"/>` +
      (end ? '' : `<text x="${p[0].toFixed(1)}" y="${(p[1] + 5).toFixed(1)}" text-anchor="middle" font-family="${MONO}" font-size="14" fill="${C.gold}">${i}</text>`);
  }).join('');
  const inner = route.length - 2;
  const steps = route.map((n, i) => {
    const y = 150 + i * 46;
    const tag = i === 0 ? 'START' : i === route.length - 1 ? 'END' : `GUESS ${i}`;
    const colour = i === 0 || i === route.length - 1 ? C.gold : C.win;
    return `<text x="660" y="${y}" font-family="${MONO}" font-size="12" fill="${C.mute}">${tag}</text>
    <text x="760" y="${y}" font-family="${SANS}" font-size="19" fill="${colour}">${esc(n)}${i && i < route.length - 1 ? '  ✓' : ''}</text>`;
  }).join('\n    ');
  write(`${OUT}/routes/fig-1-how-routes-work.svg`, plate({
    title: 'One route, three guesses: Portugal to Poland',
    sub: `the shortest land route crosses ${inner} countries — that is par`,
    aria: `Map of Europe showing the shortest land route from Portugal to Poland through ${route.slice(1, -1).join(', ')}, numbered in order`,
    body: `  <g>${shapes}</g>
  <path d="${line}" fill="none" stroke="${C.gold}" stroke-width="2.5" stroke-dasharray="7 6"/>
  ${dots}
  <line x1="636" y1="120" x2="636" y2="496" stroke="${C.gold}" stroke-opacity="0.25"/>
  <g>
    ${steps}
  </g>
  <text x="660" y="${150 + route.length * 46 + 6}" font-family="${MONO}" font-size="13" fill="${C.dim}">${inner} guesses = par · each must border the last</text>`,
    footer: 'Shortest path over land borders in the 176-country pool · globleunlimited.net',
  }));

  // Network map.
  const world = geoEqualEarth().fitExtent([[40, 108], [960, 452]], { type: 'Sphere' });
  const wpath = geoPath(world);
  const big = COMPONENTS.slice().sort((a, b) => b.length - a.length);
  const colourFor = (n) => {
    const size = compSize(n);
    if (size === big[0].length) return C.heat[2];
    if (size === big[1].length) return C.heat[1];
    if (size > 1) return C.dim;
    return C.mute;
  };
  const isolated = COMPONENTS.filter((c) => c.length === 1).length;
  const pairsSmall = COMPONENTS.filter((c) => c.length === 2).map((c) => c.join('–'));
  const routeable = NODES.length - isolated;
  const shapesW = FEATURES.map((f) => `<path d="${tidyInt(wpath(f))}" fill="${colourFor(f.properties.name)}" fill-opacity="${compSize(f.properties.name) === 1 ? 0.35 : 0.9}" stroke="${C.ground}" stroke-width="0.5"/>`).join('');
  const callout = (name, text, dx, dy) => {
    const [x, y] = wpath.centroid(mainland(featureOf.get(name)));
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${C.gold}"/><line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + dx).toFixed(1)}" y2="${(y + dy).toFixed(1)}" stroke="${C.gold}" stroke-width="1"/><text x="${(x + dx + (dx < 0 ? -4 : 4)).toFixed(1)}" y="${(y + dy + 4).toFixed(1)}" text-anchor="${dx < 0 ? 'end' : 'start'}" font-family="${MONO}" font-size="12" fill="${C.gold}">${esc(text)}</text>`;
  };
  const legend = [
    [C.heat[2], `Africa–Eurasia: ${big[0].length} countries`],
    [C.heat[1], `The Americas: ${big[1].length} countries`],
    [C.dim, `Pairs: ${pairsSmall.join(' · ')}`],
    [C.mute, `No land route: ${isolated} islands`],
  ].map(([c, t], i) => {
    const x = 50 + (i % 2) * 440, y = 466 + Math.floor(i / 2) * 22;
    return `<rect x="${x}" y="${y}" width="14" height="14" fill="${c}"/><text x="${x + 22}" y="${y + 12}" font-family="${MONO}" font-size="12" fill="${C.text}">${esc(t)}</text>`;
  }).join('');
  write(`${OUT}/routes/fig-2-land-network.svg`, plate({
    title: `${routeable} countries can be reached overland`,
    sub: `the pool splits into two big networks, two pairs and ${isolated} islands`,
    aria: `World map coloured by land network: ${big[0].length} countries in Africa and Eurasia, ${big[1].length} in the Americas, ${isolated} islands with no land route`,
    body: `  <g>${shapesW}</g>
  ${callout('Panama', 'Panama: every North–South route', -40, 62)}
  ${callout('Egypt', 'Egypt: Africa’s only land link to Asia', 150, 112)}
  ${legend}`,
    footer: 'Land borders + Channel Tunnel + Øresund Bridge · Natural Earth 1:110m · globleunlimited.net',
  }));

  // Chokepoints.
  write(`${OUT}/routes/fig-3-chokepoints.svg`, plate({
    title: `${CHOKEPOINTS[0][0]} sits on ${Math.round(CHOKEPOINTS[0][1])}% of all shortest routes`,
    sub: `share of the ${fmt(TOTAL_ROUTES)} shortest routes that pass through each country`,
    aria: `Bar chart of chokepoint countries: ${CHOKEPOINTS.map(([n, v]) => `${n} ${v.toFixed(1)}%`).join(', ')}`,
    body: bars(CHOKEPOINTS.map(([n, v], i) => [n, v, i < 3 ? C.heat[3] : C.heat[2], `${v.toFixed(1)}%`]), { x: 300, y: 120, rowH: 37, w: 540 }),
    footer: 'Betweenness on the land-border network, every pair of routeable countries · globleunlimited.net',
  }));

  // Route lengths.
  const maxK = Math.max(...Object.keys(lenHist).map(Number));
  const peak = Math.max(...Object.values(lenHist));
  const bw = 46, x0 = 90, base = 450, h = 300;
  const band = (k) => (k >= 2 && k <= 3 ? ['Short', C.heat[1]] : k >= 4 && k <= 5 ? ['Medium', C.heat[2]] : k >= 6 && k <= 8 ? ['Long', C.heat[3]] : [null, C.mute]);
  const cols = Array.from({ length: maxK }, (_, i) => i + 1).map((k) => {
    const v = lenHist[k] ?? 0;
    const bh = (v / peak) * h;
    const x = x0 + (k - 1) * (bw + 4);
    return `<rect x="${x}" y="${(base - bh).toFixed(1)}" width="${bw}" height="${bh.toFixed(1)}" fill="${band(k)[1]}"/>
    <text x="${x + bw / 2}" y="${base + 20}" text-anchor="middle" font-family="${MONO}" font-size="13" fill="${C.dim}">${k}</text>
    <text x="${x + bw / 2}" y="${(base - bh - 6).toFixed(1)}" text-anchor="middle" font-family="${MONO}" font-size="11" fill="${C.dim}">${v}</text>`;
  }).join('\n    ');
  const playable = [2, 3, 4, 5, 6, 7, 8].reduce((s, k) => s + (lenHist[k] ?? 0), 0);
  const bandLegend = [['Short · 2–3', C.heat[1]], ['Medium · 4–5', C.heat[2]], ['Long · 6–8', C.heat[3]]]
    .map(([t, c], i) => `<rect x="${620 + i * 120}" y="128" width="14" height="14" fill="${c}"/><text x="${640 + i * 120}" y="140" font-family="${MONO}" font-size="12" fill="${C.text}">${t}</text>`).join('');
  write(`${OUT}/routes/fig-4-route-lengths.svg`, plate({
    title: `${fmt(playable)} start–end pairs make a 2–8 country route`,
    sub: `countries between start and end, for all ${fmt(TOTAL_ROUTES)} reachable pairs`,
    aria: `Histogram of shortest route lengths from 1 to ${maxK} countries between start and end; ${playable} pairs fall between 2 and 8`,
    body: `  ${bandLegend}
  <line x1="${x0 - 6}" y1="${base}" x2="${x0 + maxK * (bw + 4)}" y2="${base}" stroke="${C.mute}"/>
    ${cols}
  <text x="${x0}" y="${base + 44}" font-family="${MONO}" font-size="12" fill="${C.mute}">countries between start and end →</text>`,
    footer: `Longest route: ${maxK} countries between · land borders in the 176-country pool · globleunlimited.net`,
  }));

  // Cover card: the Portugal → Poland route in miniature.
  const cp = geoAzimuthalEqualArea().rotate([-6, -48]).fitExtent([[40, 30], [360, 220]], collection(routeFeatures)).clipExtent([[0, 0], [400, 250]]);
  const cpath = geoPath(cp);
  const cshapes = FEATURES.filter(inView(cpath, [[0, 0], [400, 250]])).map((f) => {
    const i = stepOf.get(f.properties.name);
    if (i === undefined) return `<path d="${tidy(cpath(f))}" fill="#E8D9B5" fill-opacity=".14" stroke="#0B1622" stroke-width=".6"/>`;
    const end = i === 0 || i === route.length - 1;
    return `<path d="${tidy(cpath(f))}" fill="${end ? C.gold : C.heat[2]}" fill-opacity="${end ? 1 : 0.85}" stroke="#0B1622" stroke-width=".8"/>`;
  }).join('');
  const cpts = routeFeatures.map((f) => cpath.centroid(f));
  write('public/assets/svg/games/routes.svg', card('rt', `  <g>${cshapes}</g>
  <path d="${cpts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')}" fill="none" stroke="#F4C95D" stroke-width="2.5" stroke-dasharray="6 5"/>
  ${cpts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i === 0 || i === cpts.length - 1 ? 6 : 4}" fill="#0B1622" stroke="#F4C95D" stroke-width="2"/>`).join('')}`, { grid: true }));
}

// ── Higher or Lower ────────────────────────────────────────────────────────
{
  const canada = popOf.get('Canada'), india = popOf.get('India');
  const cardBox = (x, c, revealed) => `<g>
    <rect x="${x}" y="130" width="300" height="290" rx="18" fill="${C.panel2}" stroke="${C.gold}" stroke-opacity="0.35"/>
    <text x="${x + 24}" y="172" font-family="${MONO}" font-size="12" fill="${C.mute}">${revealed ? 'KNOWN' : 'CHALLENGER'}</text>
    <text x="${x + 24}" y="214" font-family="${SERIF}" font-size="34" fill="${C.text}">${esc(c.name)}</text>
    <text x="${x + 24}" y="250" font-family="${MONO}" font-size="13" fill="${C.dim}">${fmt(c.area)} km²</text>
    <text x="${x + 24}" y="318" font-family="${MONO}" font-size="40" fill="${revealed ? C.gold : C.mute}">${revealed ? millions(c.pop) : '???'}</text>
    <text x="${x + 24}" y="344" font-family="${MONO}" font-size="12" fill="${C.mute}">PEOPLE</text>
  </g>`;
  write(`${OUT}/higher-or-lower/fig-1-how-it-works.svg`, plate({
    title: 'Bigger is not the same as busier',
    sub: `${canada.name} is ${(canada.area / india.area).toFixed(1)}× ${india.name}'s size — guess which has more people`,
    aria: `Game cards: ${canada.name}, ${fmt(canada.area)} square kilometres, ${millions(canada.pop)} people, against ${india.name} with population hidden and Higher and Lower buttons`,
    body: `  ${cardBox(70, canada, true)}
  <text x="415" y="290" text-anchor="middle" font-family="${SERIF}" font-size="30" fill="${C.gold}">vs</text>
  ${cardBox(470, india, false)}
  <g font-family="${MONO}" font-size="16">
    <rect x="800" y="180" width="150" height="54" rx="27" fill="${C.win}"/><text x="875" y="213" text-anchor="middle" fill="${C.text}">▲ HIGHER</text>
    <rect x="800" y="250" width="150" height="54" rx="27" fill="none" stroke="${C.danger}" stroke-width="2"/><text x="875" y="283" text-anchor="middle" fill="${C.danger}">▼ LOWER</text>
    <text x="875" y="352" text-anchor="middle" font-size="12" fill="${C.mute}">STREAK</text>
    <text x="875" y="388" text-anchor="middle" font-size="30" fill="${C.gold}">7</text>
  </g>`,
    footer: `Answer: ${india.name} has ${Math.round(india.pop / canada.pop)}× more people · population: World Bank 2024 · globleunlimited.net`,
  }));

  // Area vs population, log-log.
  const X0 = 110, X1 = 900, Y0 = 470, Y1 = 120;
  const ax = [3, 7.3], ay = [4.5, 9.3];
  const sx = (a) => X0 + ((Math.log10(a) - ax[0]) / (ax[1] - ax[0])) * (X1 - X0);
  const sy = (p) => Y0 - ((Math.log10(p) - ay[0]) / (ay[1] - ay[0])) * (Y0 - Y1);
  const regionOfCountry = (c) => (c.region === 'Americas' ? (c.subregion === 'South America' ? 'South America' : 'North America') : c.region);
  const dots = POP.map((c) => `<circle cx="${sx(c.area).toFixed(1)}" cy="${sy(c.pop).toFixed(1)}" r="4.5" fill="${REGION_COLOUR[regionOfCountry(c)] ?? C.dim}" fill-opacity="0.85"/>`).join('');
  // Density guide lines: people = density * area. Unlabelled on the plot,
  // where every free spot is taken by a country; the subtitle names them.
  const guides = [1, 10, 100, 1000].map((d) => {
    const [a0, a1] = [10 ** ax[0], 10 ** ax[1]];
    return `<line x1="${sx(a0).toFixed(1)}" y1="${sy(d * a0).toFixed(1)}" x2="${sx(a1).toFixed(1)}" y2="${sy(d * a1).toFixed(1)}" stroke="${C.mute}" stroke-dasharray="4 5"/>`;
  }).join('\n    ');
  const labelled = ['India', 'China', 'United States', 'Russia', 'Canada', 'Australia', 'Greenland', 'Mongolia', 'Bangladesh', 'Lebanon', 'Iceland', 'Nigeria'];
  const labels = labelled.map((n) => {
    const c = popOf.get(n);
    const right = sx(c.area) < 780;
    return `<text x="${(sx(c.area) + (right ? 8 : -8)).toFixed(1)}" y="${(sy(c.pop) + 4).toFixed(1)}" text-anchor="${right ? 'start' : 'end'}" font-family="${MONO}" font-size="12" fill="${C.text}">${esc(n)}</text>`;
  }).join('');
  const tick = (v, lab, axis) => axis === 'x'
    ? `<text x="${sx(v).toFixed(1)}" y="${Y0 + 22}" text-anchor="middle" font-family="${MONO}" font-size="12" fill="${C.dim}">${lab}</text>`
    : `<text x="${X0 - 10}" y="${(sy(v) + 4).toFixed(1)}" text-anchor="end" font-family="${MONO}" font-size="12" fill="${C.dim}">${lab}</text>`;
  // Top-left of a log-log area/population plot is empty: nothing small holds a billion.
  const legend = Object.entries(REGION_COLOUR).map(([r, c], i) => `<circle cx="${132 + (i % 2) * 120}" cy="${132 + Math.floor(i / 2) * 20}" r="5" fill="${c}"/><text x="${142 + (i % 2) * 120}" y="${136 + Math.floor(i / 2) * 20}" font-family="${MONO}" font-size="11" fill="${C.text}">${r}</text>`).join('');
  write(`${OUT}/higher-or-lower/fig-2-area-vs-population.svg`, plate({
    title: `"Bigger means more people" is right ${AREA_RULE_PCT.toFixed(0)}% of the time`,
    sub: `area against population, ${POP.length} countries, log scales · dashed: 1, 10, 100, 1,000 people/km²`,
    aria: `Log-log scatter of land area against population for ${POP.length} countries with density guide lines; outliers include Greenland, Mongolia, Bangladesh and Lebanon`,
    body: `  <g clip-path="url(#hol-clip)">${guides}</g>
  ${dots}
  ${labels}
  ${legend}
  <line x1="${X0}" y1="${Y0}" x2="${X1}" y2="${Y0}" stroke="${C.mute}"/><line x1="${X0}" y1="${Y0}" x2="${X0}" y2="${Y1}" stroke="${C.mute}"/>
  ${[[1e3, '1K'], [1e4, '10K'], [1e5, '100K'], [1e6, '1M'], [1e7, '10M km²']].map(([v, l]) => tick(v, l, 'x')).join('')}
  ${[[1e5, '100K'], [1e6, '1M'], [1e7, '10M'], [1e8, '100M'], [1e9, '1B']].map(([v, l]) => tick(v, l, 'y')).join('')}`,
    defs: `<defs><clipPath id="hol-clip"><rect x="${X0}" y="${Y1}" width="${X1 - X0}" height="${Y0 - Y1}"/></clipPath></defs>`,
    footer: `Population: World Bank 2024 (CC BY 4.0) · area: world-countries · ${fmt(pairs)} country pairs tested · globleunlimited.net`,
  }));

  // Trap pairs: larger country, fewer people.
  const TRAPS = [['Greenland', 'Bangladesh'], ['Mongolia', 'Lebanon'], ['Australia', 'South Korea'], ['Canada', 'India'], ['Libya', 'Rwanda'], ['Botswana', 'Burundi']]
    .map(([a, b]) => [popOf.get(a), popOf.get(b)]);
  for (const [big, small] of TRAPS) {
    if (!(big.area > small.area && big.pop < small.pop)) throw new Error(`${big.name}/${small.name} is not a trap pair`);
  }
  const mid = 500, lw = 300;
  const lg = (r) => Math.log10(r) / Math.log10(3200);
  const rows = TRAPS.map(([big, small], i) => {
    const y = 140 + i * 58;
    const areaR = big.area / small.area, popR = small.pop / big.pop;
    return `<g font-family="${MONO}" font-size="13">
    <text x="${mid}" y="${y - 6}" text-anchor="middle" fill="${C.text}">${esc(big.name)} vs ${esc(small.name)}</text>
    <rect x="${(mid - 8 - lg(areaR) * lw).toFixed(1)}" y="${y + 2}" width="${(lg(areaR) * lw).toFixed(1)}" height="16" fill="${C.land}" fill-opacity="0.75"/>
    <text x="${(mid - 16 - lg(areaR) * lw).toFixed(1)}" y="${y + 15}" text-anchor="end" fill="${C.dim}">${areaR.toFixed(1)}× bigger</text>
    <rect x="${mid + 8}" y="${y + 2}" width="${(lg(popR) * lw).toFixed(1)}" height="16" fill="${C.heat[3]}"/>
    <text x="${(mid + 16 + lg(popR) * lw).toFixed(1)}" y="${y + 15}" fill="${C.dim}">${popR >= 10 ? fmt(popR) : popR.toFixed(1)}× fewer people</text>
  </g>`;
  }).join('\n');
  write(`${OUT}/higher-or-lower/fig-3-trap-pairs.svg`, plate({
    title: 'Six pairs where the bigger country loses',
    sub: 'left: how many times larger · right: how many times fewer people (log scale)',
    aria: `Diverging bar chart of trap pairs: ${TRAPS.map(([a, b]) => `${a.name} is ${(a.area / b.area).toFixed(1)} times bigger than ${b.name} with ${(b.pop / a.pop).toFixed(1)} times fewer people`).join('; ')}`,
    body: `  <line x1="${mid}" y1="118" x2="${mid}" y2="486" stroke="${C.gold}" stroke-opacity="0.35"/>\n${rows}`,
    footer: 'Population: World Bank 2024 (CC BY 4.0) · area: world-countries · globleunlimited.net',
  }));

  // Density extremes on a log scale.
  const dense = [...POP].sort((a, b) => b.density - a.density).slice(0, 5);
  const sparse = [...POP].sort((a, b) => a.density - b.density).slice(0, 5);
  const lmin = -2, lmax = 3.2, w = 520, x = 320;
  const scale = (d) => ((Math.log10(d) - lmin) / (lmax - lmin)) * w;
  const drow = (c, i, colour) => {
    const y = 128 + i * 36;
    return `<g font-family="${MONO}" font-size="14"><text x="${x - 12}" y="${y + 15}" text-anchor="end" fill="${C.text}">${esc(c.name)}</text>
    <rect x="${x}" y="${y}" width="${scale(c.density).toFixed(1)}" height="20" fill="${colour}"/>
    <text x="${(x + scale(c.density) + 10).toFixed(1)}" y="${y + 15}" fill="${C.dim}">${c.density < 1 ? c.density.toFixed(2) : c.density < 10 ? c.density.toFixed(1) : fmt(c.density)} /km²</text></g>`;
  };
  // Two significant figures: "45,000x" reads as a magnitude, "44,824x" as false precision.
  const ratio = dense[0].density / sparse[0].density;
  const sig2 = (n) => { const p = 10 ** (Math.floor(Math.log10(n)) - 1); return Math.round(n / p) * p; };
  write(`${OUT}/higher-or-lower/fig-4-density-extremes.svg`, plate({
    title: `${dense[0].name} packs ${fmt(sig2(ratio))}× more people per km² than ${sparse[0].name}`,
    sub: 'people per square kilometre, densest and emptiest countries in the pool (log scale)',
    aria: `Bar chart of population density: densest ${dense.map((c) => `${c.name} ${Math.round(c.density)}`).join(', ')}; sparsest ${sparse.map((c) => `${c.name} ${c.density.toFixed(2)}`).join(', ')}`,
    body: `${dense.map((c, i) => drow(c, i, C.heat[3])).join('\n')}
  <line x1="60" y1="312" x2="940" y2="312" stroke="${C.gold}" stroke-opacity="0.25"/>
${sparse.map((c, i) => drow(c, i + 5.4, C.sea)).join('\n')}`,
    footer: 'Population: World Bank 2024 (CC BY 4.0) · area: world-countries · globleunlimited.net',
  }));

  write('public/assets/svg/games/higher-or-lower.svg', card('hl', `  <g font-family="${MONO}">
    <rect x="34" y="58" width="140" height="134" rx="12" fill="#13243A" stroke="#F4C95D" stroke-opacity=".45"/>
    <text x="50" y="92" fill="#EAF2F8" font-size="15" font-family="Georgia,serif">${esc(canada.name)}</text>
    <text x="50" y="140" fill="#F4C95D" font-size="24">${millions(canada.pop)}</text>
    <text x="50" y="162" fill="#5E7891" font-size="10">PEOPLE</text>
    <text x="200" y="132" text-anchor="middle" fill="#F4C95D" font-size="16" font-family="Georgia,serif">vs</text>
    <rect x="226" y="58" width="140" height="134" rx="12" fill="#13243A" stroke="#F4C95D" stroke-opacity=".45"/>
    <text x="242" y="92" fill="#EAF2F8" font-size="15" font-family="Georgia,serif">${esc(india.name)}</text>
    <text x="242" y="140" fill="#5E7891" font-size="24">???</text>
    <rect x="242" y="206" width="56" height="24" rx="12" fill="#2E9E4F"/><text x="270" y="222" text-anchor="middle" fill="#EAF2F8" font-size="11">▲ HI</text>
    <rect x="304" y="206" width="56" height="24" rx="12" fill="none" stroke="#E06A5A"/><text x="332" y="222" text-anchor="middle" fill="#E06A5A" font-size="11">▼ LO</text>
  </g>`));
}

// ── Map Quiz ───────────────────────────────────────────────────────────────
{
  const world = geoEqualEarth().fitExtent([[40, 108], [960, 466]], { type: 'Sphere' });
  const wpath = geoPath(world);
  const regionByCca2 = new Map(UN.map((w) => [w.cca2, quizRegion(w)]));
  const shapes = FEATURES.map((f) => {
    const r = regionByCca2.get(f.properties.cca2);
    return `<path d="${tidyInt(wpath(f))}" fill="${r ? REGION_COLOUR[r] : C.mute}" fill-opacity="${r ? 0.9 : 0.35}" stroke="${C.ground}" stroke-width="0.5"/>`;
  }).join('');
  const tiny = UN.filter((w) => !drawable.has(w.cca2));
  const dots = tiny.map((w) => {
    const [x, y] = world([w.latlng[1], w.latlng[0]]);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${REGION_COLOUR[quizRegion(w)]}" stroke="${C.text}" stroke-width="1"/>`;
  }).join('');
  const counts = REGIONS.map((r) => [r, UN.filter((w) => quizRegion(w) === r).length]).sort((a, b) => b[1] - a[1]);
  const legend = counts.map(([r, n], i) => `<rect x="${50 + i * 152}" y="480" width="14" height="14" fill="${REGION_COLOUR[r]}"/><text x="${70 + i * 152}" y="492" font-family="${MONO}" font-size="12" fill="${C.text}">${esc(r)} ${n}</text>`).join('');
  write(`${OUT}/map-quiz/fig-1-quiz-regions.svg`, plate({
    title: `${UN.length} UN member states, six quizzes`,
    sub: `circled dots: ${tiny.length} members too small for a 1:110m map, given a tap target instead`,
    aria: `World map coloured by quiz region with member counts: ${counts.map(([r, n]) => `${r} ${n}`).join(', ')}; small states shown as dots`,
    body: `  <g>${shapes}</g>
  ${dots}
  ${legend}`,
    footer: 'Grey: territories and non-members, optional in the quiz · Vatican City and Palestine are UN observers · globleunlimited.net',
  }));

  const small = REGIONS.map((r) => {
    const members = UN.filter((w) => quizRegion(w) === r);
    return [r, members.filter((w) => w.area < 10000).length, members.length];
  }).sort((a, b) => b[1] - a[1]);
  const totalSmall = small.reduce((s, r) => s + r[1], 0);
  const smallestEach = REGIONS.map((r) => {
    const m = UN.filter((w) => quizRegion(w) === r).sort((a, b) => a.area - b.area)[0];
    return `${m.name.common} (${m.area < 10 ? m.area.toFixed(1) : fmt(m.area)} km²)`;
  });
  write(`${OUT}/map-quiz/fig-2-tiny-targets.svg`, plate({
    title: `${totalSmall} member states are smaller than 10,000 km²`,
    sub: 'per quiz: members under 10,000 km², the ones a fingertip can miss',
    aria: `Bar chart of small member states per region: ${small.map(([r, n, t]) => `${r} ${n} of ${t}`).join(', ')}`,
    body: `${bars(small.map(([r, n, t]) => [r, n, REGION_COLOUR[r], `${n} of ${t}`]), { x: 300, y: 124, rowH: 40, w: 420, max: 10 })}
  <text x="50" y="396" font-family="${MONO}" font-size="13" fill="${C.gold}">SMALLEST IN EACH QUIZ</text>
  ${smallestEach.map((s, i) => `<text x="${50 + (i % 3) * 300}" y="${426 + Math.floor(i / 3) * 26}" font-family="${MONO}" font-size="13" fill="${C.text}">${esc(s)}</text>`).join('')}`,
    footer: 'Area: world-countries · UN members only (Vatican City counted as an observer) · globleunlimited.net',
  }));

  // Printable worksheet preview: Africa.
  const africaUN = UN.filter((w) => quizRegion(w) === 'Africa');
  const africaFeat = FEATURES.filter((f) => {
    const w = wcBy2.get(f.properties.cca2);
    return (w && quizRegion(w) === 'Africa') || ['Somaliland'].includes(f.properties.name);
  });
  const ap = geoAzimuthalEqualArea().rotate([-18, -2]).fitExtent([[60, 104], [470, 506]], collection(africaFeat.map(mainland)));
  const apath = geoPath(ap);
  const pos = africaUN.map((w) => {
    const f = FEATURES.find((x) => x.properties.cca2 === w.cca2);
    const [x, y] = f ? apath.centroid(mainland(f)) : ap([w.latlng[1], w.latlng[0]]);
    return { w, x, y, drawn: Boolean(f) };
  }).sort((a, b) => a.y - b.y || a.x - b.x);
  const outlines = africaFeat.map((f) => `<path d="${tidy(apath(f))}" fill="#FFFFFF" stroke="#1A2A3A" stroke-width="0.9"/>`).join('');
  // Countries under 75,000 km² cannot hold a number inside their outline, so
  // the number sits in a bubble on a leader line, the way printed worksheets do
  // it. Placed by hand (pixels from the centroid at this projection): pushing
  // radially sent Lesotho and Eswatini off the sheet and stacked Gambia on
  // Guinea-Bissau.
  const CALLOUT = {
    Gambia: [-20, -30], 'Guinea-Bissau': [-46, 8], 'Sierra Leone': [-38, 22],
    Togo: [0, 44], 'Equatorial Guinea': [-8, 42],
    Rwanda: [-22, -26], Burundi: [-26, 18], Djibouti: [40, -18],
    Eswatini: [40, 4], Lesotho: [52, 18],
  };
  const bubble = (x, y, n) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="#FFFFFF" stroke="#1A2A3A"/><text x="${x.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" text-anchor="middle" font-family="${MONO}" font-size="9" fill="#1A2A3A">${n}</text>`;
  const marks = pos.map((p, i) => {
    const n = i + 1;
    if (!p.drawn) return bubble(p.x, p.y, n);
    const off = CALLOUT[p.w.name.common];
    if (!off) {
      if (p.w.area < 75000) throw new Error(`${p.w.name.common} needs a hand-placed callout`);
      return `<text x="${p.x.toFixed(1)}" y="${(p.y + 4).toFixed(1)}" text-anchor="middle" font-family="${MONO}" font-size="11" fill="#1A2A3A">${n}</text>`;
    }
    const [lx, ly] = [p.x + off[0], p.y + off[1]];
    return `<line x1="${p.x.toFixed(1)}" y1="${p.y.toFixed(1)}" x2="${lx.toFixed(1)}" y2="${ly.toFixed(1)}" stroke="#1A2A3A" stroke-width="0.7"/><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="1.6" fill="#1A2A3A"/>${bubble(lx, ly, n)}`;
  }).join('');
  const blanks = pos.map((_, i) => {
    const col = Math.floor(i / 18), row = i % 18;
    return `<text x="${520 + col * 150}" y="${138 + row * 20.5}" font-family="${MONO}" font-size="11" fill="#1A2A3A">${String(i + 1).padStart(2, ' ')}. ________</text>`;
  }).join('');
  write(`${OUT}/map-quiz/fig-3-printable-africa.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="560" viewBox="0 0 1000 560" role="img" aria-label="Printable Africa map worksheet with ${africaUN.length} numbered countries and blank answer lines">
  <rect width="1000" height="560" fill="${C.ground}"/>
  <rect x="34" y="24" width="932" height="512" fill="#FDFBF6"/>
  <text x="60" y="64" font-family="${SERIF}" font-size="24" fill="#1A2A3A">Africa: name the ${africaUN.length} countries</text>
  <text x="60" y="88" font-family="${MONO}" font-size="12" fill="#5E6B78">Name ______________________   Score ____ / ${africaUN.length}</text>
  <g>${outlines}</g>
  ${marks}
  ${blanks}
  <text x="60" y="524" font-family="${MONO}" font-size="11" fill="#5E6B78">Free printable · numbered north to south · answer key on page 2 · globleunlimited.net</text>
</svg>
`);

  // Cover card: Africa with one target and a crosshair.
  const cp = geoAzimuthalEqualArea().rotate([-18, -2]).fitExtent([[120, 18], [282, 232]], collection(africaFeat.map(mainland)));
  const cpath = geoPath(cp);
  const target = 'Kenya';
  const [tx, ty] = cpath.centroid(mainland(featureOf.get(target)));
  write('public/assets/svg/games/map-quiz.svg', card('mq', `  <g>${africaFeat.map((f) => `<path d="${tidy(cpath(f))}" fill="${f.properties.name === target ? '#F4C95D' : '#E8D9B5'}" fill-opacity="${f.properties.name === target ? 1 : 0.22}" stroke="#0B1622" stroke-width=".6"/>`).join('')}</g>
  <g stroke="#F4C95D" stroke-width="1.5" fill="none">
    <circle cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="13"/>
    <line x1="${(tx - 22).toFixed(1)}" y1="${ty.toFixed(1)}" x2="${(tx - 8).toFixed(1)}" y2="${ty.toFixed(1)}"/><line x1="${(tx + 8).toFixed(1)}" y1="${ty.toFixed(1)}" x2="${(tx + 22).toFixed(1)}" y2="${ty.toFixed(1)}"/>
    <line x1="${tx.toFixed(1)}" y1="${(ty - 22).toFixed(1)}" x2="${tx.toFixed(1)}" y2="${(ty - 8).toFixed(1)}"/><line x1="${tx.toFixed(1)}" y1="${(ty + 8).toFixed(1)}" x2="${tx.toFixed(1)}" y2="${(ty + 22).toFixed(1)}"/>
  </g>
  <rect x="24" y="24" width="96" height="30" rx="15" fill="#13243A" stroke="#F4C95D" stroke-opacity=".5"/>
  <text x="72" y="44" text-anchor="middle" fill="#EAF2F8" font-size="12">${target}?</text>
  <text x="378" y="230" text-anchor="end" fill="#F4C95D" font-size="13">12 / 54</text>`));
}

// Numbers quoted in the page plans, printed so they can be checked.
console.log(JSON.stringify({
  routes: { routeable: NODES.length - COMPONENTS.filter((c) => c.length === 1).length, totalRoutes: TOTAL_ROUTES, chokepoints: CHOKEPOINTS.map(([n, v]) => [n, +v.toFixed(1)]) },
  higherOrLower: { countries: POP.length, areaRulePct: +AREA_RULE_PCT.toFixed(1), pairs },
  mapQuiz: { unMembers: UN.length, drawableAt110m: UN.filter((w) => drawable.has(w.cca2)).length },
}, null, 1));
