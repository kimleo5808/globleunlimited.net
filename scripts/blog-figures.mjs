// Generates the cover and plate artwork for the data-driven blog posts.
//
// Usage: node scripts/blog-figures.mjs
//
// Figures encode measured values rather than hand-drawn approximations, so
// they are regenerated from the dataset the same way scripts/blog-data.mjs
// recomputes the numbers quoted in the prose. Style follows the existing
// atlas-plate convention: 1000x560 plates, 1200x630 covers, #0E1C2E ground,
// gold hairline frame, Georgia titles, Space Mono annotation.
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'public/blog';

// ── palette (mirrors src/styles/tokens.css) ────────────────────────────────
const C = {
  ground: '#0E1C2E',
  deep: '#0B1622',
  panel: '#1B3350',
  gold: '#F4C95D',
  text: '#EAF2F8',
  dim: '#9DB2C6',
  mute: '#5E7891',
  heat: ['#FFEDA0', '#FEB24C', '#E8743B', '#C42D1C', '#8B0000'],
  sea: '#1E5F8C',
  land: '#E8D9B5',
  win: '#2E9E4F',
};

const MONO = `'Space Mono',ui-monospace,monospace`;
const SERIF = `Georgia,'Times New Roman',serif`;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Standard 1000x560 plate shell. */
function plate({ title, sub, aria, body, footer }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="560" viewBox="0 0 1000 560" role="img" aria-label="${esc(aria)}">
  <rect width="1000" height="560" fill="${C.ground}"/>
  <rect x="16" y="16" width="968" height="528" fill="none" stroke="${C.gold}" stroke-opacity="0.3"/>
  <text x="50" y="62" font-family="${SERIF}" font-size="27" fill="${C.text}">${esc(title)}</text>
  <text x="50" y="90" font-family="${MONO}" font-size="15" fill="${C.mute}">${esc(sub)}</text>
${body}
  <text x="50" y="524" font-family="${MONO}" font-size="13" fill="${C.mute}">${esc(footer ?? 'globleunlimited.net')}</text>
</svg>
`;
}

/** Value labels sit on the dark plate ground, so the two hottest ramp colours
 *  are too dark to read as text. Swap them for a legible tint of the same hue. */
const LABEL_TINT = { [C.heat[4]]: '#E06A5A', [C.heat[3]]: '#EE7A66' };
const labelColour = (fill) => LABEL_TINT[fill] ?? fill;

/** Horizontal bar chart. rows: [label, value, colour]. */
function bars(rows, { x = 300, y = 120, w = 600, rowH = 38, max, unit = '' }) {
  const peak = max ?? Math.max(...rows.map((r) => r[1]));
  return rows
    .map(([label, value, colour], i) => {
      const top = y + i * rowH;
      const bw = Math.max(3, (value / peak) * w);
      return `  <g font-family="${MONO}" font-size="15">
    <text x="${x - 12}" y="${top + 15}" text-anchor="end" fill="${C.text}">${esc(label)}</text>
    <rect x="${x}" y="${top}" width="${bw.toFixed(0)}" height="21" fill="${colour}"/>
    <text x="${x + bw + 10}" y="${top + 16}" fill="${labelColour(colour)}">${esc(value.toLocaleString('en-US'))}${esc(unit)}</text>
  </g>`;
    })
    .join('\n');
}

/** 1200x630 cover shell; `art` fills the left third.
 *
 *  Title size is derived from the longest line: SVG text does not wrap, and a
 *  long third line silently runs off the 1200px canvas. Georgia averages
 *  roughly 0.5em per character, and the title column is 540px wide. */
function cover({ eyebrow, lines, sub, aria, art }) {
  const longest = Math.max(...lines.map((l) => l.t.length));
  const size = Math.min(58, Math.floor(1080 / longest));
  const step = Math.round(size * 1.2);

  const title = lines
    .map((l, i) => {
      const italic = l.italic ? ` font-style="italic"` : '';
      const fill = l.italic ? C.gold : C.text;
      return `  <text x="620" y="${278 + i * step}" font-family="${SERIF}" font-size="${size}" fill="${fill}"${italic}>${esc(l.t)}</text>`;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" role="img" aria-label="${esc(aria)}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="38%" r="75%">
      <stop offset="0%" stop-color="#15304d"/><stop offset="100%" stop-color="${C.deep}"/>
    </radialGradient>
    <radialGradient id="globe" cx="38%" cy="32%" r="80%">
      <stop offset="0%" stop-color="${C.panel}"/><stop offset="100%" stop-color="${C.ground}"/>
    </radialGradient>
    <clipPath id="disc"><circle cx="330" cy="315" r="205"/></clipPath>
  </defs>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <g stroke="${C.gold}" stroke-opacity="0.07" fill="none">
    <path d="M0 105H1200M0 210H1200M0 315H1200M0 420H1200M0 525H1200"/>
    <path d="M150 0V630M300 0V630M450 0V630M600 0V630M750 0V630M900 0V630M1050 0V630"/>
  </g>
  <rect x="24" y="24" width="1152" height="582" fill="none" stroke="${C.gold}" stroke-opacity="0.35"/>
  <rect x="32" y="32" width="1136" height="566" fill="none" stroke="${C.gold}" stroke-opacity="0.15"/>
${art}
  <text x="620" y="200" font-family="${MONO}" font-size="20" letter-spacing="5" fill="${C.gold}">${esc(eyebrow)}</text>
${title}
  <text x="620" y="${278 + (lines.length - 1) * step + 62}" font-family="${MONO}" font-size="19" fill="${C.dim}">${esc(sub)}</text>
  <g stroke="${C.gold}" stroke-opacity="0.6">
    <path d="M24 54V24H54M1146 24H1176V54M1176 576V606H1146M54 606H24V576" fill="none" stroke-width="2"/>
  </g>
</svg>
`;
}

/** Wireframe globe used by several covers. */
function globeArt(pins = '') {
  return `  <circle cx="330" cy="315" r="205" fill="url(#globe)" stroke="${C.gold}" stroke-opacity="0.6" stroke-width="2"/>
  <g clip-path="url(#disc)" stroke="${C.gold}" stroke-opacity="0.28" fill="none">
    <ellipse cx="330" cy="315" rx="205" ry="70"/><ellipse cx="330" cy="315" rx="205" ry="140"/>
    <ellipse cx="330" cy="315" rx="70" ry="205"/><ellipse cx="330" cy="315" rx="140" ry="205"/>
    <path d="M125 315H535"/>
  </g>
${pins}`;
}

const write = (slug, name, svg) => {
  mkdirSync(`${OUT}/${slug}`, { recursive: true });
  writeFileSync(`${OUT}/${slug}/${name}`, svg);
  console.log(`  ${slug}/${name}`);
};

// ═══════════════════════════════════════════════ POST 1 — CAPITALS ═════════
const P1 = 'guess-any-capital-city';
console.log(P1);

// Scattered capital pins, densest over Europe.
const capPins = [
  [268, 232], [286, 220], [300, 240], [312, 226], [322, 244], [296, 258], [330, 214],
  [352, 236], [368, 260], [258, 268], [340, 282], [300, 300], [372, 310], [268, 330],
  [330, 348], [392, 340], [292, 372], [352, 392], [246, 300], [410, 288], [230, 352],
  [378, 402], [316, 420], [268, 404], [420, 366],
].map(([x, y], i) => `    <circle cx="${x}" cy="${y}" r="${i < 8 ? 5 : 3.5}" fill="${i < 8 ? C.gold : C.heat[1]}" fill-opacity="${i < 8 ? 1 : 0.75}"/>`).join('\n');

write(P1, 'cover.svg', cover({
  eyebrow: 'FIELD NOTES · DATA STUDY',
  lines: [{ t: 'How to Guess Any' }, { t: 'Capital City' }, { t: 'in Under 6 Tries', italic: true }],
  sub: '199 capitals · 19,701 pairs measured',
  aria: 'Cover: a globe scattered with capital-city markers, densest across Europe, titled How to Guess Any Capital City in Under 6 Tries',
  art: globeArt(`  <g>\n${capPins}\n  </g>`),
}));

write(P1, 'fig-1-best-openers.svg', plate({
  title: 'The best opening capitals',
  sub: 'PLATE 1 · worst-case capitals left sharing the answer’s reading · lower = better',
  aria: 'Bar chart of the best and worst opening capitals. Madrid leaves at most 26 candidates; Monrovia leaves 56.',
  body: bars([
    ['Madrid', 26, C.heat[0]], ['Riga', 27, C.heat[0]], ['Helsinki', 28, C.heat[1]],
    ['Tallinn', 28, C.heat[1]], ['Stockholm', 29, C.heat[1]], ['Wellington', 29, C.heat[1]],
    ['Abidjan', 51, C.heat[3]], ['Freetown', 52, C.heat[3]], ['Majuro', 53, C.heat[4]], ['Monrovia', 56, C.heat[4]],
  ], { x: 290, y: 122, w: 560, rowH: 40, max: 60 }),
  footer: 'Tolerance ±500 km. Source: globleunlimited.net dataset, 199 capitals.',
}));

write(P1, 'fig-2-clusters.svg', plate({
  title: 'The Balkan cluster: twelve capitals inside 500 km',
  sub: 'PLATE 2 · other capitals within 500 km',
  aria: 'Bar chart of the densest capitals. Belgrade has 12 other capitals within 500 km, Ljubljana and Sarajevo 11 each.',
  body: bars([
    ['Belgrade', 12, C.heat[4]], ['Ljubljana', 11, C.heat[3]], ['Sarajevo', 11, C.heat[3]],
    ['Zagreb', 9, C.heat[2]], ['Skopje', 8, C.heat[2]], ['Bratislava', 7, C.heat[1]],
    ['Budapest', 7, C.heat[1]], ['Podgorica', 7, C.heat[1]],
  ], { x: 300, y: 140, w: 520, rowH: 44, max: 13 }),
  footer: 'Colour is not readable below roughly 600 km. Source: globleunlimited.net dataset.',
}));

write(P1, 'fig-3-offset.svg', plate({
  title: 'Capitals furthest from their own country centre',
  sub: 'PLATE 3 · km from capital to country centroid',
  aria: 'Bar chart: Moscow sits 3,206 km from Russia’s centroid, Ottawa 2,081 km, Washington D.C. 1,865 km, Canberra 1,784 km.',
  body: bars([
    ['Moscow', 3206, C.heat[4]], ['Ottawa', 2081, C.heat[3]], ['Washington DC', 1865, C.heat[3]],
    ['Canberra', 1784, C.heat[2]], ['Kuala Lumpur', 1442, C.heat[2]], ['Beijing', 1183, C.heat[1]],
    ['Jakarta', 1035, C.heat[1]], ['Maputo', 1025, C.heat[1]], ['Algiers', 966, C.heat[0]],
  ], { x: 310, y: 126, w: 520, rowH: 42, max: 3400, unit: ' km' }),
  footer: 'Country knowledge misleads you here. Source: globleunlimited.net dataset.',
}));

write(P1, 'fig-4-isolated.svg', plate({
  title: 'The isolated capitals are free wins',
  sub: 'PLATE 4 · km to the nearest other capital',
  aria: 'Bar chart: Canberra and Wellington are each 2,326 km from their nearest other capital, Dili 1,905 km, Reykjavik 1,495 km.',
  body: bars([
    ['Canberra', 2326, C.heat[0]], ['Wellington', 2326, C.heat[0]], ['Dili', 1905, C.heat[1]],
    ['Melekeok', 1686, C.heat[1]], ['Reykjavík', 1495, C.heat[2]], ['Brasília', 1462, C.heat[2]],
    ['Palikir', 1460, C.heat[2]], ['Port Moresby', 1399, C.heat[3]],
  ], { x: 310, y: 140, w: 500, rowH: 44, max: 2600, unit: ' km' }),
  footer: 'One warm reading identifies these outright. Source: globleunlimited.net dataset.',
}));

// Band table comparing three openers.
const bandRows = [
  ['Deep red', 65, 58, 4], ['Red', 52, 65, 7], ['Orange', 38, 23, 7],
  ['Amber', 30, 35, 40], ['Pale yellow', 13, 17, 140],
];
write(P1, 'fig-5-band-split.svg', plate({
  title: 'What one opening guess buys you',
  sub: 'PLATE 5 · capitals falling in each colour band, by opener',
  aria: 'Grouped bars: from Wellington 140 of 198 capitals land in the pale-yellow band, against 13 from Athens and 17 from Cairo.',
  body: `  <g font-family="${MONO}" font-size="15">
    <text x="300" y="128" fill="${C.dim}">Athens</text>
    <text x="500" y="128" fill="${C.dim}">Cairo</text>
    <text x="700" y="128" fill="${C.dim}">Wellington</text>
  </g>
${bandRows.map(([label, a, b, c], i) => {
  const y = 155 + i * 68;
  const bar = (x, v, colour) => `    <rect x="${x}" y="${y}" width="${Math.max(3, (v / 140) * 150).toFixed(0)}" height="20" fill="${colour}"/>
    <text x="${x + Math.max(3, (v / 140) * 150) + 8}" y="${y + 16}" font-family="${MONO}" font-size="14" fill="${labelColour(colour)}">${v}</text>`;
  return `  <g>
    <text x="288" y="${y + 16}" text-anchor="end" font-family="${MONO}" font-size="15" fill="${C.text}">${label}</text>
${bar(300, a, C.heat[i])}
${bar(500, b, C.heat[i])}
${bar(700, c, C.heat[i])}
  </g>`;
}).join('\n')}
  <text x="700" y="${155 + 4 * 68 + 46}" font-family="${MONO}" font-size="14" fill="${C.gold}">71% of the field, one colour</text>`,
  footer: 'A corner opener wastes the scale. Source: globleunlimited.net dataset, 199 capitals.',
}));

// ══════════════════════════════════════════════ POST 2 — BORDERS ═══════════
const P2 = 'borders-and-landlocked-countries';
console.log(P2);

const netArt = (() => {
  const nodes = [
    [300, 200], [360, 230], [270, 260], [340, 300], [400, 270], [250, 330],
    [320, 370], [390, 350], [280, 410], [360, 430], [430, 320], [230, 280],
  ];
  const pts = nodes.map(([x, y], i) => `    <circle cx="${x}" cy="${y}" r="${i === 3 ? 9 : 5}" fill="${i === 3 ? C.gold : C.heat[1]}"/>`).join('\n');
  const hub = nodes.map(([x, y], i) => (i === 3 ? '' : `    <path d="M340 300 L${x} ${y}" stroke="${C.gold}" stroke-opacity="0.35"/>`)).join('\n');
  return `  <g fill="none">\n${hub}\n  </g>\n  <g>\n${pts}\n  </g>`;
})();

write(P2, 'cover.svg', cover({
  eyebrow: 'FIELD NOTES · DATA STUDY',
  lines: [{ t: 'Borders and' }, { t: 'Landlocked Countries' }, { t: "A Guesser's Map", italic: true }],
  sub: '176 countries · every land border counted',
  aria: 'Cover: a network of border connections radiating from a central hub, titled Borders and Landlocked Countries, A Guesser’s Map',
  art: globeArt(netArt),
}));

const dist = [[0, 23], [1, 15], [2, 25], [3, 29], [4, 24], [5, 26], [6, 14], [7, 9], [8, 6], [9, 2], [10, 1], [14, 1], [16, 1]];
write(P2, 'fig-1-distribution.svg', plate({
  title: 'How many land neighbours a country has',
  sub: 'PLATE 1 · all 176 countries in the pool',
  aria: 'Column chart of neighbour counts. The commonest value is three neighbours with 29 countries; 23 countries have none; China alone has 16.',
  body: `${dist.map(([n, count], i) => {
    const x = 90 + i * 63;
    const h = (count / 30) * 300;
    return `  <g>
    <rect x="${x}" y="${430 - h.toFixed(0)}" width="42" height="${h.toFixed(0)}" fill="${C.heat[Math.min(4, Math.floor(n / 4))]}"/>
    <text x="${x + 21}" y="${425 - h.toFixed(0)}" text-anchor="middle" font-family="${MONO}" font-size="14" fill="${C.dim}">${count}</text>
    <text x="${x + 21}" y="452" text-anchor="middle" font-family="${MONO}" font-size="14" fill="${C.text}">${n}</text>
  </g>`;
  }).join('\n')}
  <text x="500" y="480" text-anchor="middle" font-family="${MONO}" font-size="14" fill="${C.mute}">land neighbours</text>
  <path d="M84 430H960" stroke="${C.gold}" stroke-opacity="0.3"/>`,
  footer: 'Three quarters of the pool has 0–5 neighbours. Source: globleunlimited.net dataset.',
}));

write(P2, 'fig-2-most-connected.svg', plate({
  title: 'The most-connected countries',
  sub: 'PLATE 2 · land neighbours',
  aria: 'Bar chart: China has 16 land neighbours, Russia 14, Brazil 10, DR Congo and Germany 9 each.',
  body: bars([
    ['China', 16, C.heat[4]], ['Russia', 14, C.heat[4]], ['Brazil', 10, C.heat[3]],
    ['DR Congo', 9, C.heat[3]], ['Germany', 9, C.heat[3]], ['Austria', 8, C.heat[2]],
    ['France', 8, C.heat[2]], ['Serbia', 8, C.heat[2]], ['Tanzania', 8, C.heat[2]],
  ], { x: 300, y: 126, w: 540, rowH: 42, max: 18 }),
  footer: 'More neighbours means more guesses that read hot. Source: globleunlimited.net dataset.',
}));

write(P2, 'fig-3-landlocked.svg', plate({
  title: '40 landlocked countries, by region',
  sub: 'PLATE 3 · of the 176 in the pool — the world figure is 44 of 195',
  aria: 'Bar chart: 16 landlocked countries in Africa, 12 in Asia, 10 in Europe, 2 in the Americas.',
  body: `${bars([
    ['Africa', 16, C.heat[1]], ['Asia', 12, C.heat[2]], ['Europe', 10, C.heat[3]], ['Americas', 2, C.heat[0]],
  ], { x: 300, y: 150, w: 480, rowH: 62, max: 18 })}
  <text x="300" y="430" font-family="${MONO}" font-size="14" fill="${C.mute}">Doubly landlocked: Liechtenstein, Uzbekistan</text>
  <text x="300" y="454" font-family="${MONO}" font-size="14" fill="${C.mute}">Enclaves in the pool: Lesotho (South Africa), Eswatini (near-enclave)</text>`,
  footer: 'Our pool is 176 entries, not 195 UN states. Source: globleunlimited.net dataset.',
}));

write(P2, 'fig-4-no-borders.svg', plate({
  title: '23 countries have no land border at all',
  sub: 'PLATE 4 · 13% of the pool — no chain of neighbours to follow inward',
  aria: 'A list plate naming the 23 countries in the pool with no land border, including Japan, Iceland, Madagascar and New Zealand.',
  body: (() => {
    const names = ['Australia', 'Bahamas', 'Cuba', 'Cyprus', 'Falkland Is.', 'Fiji', 'Fr. S. & Antarctic', 'Greenland', 'Iceland', 'Jamaica', 'Japan', 'Kosovo', 'Madagascar', 'N. Cyprus', 'New Caledonia', 'New Zealand', 'Philippines', 'Puerto Rico', 'Solomon Is.', 'Somaliland', 'Taiwan', 'Trinidad & Tob.', 'Vanuatu'];
    return names.map((n, i) => {
      const col = Math.floor(i / 8);
      const row = i % 8;
      return `  <text x="${90 + col * 300}" y="${150 + row * 38}" font-family="${MONO}" font-size="16" fill="${C.text}">· ${esc(n)}</text>`;
    }).join('\n');
  })(),
  footer: 'These dominate the hardest-countries list. Source: globleunlimited.net dataset.',
}));

const diffRows = [[0, 4.30], [1, 4.00], [2, 3.56], [3, 3.03], [4, 2.92], [5, 2.77], [6, 2.00], [7, 1.67], [8, 1.73]];
write(P2, 'fig-5-difficulty.svg', plate({
  title: 'More neighbours, easier answer',
  sub: 'PLATE 5 · mean difficulty (1–5) by land-neighbour count',
  aria: 'Line chart showing mean difficulty falling from 4.30 for countries with no land neighbour to 1.67 for countries with seven.',
  body: (() => {
    const px = (i) => 130 + i * 95;
    const py = (v) => 440 - ((v - 1.5) / 3) * 290;
    const path = diffRows.map(([, v], i) => `${i ? 'L' : 'M'}${px(i)} ${py(v).toFixed(0)}`).join(' ');
    const dots = diffRows.map(([n, v], i) => `  <circle cx="${px(i)}" cy="${py(v).toFixed(0)}" r="6" fill="${C.heat[Math.min(4, Math.round((v - 1.5) / 0.75))]}"/>
  <text x="${px(i)}" y="${py(v) - 18}" text-anchor="middle" font-family="${MONO}" font-size="14" fill="${C.dim}">${v.toFixed(2)}</text>
  <text x="${px(i)}" y="472" text-anchor="middle" font-family="${MONO}" font-size="14" fill="${C.text}">${n}${n === 8 ? '+' : ''}</text>`).join('\n');
    return `  <path d="M120 440H960" stroke="${C.gold}" stroke-opacity="0.25"/>
  <path d="${path}" fill="none" stroke="${C.gold}" stroke-width="2.5"/>
${dots}
  <text x="540" y="500" text-anchor="middle" font-family="${MONO}" font-size="14" fill="${C.mute}">land neighbours</text>`;
  })(),
  footer: 'Monotonic across every step but the last. Source: globleunlimited.net dataset.',
}));

// ═════════════════════════════════════════════════ POST 3 — HEAT ═══════════
const P3 = 'globle-heat-scale-explained';
console.log(P3);

const rampArt = C.heat.slice().reverse().map((c, i) =>
  `    <rect x="${175 + i * 62}" y="215" width="58" height="200" fill="${c}"/>`).join('\n');

write(P3, 'cover.svg', cover({
  eyebrow: 'FIELD NOTES · MECHANICS',
  lines: [{ t: "Why Globle's" }, { t: 'Colours Lie' }, { t: 'The Heat Scale Explained', italic: true }],
  sub: '0 to 12,000 km · five stops · one blind spot',
  aria: 'Cover: the Globle colour ramp from pale yellow to deep red beside a kilometre scale, titled Why Globle’s Colours Lie',
  art: `  <g>\n${rampArt}\n  </g>
  <text x="175" y="200" font-family="${MONO}" font-size="16" fill="${C.dim}">0 km</text>
  <text x="466" y="200" text-anchor="end" font-family="${MONO}" font-size="16" fill="${C.dim}">12,000 km</text>
  <path d="M175 430H466" stroke="${C.gold}" stroke-opacity="0.5"/>
  <text x="320" y="458" text-anchor="middle" font-family="${MONO}" font-size="15" fill="${C.mute}">3,000 km per segment</text>`,
}));

write(P3, 'fig-1-stops.svg', plate({
  title: 'The five stops, in kilometres',
  sub: 'PLATE 1 · each segment covers 3,000 km',
  aria: 'The five colour stops mapped to distance: deep red at 0 km, red at 3,000, orange at 6,000, amber at 9,000, pale yellow at 12,000 and beyond.',
  body: (() => {
    const stops = [['Deep red', 0, 4], ['Red', 3000, 3], ['Orange', 6000, 2], ['Amber', 9000, 1], ['Pale yellow', 12000, 0]];
    return stops.map(([name, km, ci], i) => {
      const x = 90 + i * 176;
      return `  <g>
    <rect x="${x}" y="160" width="160" height="150" fill="${C.heat[ci]}"/>
    <text x="${x + 80}" y="340" text-anchor="middle" font-family="${MONO}" font-size="16" fill="${C.text}">${esc(name)}</text>
    <text x="${x + 80}" y="368" text-anchor="middle" font-family="${MONO}" font-size="15" fill="${C.gold}">${km.toLocaleString('en-US')}${i === 4 ? '+' : ''} km</text>
  </g>`;
    }).join('\n') + `\n  <path d="M90 400H954" stroke="${C.gold}" stroke-opacity="0.3"/>
  <text x="522" y="432" text-anchor="middle" font-family="${MONO}" font-size="15" fill="${C.mute}">the ramp interpolates smoothly between stops</text>
  <text x="522" y="462" text-anchor="middle" font-family="${MONO}" font-size="15" fill="${C.heat[0]}">everything past 12,000 km is this same colour</text>`;
  })(),
}));

write(P3, 'fig-2-saturation.svg', plate({
  title: 'The band that absorbs everything',
  sub: 'PLATE 2 · real distance range inside each band, measured from Greece',
  aria: 'Range chart showing the first four bands each span about 2,700 km while the pale-yellow band spans 5,182 km.',
  body: (() => {
    const rows = [
      ['Deep red', 264, 2956, 4], ['Red', 3031, 5959, 3], ['Orange', 6293, 8941, 2],
      ['Amber', 9040, 11776, 1], ['Pale yellow', 12146, 17328, 0],
    ];
    const sx = (km) => 250 + (km / 18000) * 660;
    return rows.map(([name, lo, hi, ci], i) => {
      const y = 150 + i * 62;
      return `  <g font-family="${MONO}" font-size="15">
    <text x="238" y="${y + 16}" text-anchor="end" fill="${C.text}">${esc(name)}</text>
    <rect x="${sx(lo).toFixed(0)}" y="${y}" width="${(sx(hi) - sx(lo)).toFixed(0)}" height="21" fill="${C.heat[ci]}"/>
    <text x="${sx(hi) + 10}" y="${y + 16}" fill="${labelColour(C.heat[ci])}">${(hi - lo).toLocaleString('en-US')} km wide</text>
  </g>`;
    }).join('\n') + `\n  <path d="M${sx(12000).toFixed(0)} 130V470" stroke="${C.gold}" stroke-dasharray="4 4" stroke-opacity="0.6"/>
  <text x="${(sx(12000) + 8).toFixed(0)}" y="126" font-family="${MONO}" font-size="14" fill="${C.gold}">scale ends</text>`;
  })(),
  footer: 'Paraguay to Taiwan is 19,932 km — 7,900 km past the ceiling.',
}));

write(P3, 'fig-3-openers.svg', plate({
  title: 'Countries per band, by opening guess',
  sub: 'PLATE 3 · the other 175 countries, distributed',
  aria: 'Grouped bars: from New Zealand 129 of 175 countries fall in the pale-yellow band, against 10 from Greece.',
  body: (() => {
    const rows = [['Deep red', 58, 24, 11, 2], ['Red', 52, 69, 24, 5], ['Orange', 26, 41, 40, 6], ['Amber', 29, 18, 61, 33], ['Pale yellow', 10, 23, 39, 129]];
    const cols = ['Greece', 'Kazakhstan', 'Brazil', 'N. Zealand'];
    const head = cols.map((c, j) => `    <text x="${290 + j * 175}" y="126" font-family="${MONO}" font-size="14" fill="${C.dim}">${c}</text>`).join('\n');
    const body = rows.map(([name, ...vals], i) => {
      const y = 150 + i * 64;
      const bar = vals.map((v, j) => {
        const w = Math.max(3, (v / 130) * 130);
        return `    <rect x="${290 + j * 175}" y="${y}" width="${w.toFixed(0)}" height="20" fill="${C.heat[i]}"/>
    <text x="${(290 + j * 175 + w + 7).toFixed(0)}" y="${y + 16}" font-family="${MONO}" font-size="13" fill="${labelColour(C.heat[i])}">${v}</text>`;
      }).join('\n');
      return `  <g>
    <text x="278" y="${y + 16}" text-anchor="end" font-family="${MONO}" font-size="15" fill="${C.text}">${esc(name)}</text>
${bar}
  </g>`;
    }).join('\n');
    return `${head}\n${body}\n  <text x="815" y="490" text-anchor="middle" font-family="${MONO}" font-size="14" fill="${C.gold}">74% of the world, one shade</text>`;
  })(),
  footer: 'This is what a corner opener costs. Source: globleunlimited.net dataset.',
}));

write(P3, 'fig-4-resolution.svg', plate({
  title: 'Below 600 km, colour stops resolving',
  sub: 'PLATE 4 · country pairs your eye cannot separate',
  aria: 'Plate listing country pairs closer than 600 km apart, which produce indistinguishable colours: Austria and Slovakia 422 km, Ghana and Ivory Coast 484 km.',
  body: (() => {
    const pairs = [['Austria', 'Slovakia', 422], ['Ghana', 'Ivory Coast', 484], ['Belgrade region', 'Budapest region', 320], ['Vienna', 'Warsaw', 550]];
    const rows = pairs.map(([a, b, km], i) => {
      const y = 165 + i * 62;
      return `  <g font-family="${MONO}" font-size="16">
    <text x="110" y="${y}" fill="${C.text}">${esc(a)}</text>
    <text x="330" y="${y}" fill="${C.mute}">↔</text>
    <text x="370" y="${y}" fill="${C.text}">${esc(b)}</text>
    <text x="640" y="${y}" fill="${C.heat[3]}">${km} km</text>
    <rect x="740" y="${y - 16}" width="90" height="20" fill="${C.heat[3]}"/>
    <rect x="838" y="${y - 16}" width="90" height="20" fill="${C.heat[3]}"/>
  </g>`;
    }).join('\n');
    return `${rows}
  <text x="784" y="140" text-anchor="middle" font-family="${MONO}" font-size="14" fill="${C.mute}">what you actually see</text>
  <text x="110" y="452" font-family="${MONO}" font-size="15" fill="${C.gold}">Once two guesses land inside your limit, stop measuring and start naming.</text>`;
  })(),
}));

write(P3, 'fig-5-decision.svg', plate({
  title: 'A decision rule from the numbers',
  sub: 'PLATE 5 · what to do with the colour you got',
  aria: 'Flow diagram: pale yellow means guess somewhere else entirely, mid-scale means triangulate, deep red means enumerate candidates.',
  body: (() => {
    const boxes = [
      ['Pale yellow', 'Scale gave up.', 'Guess far away.', 0],
      ['Orange / amber', 'Scale is working.', 'Triangulate 90° off.', 2],
      ['Deep red', 'Below resolution.', 'Name candidates.', 4],
    ];
    return boxes.map(([label, l1, l2, ci], i) => {
      const x = 90 + i * 290;
      return `  <g>
    <rect x="${x}" y="160" width="250" height="190" fill="none" stroke="${C.heat[ci]}" stroke-width="2" rx="10"/>
    <rect x="${x + 20}" y="185" width="210" height="26" fill="${C.heat[ci]}"/>
    <text x="${x + 125}" y="204" text-anchor="middle" font-family="${MONO}" font-size="15" fill="${C.ground}">${esc(label)}</text>
    <text x="${x + 125}" y="258" text-anchor="middle" font-family="${MONO}" font-size="15" fill="${C.dim}">${esc(l1)}</text>
    <text x="${x + 125}" y="292" text-anchor="middle" font-family="${MONO}" font-size="16" fill="${C.text}">${esc(l2)}</text>
  </g>`;
    }).join('\n') + `\n  <text x="500" y="420" text-anchor="middle" font-family="${MONO}" font-size="15" fill="${C.mute}">The colour is only information in the middle of its range.</text>`;
  })(),
}));

// ═══════════════════════════════════════════════ POST 4 — STATES ═══════════
const P4 = 'identify-us-states-by-shape';
console.log(P4);

write(P4, 'cover.svg', cover({
  eyebrow: 'FIELD NOTES · FIELD GUIDE',
  lines: [{ t: 'Name Any US State' }, { t: 'From Its Outline' }, { t: 'A Field Guide', italic: true }],
  sub: '50 states · four shape families · 1,225 pairs measured',
  aria: 'Cover: stylised US state outlines grouped into four shape families, titled Name Any US State From Its Outline',
  art: `  <g stroke="${C.gold}" stroke-opacity="0.85" fill="${C.panel}" stroke-width="2">
    <rect x="185" y="185" width="120" height="80"/>
    <rect x="330" y="185" width="95" height="80"/>
    <path d="M185 300h60v-18h60v98h-120z"/>
    <path d="M330 300h95l-12 98h-83z"/>
    <path d="M190 425h70l14 -22h46v70h-130z"/>
    <path d="M345 425h40l18 26 22 -12v56h-80z"/>
  </g>
  <text x="185" y="175" font-family="${MONO}" font-size="14" fill="${C.mute}">RECTANGLES</text>
  <text x="185" y="290" font-family="${MONO}" font-size="14" fill="${C.mute}">WEDGES</text>
  <text x="190" y="415" font-family="${MONO}" font-size="14" fill="${C.mute}">COASTAL / ONE-OFFS</text>`,
}));

write(P4, 'fig-1-families.svg', plate({
  title: 'The four shape families',
  sub: 'PLATE 1 · sort first, identify second',
  aria: 'Four panels showing the shape families: rectangles, wedges and slabs, coastal irregulars, and one-offs.',
  body: (() => {
    const fams = [
      ['Rectangles', 'CO WY UT KS NE ND SD', 'M30 20h150v100h-150z', 4],
      ['Wedges & slabs', 'NV ID MT OR WA', 'M30 20h150l-24 100h-126z', 3],
      ['Coastal irregulars', 'FL CA TX LA ME NC', 'M30 30q40 -18 70 6t80 -8v78q-50 22 -90 4t-60 10z', 2],
      ['One-offs', 'MI LA OK WV AK HI', 'M30 20h60v40h30v-40h60v100h-150z', 1],
    ];
    return fams.map(([name, members, d, ci], i) => {
      const x = 60 + i * 230;
      return `  <g>
    <rect x="${x}" y="140" width="200" height="230" fill="none" stroke="${C.gold}" stroke-opacity="0.25" rx="8"/>
    <g transform="translate(${x + 20},160)"><path d="${d}" fill="${C.heat[ci]}" fill-opacity="0.85" stroke="${C.gold}" stroke-opacity="0.6"/></g>
    <text x="${x + 100}" y="320" text-anchor="middle" font-family="${MONO}" font-size="15" fill="${C.text}">${esc(name)}</text>
    <text x="${x + 100}" y="348" text-anchor="middle" font-family="${MONO}" font-size="13" fill="${C.mute}">${esc(members)}</text>
  </g>`;
    }).join('\n') + `\n  <text x="500" y="425" text-anchor="middle" font-family="${MONO}" font-size="15" fill="${C.gold}">The simplest shapes carry the least information.</text>`;
  })(),
  footer: 'Families are our classification, not a computed result.',
}));

write(P4, 'fig-2-isolation.svg', plate({
  title: 'The loneliest and the most crowded states',
  sub: 'PLATE 2 · km to the nearest other state centre',
  aria: 'Bar chart: Hawaii is 4,020 km from its nearest state, Alaska 2,693 km, while Rhode Island and Massachusetts are 69 km apart.',
  body: bars([
    ['Hawaii', 4020, C.heat[0]], ['Alaska', 2693, C.heat[1]], ['Arizona', 510, C.heat[2]],
    ['Texas', 489, C.heat[2]], ['Colorado', 475, C.heat[2]], ['New Jersey', 150, C.heat[3]],
    ['Maryland', 109, C.heat[4]], ['Connecticut', 98, C.heat[4]], ['Rhode Island', 69, C.heat[4]],
  ], { x: 310, y: 126, w: 540, rowH: 42, max: 4400, unit: ' km' }),
  footer: 'In New England the distance clue stops helping. Source: globleunlimited.net dataset.',
}));

write(P4, 'fig-3-pairs.svg', plate({
  title: 'The pairs everyone confuses',
  sub: 'PLATE 3 · one tell each',
  aria: 'Plate listing eight confusable US state pairs with the distinguishing feature for each.',
  body: (() => {
    const pairs = [
      ['NH / VT', 'VT widens at the top'], ['MO / IA', 'MO has the bootheel'],
      ['WY / CO', 'CO is clearly wider'], ['AL / MS', 'MS has the river edge'],
      ['ND / SD', 'SD’s east edge bends'], ['KS / NE', 'NE has the west stub'],
      ['CT / MA', 'MA has Cape Cod'], ['VA / WV', 'WV has no straight line'],
    ];
    return pairs.map(([p, tell], i) => {
      const col = Math.floor(i / 4), row = i % 4;
      const x = 80 + col * 450, y = 165 + row * 72;
      return `  <g>
    <rect x="${x}" y="${y - 30}" width="410" height="56" fill="none" stroke="${C.gold}" stroke-opacity="0.2" rx="6"/>
    <text x="${x + 18}" y="${y + 4}" font-family="${MONO}" font-size="18" fill="${C.gold}">${esc(p)}</text>
    <text x="${x + 130}" y="${y + 4}" font-family="${MONO}" font-size="15" fill="${C.dim}">${esc(tell)}</text>
  </g>`;
    }).join('\n');
  })(),
  footer: 'Seven of the eight pairs are geographic neighbours.',
}));

write(P4, 'fig-4-openers.svg', plate({
  title: 'The best opening states',
  sub: 'PLATE 4 · worst-case states left sharing the reading · ±200 km',
  aria: 'Bar chart of best opening states: Massachusetts, New Hampshire and Vermont each leave at most 7 candidates.',
  body: `${bars([
    ['Massachusetts', 7, C.heat[0]], ['New Hampshire', 7, C.heat[0]], ['Vermont', 7, C.heat[0]],
    ['Arizona', 8, C.heat[1]], ['Hawaii', 8, C.heat[1]], ['Maine', 8, C.heat[1]],
    ['Rhode Island', 8, C.heat[1]], ['Connecticut', 9, C.heat[2]],
  ], { x: 320, y: 140, w: 480, rowH: 44, max: 11 })}
  <text x="320" y="490" font-family="${MONO}" font-size="14" fill="${C.gold}">The opposite of the country game — here a corner opener wins.</text>`,
  footer: 'The US board is small enough that corners still resolve. Source: globleunlimited.net dataset.',
}));

write(P4, 'fig-5-drill.svg', plate({
  title: 'Practice order, hardest last',
  sub: 'PLATE 5 · four weeks, by family',
  aria: 'Four-week drill plan: one-offs, then coastal irregulars, then wedges and slabs, then rectangles drilled in pairs.',
  body: (() => {
    const weeks = [
      ['WEEK 1', 'The one-offs', 'MI LA OK WV FL AK HI TX CA', 1],
      ['WEEK 2', 'Coastal irregulars', 'Atlantic → Gulf → Pacific', 2],
      ['WEEK 3', 'Wedges & slabs', 'NV ID MT OR WA UT AZ NM', 3],
      ['WEEK 4', 'Rectangles, in pairs', 'CO/WY · ND/SD · KS/NE', 4],
    ];
    return weeks.map(([w, name, members, ci], i) => {
      const y = 145 + i * 88;
      return `  <g>
    <rect x="80" y="${y}" width="${180 + i * 180}" height="60" fill="${C.heat[ci]}" fill-opacity="0.18" stroke="${C.heat[ci]}" rx="6"/>
    <text x="104" y="${y + 26}" font-family="${MONO}" font-size="14" fill="${C.heat[ci]}">${w}</text>
    <text x="104" y="${y + 48}" font-family="${MONO}" font-size="16" fill="${C.text}">${esc(name)}</text>
    <text x="${280 + i * 180}" y="${y + 38}" font-family="${MONO}" font-size="14" fill="${C.mute}">${esc(members)}</text>
  </g>`;
    }).join('\n');
  })(),
  footer: 'Drill rectangles in pairs — discrimination, not recognition.',
}));

console.log('\ndone');
