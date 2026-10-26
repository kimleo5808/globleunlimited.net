// Build the Map Quiz regions: projected outlines, tap rings and Learn-mode
// facts for every quiz country, plus a printable worksheet and answer key.
//
// Usage: node scripts/build-map-quiz.mjs
//
// Countries are the 193 UN member states (world-countries flags Vatican City
// as a member; it is an observer state, so it is left out). Regions follow
// world-countries, with the Americas split into North (with Central America
// and the Caribbean) and South. Outlines come from Natural Earth via
// world-atlas: 1:50m for regional maps, 1:110m for the world map, where the
// extra detail would be invisible. US states use us-atlas's Albers layout.
//
// Output:
//   public/assets/data/map-quiz/{region}.json
//     { region, label, width, height, ringR, items: Item[], context: string[] }
//     Item: { id, name, aliases, sub, d?, ring?, cx, cy, facts: [label, value][] }
//   public/assets/printables/{region}-worksheet.svg and {region}-answers.svg
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import { presimplify, simplify, quantile, sphericalTriangleArea } from 'topojson-simplify';
import { geoAzimuthalEqualArea, geoEqualEarth, geoPath, geoArea, geoCentroid } from 'd3-geo';

const require = createRequire(import.meta.url);
const WC = require('world-countries');
const CAPITALS = JSON.parse(readFileSync('src/data/capitals.json', 'utf8'));
const POOL = JSON.parse(readFileSync('src/data/countries.json', 'utf8'));
const WB = JSON.parse(readFileSync('scripts/data/wb-pop-2024.json', 'utf8'))[1];

const OUT = 'public/assets/data/map-quiz';
const PRINT_OUT = 'public/assets/printables';
mkdirSync(OUT, { recursive: true });
mkdirSync(PRINT_OUT, { recursive: true });

const normalize = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const tidy = (d) => (d ?? '').replace(/-?\d+\.\d+/g, (n) => (Math.round(Number(n) * 10) / 10).toString());
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const people = (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(2)} billion` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} million` : fmt(n));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Largest polygon: fits the view to France, not France plus French Guiana. */
function mainland(f) {
  if (f.geometry?.type !== 'MultiPolygon') return f;
  let best = null, bestArea = -1;
  for (const coords of f.geometry.coordinates) {
    const p = { type: 'Polygon', coordinates: coords };
    const a = geoArea(p);
    if (a > bestArea) { bestArea = a; best = p; }
  }
  return { ...f, geometry: best };
}
const collection = (features) => ({ type: 'FeatureCollection', features });

/** mainland() for data that is already projected (us-atlas Albers): spherical
 *  area is meaningless on pixel coordinates, so compare shoelace areas. */
function mainlandPlanar(f) {
  if (f.geometry?.type !== 'MultiPolygon') return f;
  const ringArea = (r) => Math.abs(r.reduce((s, [x, y], i) => { const [x2, y2] = r[(i + 1) % r.length]; return s + x * y2 - x2 * y; }, 0) / 2);
  const best = f.geometry.coordinates.reduce((a, b) => (ringArea(b[0]) > ringArea(a[0]) ? b : a));
  return { ...f, geometry: { type: 'Polygon', coordinates: best } };
}

// ── Who is in the quiz ─────────────────────────────────────────────────────
const quizRegion = (w) => (w.region === 'Americas' ? (w.subregion === 'South America' ? 'south-america' : 'north-america') : w.region.toLowerCase());
const MEMBERS = WC.filter((w) => w.unMember && w.cca2 !== 'VA');
const popBy3 = new Map(WB.filter((r) => r.value != null).map((r) => [r.countryiso3code, r.value]));
const poolAliases = new Map(POOL.filter((c) => c.cca2).map((c) => [c.cca2, c.aliases]));

/** Capitals where the shared capitals table (built for the Capitals game from
 *  Natural Earth) is out of date for a fact panel. */
const CAPITAL_FACT = {
  BI: 'Gitega (political), Bujumbura (economic)', // moved in 2019
  BO: 'Sucre (constitutional), La Paz (seat of government)',
  CO: 'Bogotá',
  IL: 'Jerusalem (disputed)',
  LK: 'Sri Jayawardenepura Kotte (official), Colombo (commercial)',
  MY: 'Kuala Lumpur (government in Putrajaya)',
  NR: 'Yaren (no official capital)',
  PW: 'Ngerulmud',
};

/** Names people type that neither dataset lists: current official short
 *  forms and everyday abbreviations. */
const EXTRA_ALIASES = {
  CV: ['cabo verde'], GM: ['the gambia'], CD: ['drc', 'congo kinshasa'], CG: ['congo brazzaville'],
  BA: ['bosnia'], ST: ['sao tome'], TT: ['trinidad'], AG: ['antigua'],
  KN: ['st kitts', 'saint kitts', 'st kitts and nevis'], LC: ['st lucia'],
  VC: ['st vincent', 'saint vincent', 'st vincent and the grenadines'], CF: ['car'], AE: ['uae'],
  BS: ['the bahamas'], PG: ['png'], FM: ['fsm'],
};

function countryItem(w) {
  const name = w.name.common;
  const aliases = new Set([
    ...[w.name.official, ...(w.altSpellings ?? [])].map(normalize),
    ...(poolAliases.get(w.cca2) ?? []),
    ...(EXTRA_ALIASES[w.cca2] ?? []),
  ]);
  aliases.delete(normalize(name));
  const caps = CAPITALS.filter((c) => c.cca2 === w.cca2).map((c) => c.name.replace(/\s+/g, ' '));
  const facts = [
    ['Capital', CAPITAL_FACT[w.cca2] ?? (caps.length ? caps.join(' / ') : (w.capital ?? []).join(' / ') || '—')],
    ['Area', `${fmt(w.area)} km²`],
    ['Population', popBy3.has(w.cca3) ? people(popBy3.get(w.cca3)) : '—'],
    ['Region', w.subregion || w.region],
  ];
  return { id: w.cca2, name, aliases: [...aliases].filter(Boolean), sub: w.subregion || w.region, area: w.area, facts };
}

// ── Region definitions ─────────────────────────────────────────────────────
/** Share of the finest 1:50m detail to drop: a regional map is ~900px across,
 *  and the points removed are ones that would land on the same pixel. */
const SIMPLIFY_50M = 0.5;
const atlas = (res) => {
  let t = structuredClone(require(`world-atlas/countries-${res}.json`));
  if (res === '50m') {
    t = presimplify(t, sphericalTriangleArea);
    t = simplify(t, quantile(t, SIMPLIFY_50M));
  }
  return feature(t, t.objects.countries).features;
};
const byCcn3 = new Map(WC.filter((w) => w.ccn3).map((w) => [String(Number(w.ccn3)), w]));

const REGIONS = {
  world: {
    label: 'World',
    res: '110m',
    width: 1000, height: 520,
    projection: () => geoEqualEarth(),
    members: () => MEMBERS,
    fitSphere: true,
  },
  africa: {
    label: 'Africa',
    res: '50m',
    width: 820, height: 860,
    projection: () => geoAzimuthalEqualArea().rotate([-18, -2]),
    members: () => MEMBERS.filter((w) => quizRegion(w) === 'africa'),
    bleed: true,
  },
  europe: {
    label: 'Europe',
    res: '50m',
    width: 960, height: 820,
    projection: () => geoAzimuthalEqualArea().rotate([-14, -52]),
    members: () => MEMBERS.filter((w) => quizRegion(w) === 'europe'),
    // Russia spans eleven time zones; fitting to it would shrink the Balkans
    // to specks. Russia runs off the east edge of the map.
    fitExclude: ['RU'],
    bleed: true,
  },
  // The next four fit to hand-picked [lon, lat] extremes: fitting to each
  // member's largest polygon would cut off Alaska, Papua or the Line Islands.
  asia: {
    label: 'Asia',
    res: '50m',
    width: 1000, height: 760,
    projection: () => geoAzimuthalEqualArea().rotate([-88, -26]),
    members: () => MEMBERS.filter((w) => quizRegion(w) === 'asia'),
    fitPoints: [[26, 40], [44, 12], [54, 12.5], [69, 55.4], [123, 53.5], [146, 44], [141, -9.5], [120, -11], [73, -0.7], [95, 6]],
    bleed: true,
  },
  'north-america': {
    label: 'North America',
    res: '50m',
    width: 900, height: 880,
    projection: () => geoAzimuthalEqualArea().rotate([100, -45]),
    members: () => MEMBERS.filter((w) => quizRegion(w) === 'north-america'),
    fitPoints: [[-168, 66], [-156, 71.4], [-70, 83.1], [-52.6, 47.5], [-59.5, 13], [-61.5, 10], [-78, 7.2], [-92, 14.5], [-117, 32.5], [-125, 49]],
    bleed: true,
  },
  'south-america': {
    label: 'South America',
    res: '50m',
    width: 720, height: 900,
    projection: () => geoAzimuthalEqualArea().rotate([60, 20]),
    members: () => MEMBERS.filter((w) => quizRegion(w) === 'south-america'),
    fitPoints: [[-81.3, -4.7], [-71.7, 12.5], [-60, 8.5], [-51.6, 4.4], [-34.8, -7.2], [-48, -26], [-67.3, -55.9], [-75.6, -50]],
    bleed: true,
  },
  oceania: {
    label: 'Oceania',
    res: '50m',
    width: 1000, height: 660,
    projection: () => geoAzimuthalEqualArea().rotate([-170, 15]),
    members: () => MEMBERS.filter((w) => quizRegion(w) === 'oceania'),
    fitPoints: [[113, -22], [153.6, -28.6], [146, -43.6], [166.4, -46.6], [178.5, -37.7], [134.1, 7.5], [169, 14.6], [-150.2, 1.9], [-151.8, -11.4], [-171.8, -14], [-175.4, -21.4]],
    // Kiribati's largest island is Kiritimati, 3,300 km east of Tarawa; the
    // ring goes where people look for it, on the capital.
    ringAt: { KI: [173.0, 1.4] },
    bleed: true,
  },
};

/** The widest-for-its-height frame the game expects: 72vh tall on a
 *  1366x657 laptop screen, about 1,100 px across. */
const MIN_ASPECT = 0.42;
// `bleed`: on screens wider than the map the game shows more geography to
// either side instead of letterboxing, so the paths run past each side edge
// far enough to fill a MIN_ASPECT frame. Printables clip back to the frame.

/** Ring radius (map units) for countries too small to click at full view. */
const RING_PX = 9;
/** Below this many map units across, a country gets a ring. */
const MIN_CLICK = 9;

function buildRegion(key, def) {
  const features = atlas(def.res);
  const members = def.members();
  const memberSet = new Set(members.map((w) => w.cca2));
  const featureOf = new Map();
  for (const f of features) {
    const w = byCcn3.get(String(Number(f.id)));
    // 1:50m gives Ashmore and Cartier Islands Australia's code: keep the larger.
    if (w && !(geoArea(featureOf.get(w.cca2) ?? f) > geoArea(f))) featureOf.set(w.cca2, f);
  }

  const projection = def.projection();
  const pad = 8;
  const bleedX = def.bleed ? Math.max(0, (def.height / MIN_ASPECT - def.width) / 2) : 0;
  const fitTo = def.fitSphere
    ? { type: 'Sphere' }
    : def.fitPoints
    ? { type: 'MultiPoint', coordinates: def.fitPoints }
    : collection(members.filter((w) => !(def.fitExclude ?? []).includes(w.cca2) && featureOf.has(w.cca2)).map((w) => mainland(featureOf.get(w.cca2))));
  projection.fitExtent([[pad, pad], [def.width - pad, def.height - pad]], fitTo).clipExtent([[-bleedX, 0], [def.width + bleedX, def.height]]);
  const path = geoPath(projection);

  const items = [];
  for (const w of members) {
    const item = countryItem(w);
    const f = featureOf.get(w.cca2);
    const d = f ? tidy(path(f)) : '';
    let cx, cy, bw = 0, bh = 0, small = true;
    if (f && d) {
      const [[x0, y0], [x1, y1]] = path.bounds(mainland(f));
      [cx, cy] = path.centroid(mainland(f));
      [bw, bh] = [x1 - x0, y1 - y0];
      small = Math.max(bw, bh) < MIN_CLICK;
    } else {
      [cx, cy] = projection([w.latlng[1], w.latlng[0]]) ?? [NaN, NaN];
    }
    if (def.ringAt?.[w.cca2]) [cx, cy] = projection(def.ringAt[w.cca2]);
    if (!Number.isFinite(cx) || cx < 0 || cy < 0 || cx > def.width || cy > def.height) {
      // A member outside the frame (none expected) would be unplayable.
      throw new Error(`${key}: ${item.name} falls outside the map`);
    }
    items.push({ ...item, d: d || undefined, ring: small ? [+cx.toFixed(1), +cy.toFixed(1)] : undefined, cx: +cx.toFixed(1), cy: +cy.toFixed(1), bw: Math.round(bw), bh: Math.round(bh) });
  }
  // Neighbours wholly in the bleed are only ever seen at full view on wide
  // screens, so they come from the coarser atlas.
  const coarse = def.res === '110m' ? new Map() : new Map(atlas('110m').map((f) => [f.id, f]));
  const inFrame = (f) => {
    const [[x0, y0], [x1, y1]] = path.bounds(f);
    return x1 >= 0 && x0 <= def.width && y1 >= 0 && y0 <= def.height;
  };
  const context = features
    .filter((f) => !memberSet.has(byCcn3.get(String(Number(f.id)))?.cca2))
    .map((f) => tidy(path(inFrame(f) ? f : coarse.get(f.id) ?? f)))
    .filter(Boolean);

  return { region: key, label: def.label, width: def.width, height: def.height, ringR: RING_PX, items, context };
}

// ── US states (us-atlas Albers USA: already projected, 975 x 610) ─────────
const STATE_FACTS = {
  AL: ['Montgomery', 'South'], AK: ['Juneau', 'West'], AZ: ['Phoenix', 'West'], AR: ['Little Rock', 'South'],
  CA: ['Sacramento', 'West'], CO: ['Denver', 'West'], CT: ['Hartford', 'Northeast'], DE: ['Dover', 'South'],
  FL: ['Tallahassee', 'South'], GA: ['Atlanta', 'South'], HI: ['Honolulu', 'West'], ID: ['Boise', 'West'],
  IL: ['Springfield', 'Midwest'], IN: ['Indianapolis', 'Midwest'], IA: ['Des Moines', 'Midwest'], KS: ['Topeka', 'Midwest'],
  KY: ['Frankfort', 'South'], LA: ['Baton Rouge', 'South'], ME: ['Augusta', 'Northeast'], MD: ['Annapolis', 'South'],
  MA: ['Boston', 'Northeast'], MI: ['Lansing', 'Midwest'], MN: ['Saint Paul', 'Midwest'], MS: ['Jackson', 'South'],
  MO: ['Jefferson City', 'Midwest'], MT: ['Helena', 'West'], NE: ['Lincoln', 'Midwest'], NV: ['Carson City', 'West'],
  NH: ['Concord', 'Northeast'], NJ: ['Trenton', 'Northeast'], NM: ['Santa Fe', 'West'], NY: ['Albany', 'Northeast'],
  NC: ['Raleigh', 'South'], ND: ['Bismarck', 'Midwest'], OH: ['Columbus', 'Midwest'], OK: ['Oklahoma City', 'South'],
  OR: ['Salem', 'West'], PA: ['Harrisburg', 'Northeast'], RI: ['Providence', 'Northeast'], SC: ['Columbia', 'South'],
  SD: ['Pierre', 'Midwest'], TN: ['Nashville', 'South'], TX: ['Austin', 'South'], UT: ['Salt Lake City', 'West'],
  VT: ['Montpelier', 'Northeast'], VA: ['Richmond', 'South'], WA: ['Olympia', 'West'], WV: ['Charleston', 'South'],
  WI: ['Madison', 'Midwest'], WY: ['Cheyenne', 'West'],
};

function buildStates() {
  const usStates = JSON.parse(readFileSync('src/data/us-states.json', 'utf8'));
  const abbrOf = new Map(usStates.map((s) => [s.name, s.cca2]));
  // Already projected, so the default planar triangle area is the right weight.
  let albers = presimplify(structuredClone(require('us-atlas/states-albers-10m.json')));
  albers = simplify(albers, quantile(albers, SIMPLIFY_50M));
  const geo = require('us-atlas/states-10m.json');
  const projected = feature(albers, albers.objects.states).features;
  const spherical = new Map(feature(geo, geo.objects.states).features.map((f) => [f.id, f]));
  const path = geoPath(); // already projected: identity
  const items = [];
  const context = [];
  for (const f of projected) {
    const name = f.properties.name;
    const abbr = abbrOf.get(name);
    const d = tidy(path(f));
    if (!abbr) { context.push(d); continue; } // DC and territories: drawn, not asked
    const [[x0, y0], [x1, y1]] = path.bounds(mainlandPlanar(f));
    const [cx, cy] = path.centroid(mainlandPlanar(f));
    const areaKm2 = geoArea(spherical.get(f.id)) * 6371 * 6371;
    const [capital, census] = STATE_FACTS[abbr];
    items.push({
      id: abbr, name, aliases: [normalize(abbr)], sub: census, area: Math.round(areaKm2),
      facts: [['Capital', capital], ['Abbreviation', abbr], ['Area', `${fmt(areaKm2)} km²`], ['Census region', census]],
      d, ring: Math.max(x1 - x0, y1 - y0) < MIN_CLICK + 4 ? [+cx.toFixed(1), +cy.toFixed(1)] : undefined,
      cx: +cx.toFixed(1), cy: +cy.toFixed(1), bw: Math.round(x1 - x0), bh: Math.round(y1 - y0),
    });
  }
  return { region: 'us-states', label: 'US States', width: 975, height: 610, ringR: RING_PX, items, context };
}

// ── Printables: numbered map + blank answer lines, and an answer key ──────
function printables(data) {
  const W = 1123, H = 794; // A4 landscape at 96 dpi
  const map = { x: 120, y: 110, w: 560, h: 620 };
  const k = Math.min(map.w / data.width, map.h / data.height);
  const ox = map.x + (map.w - data.width * k) / 2, oy = map.y + (map.h - data.height * k) / 2;
  const P = (x, y) => [ox + x * k, oy + y * k];

  // Number north to south, then west to east.
  const order = [...data.items].sort((a, b) => a.cy - b.cy || a.cx - b.cx);
  const num = new Map(order.map((it, i) => [it.id, i + 1]));

  // A country takes its number inside when its outline has room for one at
  // print size; the rest go to margin columns on their side of the map,
  // spread so no two labels touch. North America splits further east, so
  // Belize and El Salvador take the empty Pacific margin rather than leader
  // lines across the Caribbean.
  const split = ox + data.width * k * (data.region === 'north-america' ? 0.6 : 0.5);
  const inside = [], left = [], right = [];
  for (const it of order) {
    const big = it.d && !it.ring && it.bw * k >= 22 && it.bh * k >= 14;
    const [x, y] = P(it.cx, it.cy);
    if (big) inside.push({ it, x, y });
    else (x < split ? left : right).push({ it, x, y });
  }
  const spread = (list, top, bottom, gap = 19) => {
    list.sort((a, b) => a.y - b.y);
    let prev = -Infinity;
    for (const l of list) { l.ly = Math.max(l.y, prev + gap); prev = l.ly; }
    const overflow = (list.at(-1)?.ly ?? 0) - bottom;
    if (overflow > 0) for (const l of list) l.ly -= overflow;
    let next = Infinity;
    for (const l of [...list].reverse()) { l.ly = Math.min(l.ly, next - gap); next = l.ly; }
    for (const l of list) l.ly = Math.max(top, l.ly);
  };
  spread(left, map.y, map.y + map.h);
  spread(right, map.y, map.y + map.h);

  const g = `<rect x="${ox.toFixed(1)}" y="${oy.toFixed(1)}" width="${(data.width * k).toFixed(1)}" height="${(data.height * k).toFixed(1)}" fill="none" stroke="#B9BDC2"/>
<g transform="translate(${ox.toFixed(1)},${oy.toFixed(1)}) scale(${k.toFixed(4)})">
  <clipPath id="frame"><rect width="${data.width}" height="${data.height}"/></clipPath>
  <g clip-path="url(#frame)">
  ${data.context.map((d) => `<path d="${d}" fill="#F1F1EE" stroke="#B9BDC2" stroke-width="${(0.6 / k).toFixed(2)}"/>`).join('')}
  ${data.items.filter((it) => it.d).map((it) => `<path d="${it.d}" fill="#FFFFFF" stroke="#1A2A3A" stroke-width="${(0.9 / k).toFixed(2)}"/>`).join('')}
  </g>
</g>`;
  const bubble = (x, y, n) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="#FFFFFF" stroke="#1A2A3A"/><text x="${x.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" text-anchor="middle" font-size="9">${n}</text>`;
  const labels = [
    ...inside.map(({ it, x, y }) => `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-size="11">${num.get(it.id)}</text>`),
    ...[...left.map((l) => ({ ...l, lx: map.x - 22 })), ...right.map((l) => ({ ...l, lx: map.x + map.w + 22 }))].map(({ it, x, y, lx, ly }) =>
      `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${lx.toFixed(1)}" y2="${ly.toFixed(1)}" stroke="#1A2A3A" stroke-width="0.6"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.5" fill="#1A2A3A"/>${bubble(lx, ly, num.get(it.id))}`),
  ].join('');

  const cols = Math.ceil(order.length / 27);
  const colW = 360 / cols;
  const lines = (withNames) => order.map((it, i) => {
    const col = Math.floor(i / 27), row = i % 27;
    const x = 740 + col * colW, y = 128 + row * 22;
    return `<text x="${x.toFixed(0)}" y="${y}" font-size="11">${String(i + 1).padStart(2, ' ')}. ${withNames ? esc(it.name) : '______________'}</text>`;
  }).join('');

  const head = (title) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="'Space Mono',ui-monospace,monospace" fill="#1A2A3A">
<rect width="${W}" height="${H}" fill="#FFFFFF"/>
<text x="60" y="58" font-family="Georgia,serif" font-size="26">${esc(title)}</text>`;
  const foot = `<text x="60" y="${H - 28}" font-size="11" fill="#5E6B78">Free printable from globleunlimited.net/map-quiz/ · outlines: ${data.region === 'us-states' ? 'US Census via us-atlas' : 'Natural Earth'}</text>
</svg>
`;
  const count = order.length;
  const noun = data.region === 'us-states' ? 'states' : 'countries';
  writeFileSync(`${PRINT_OUT}/${data.region}-worksheet.svg`,
    `${head(`${data.label}: name the ${count} ${noun}`)}
<text x="60" y="84" font-size="12" fill="#5E6B78">Name ________________________   Date ____________   Score ____ / ${count}</text>
${g}${labels}${lines(false)}${foot}`);
  writeFileSync(`${PRINT_OUT}/${data.region}-answers.svg`,
    `${head(`${data.label}: answer key`)}
<text x="60" y="84" font-size="12" fill="#5E6B78">Numbers match the worksheet: north to south, then west to east.</text>
${g}${labels}${lines(true)}${foot}`);
}

// ── Run ────────────────────────────────────────────────────────────────────
const built = [...Object.entries(REGIONS).map(([k, def]) => buildRegion(k, def)), buildStates()];
for (const data of built) {
  const json = JSON.stringify(data);
  writeFileSync(`${OUT}/${data.region}.json`, json);
  if (data.region !== 'world') printables(data);
  const rings = data.items.filter((i) => i.ring).length;
  console.log(`${data.region.padEnd(10)} ${String(data.items.length).padStart(3)} items · ${String(rings).padStart(2)} rings · ${Math.round(json.length / 1024)} KB`);
}
