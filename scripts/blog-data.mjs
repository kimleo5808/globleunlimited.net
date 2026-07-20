// Computes every figure quoted in the data-driven blog posts, so the numbers
// in the articles are reproducible rather than asserted.
//
// Usage: node scripts/blog-data.mjs [capitals|borders|heat|states|all]
//
// Uses the same haversine and the same heat-ramp constants as the game
// (src/lib/game/distance.ts, src/lib/game/color.ts).
import { readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const COUNTRIES = read('src/data/countries.json');
const CAPITALS = read('src/data/capitals.json');
const STATES = read('src/data/us-states.json');

const R = 6371;
const rad = (d) => (d * Math.PI) / 180;
function haversine(aLat, aLng, bLat, bLng) {
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Heat ramp: 0–12,000 km across five stops (color.ts). */
const MAX_KM = 12000;
const BAND_NAMES = ['deep red', 'red', 'orange', 'amber', 'pale yellow'];
/** Which of the five ramp segments a distance falls in. */
function band(km) {
  const t = Math.min(1, km / MAX_KM);
  return Math.min(4, Math.floor(t * 4));
}

const fmt = (n, d = 0) => n.toLocaleString('en-US', { maximumFractionDigits: d });
const head = (s) => console.log(`\n${'='.repeat(70)}\n${s}\n${'='.repeat(70)}`);

// ─────────────────────────────────────────────────────────────── capitals ──
function capitalsReport() {
  head('POST 1 — CAPITALS');
  const caps = CAPITALS.filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng));
  console.log(`capitals with coordinates: ${caps.length}`);

  const d = (a, b) => haversine(a.lat, a.lng, b.lat, b.lng);

  // Best opener: the capital whose distance reading leaves the fewest others
  // inside the same 500 km band.
  const TOL = 500;
  const scored = caps.map((opener) => {
    let worst = 0;
    // For each possible answer, how many capitals share its reading?
    for (const target of caps) {
      if (target === opener) continue;
      const t = d(opener, target);
      let same = 0;
      for (const other of caps) {
        if (other === opener) continue;
        if (Math.abs(d(opener, other) - t) <= TOL) same++;
      }
      worst = Math.max(worst, same);
    }
    return { name: opener.name, country: opener.country, worst };
  });
  scored.sort((a, b) => a.worst - b.worst);
  console.log('\nBest opening capitals (lower = better worst-case):');
  scored.slice(0, 8).forEach((s, i) =>
    console.log(`  ${i + 1}. ${s.name} (${s.country}) — worst case ${s.worst} left`));
  console.log('Worst openers:');
  scored.slice(-4).forEach((s) => console.log(`  ${s.name} (${s.country}) — ${s.worst} left`));

  // Densest clusters: capitals with the most neighbours inside 500 km.
  const dense = caps
    .map((c) => ({
      name: c.name,
      country: c.country,
      near: caps.filter((o) => o !== c && d(c, o) <= 500).length,
    }))
    .sort((a, b) => b.near - a.near);
  console.log('\nDensest capitals (others within 500 km):');
  dense.slice(0, 10).forEach((c) => console.log(`  ${c.name} (${c.country}) — ${c.near}`));

  // Most isolated: greatest distance to the nearest other capital.
  const lonely = caps
    .map((c) => ({
      name: c.name,
      country: c.country,
      nearest: Math.min(...caps.filter((o) => o !== c).map((o) => d(c, o))),
    }))
    .sort((a, b) => b.nearest - a.nearest);
  console.log('\nMost isolated capitals (km to nearest other capital):');
  lonely.slice(0, 8).forEach((c) => console.log(`  ${c.name} (${c.country}) — ${fmt(c.nearest)} km`));

  // Capitals far from their own country's centroid — the distance-game trap.
  const byCca2 = new Map(COUNTRIES.filter((c) => c.cca2).map((c) => [c.cca2, c]));
  const offset = caps
    .map((cap) => {
      const country = byCca2.get(cap.cca2);
      if (!country) return null;
      return {
        cap: cap.name,
        country: country.name,
        km: haversine(cap.lat, cap.lng, country.lat, country.lng),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.km - a.km);
  console.log('\nCapitals furthest from their country centroid:');
  offset.slice(0, 12).forEach((o) => console.log(`  ${o.cap} (${o.country}) — ${fmt(o.km)} km off centre`));

  // How many capitals sit in each heat band from a chosen opener.
  for (const openerName of ['Cairo', 'Athens', 'Wellington']) {
    const opener = caps.find((c) => c.name === openerName);
    if (!opener) continue;
    const counts = [0, 0, 0, 0, 0];
    for (const c of caps) if (c !== opener) counts[band(d(opener, c))]++;
    console.log(`\nCapitals per heat band from ${openerName}:`);
    counts.forEach((n, i) => console.log(`  ${BAND_NAMES[i].padEnd(12)} ${n}`));
  }
}

// ──────────────────────────────────────────────────────────────── borders ──
function bordersReport() {
  head('POST 2 — BORDERS AND LANDLOCKED');
  console.log(`countries in pool: ${COUNTRIES.length}`);

  const dist = {};
  for (const c of COUNTRIES) {
    const b = c.borders ?? 0;
    dist[b] = (dist[b] ?? 0) + 1;
  }
  console.log('\nNeighbour-count distribution:');
  Object.keys(dist)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((k) => console.log(`  ${String(k).padStart(2)} neighbours: ${dist[k]}`));

  const top = [...COUNTRIES].sort((a, b) => (b.borders ?? 0) - (a.borders ?? 0));
  console.log('\nMost land neighbours:');
  top.slice(0, 10).forEach((c) => console.log(`  ${c.name} — ${c.borders}`));

  const none = COUNTRIES.filter((c) => (c.borders ?? 0) === 0);
  console.log(`\nCountries with no land border: ${none.length}`);
  console.log('  ' + none.map((c) => c.name).join(', '));

  const locked = COUNTRIES.filter((c) => c.landlocked);
  console.log(`\nLandlocked in our pool: ${locked.length}  (world figure is 44 of 195 — our pool is ${COUNTRIES.length})`);
  const byRegion = {};
  for (const c of locked) byRegion[c.region || 'Other'] = (byRegion[c.region || 'Other'] ?? 0) + 1;
  console.log('  by region: ' + Object.entries(byRegion).map(([k, v]) => `${k} ${v}`).join(' · '));
  console.log('  ' + locked.map((c) => c.name).join(', '));

  // Difficulty (same 65/35 formula as src/lib/game/analysis.ts) vs neighbours.
  const areaRank = new Map(
    [...COUNTRIES].sort((a, b) => (b.area ?? 0) - (a.area ?? 0)).map((c, i) => [c.name, i + 1]),
  );
  const score = (c) => {
    const areaPct = areaRank.get(c.name) / COUNTRIES.length;
    const borderPct = 1 - Math.min(c.borders ?? 0, 8) / 8;
    return Math.max(1, Math.min(5, Math.round((0.65 * areaPct + 0.35 * borderPct) * 4) + 1));
  };
  const buckets = {};
  for (const c of COUNTRIES) {
    const b = Math.min(c.borders ?? 0, 8);
    (buckets[b] ??= []).push(score(c));
  }
  console.log('\nMean difficulty by neighbour count:');
  Object.keys(buckets)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((k) => {
      const arr = buckets[k];
      const mean = arr.reduce((s, n) => s + n, 0) / arr.length;
      console.log(`  ${String(k).padStart(2)}${k === 8 ? '+' : ' '} neighbours: mean ${mean.toFixed(2)} (n=${arr.length})`);
    });
}

// ─────────────────────────────────────────────────────────────────── heat ──
function heatReport() {
  head('POST 3 — HEAT SCALE');
  console.log(`ramp: 0 to ${fmt(MAX_KM)} km across 5 stops → each segment ${fmt(MAX_KM / 4)} km`);
  console.log('stop boundaries: ' + [0, 1, 2, 3, 4].map((i) => fmt((i * MAX_KM) / 4)).join(' · '));

  const d = (a, b) => haversine(a.lat, a.lng, b.lat, b.lng);

  for (const openerName of ['Greece', 'Kazakhstan', 'New Zealand', 'Brazil']) {
    const opener = COUNTRIES.find((c) => c.name === openerName);
    if (!opener) continue;
    const counts = [0, 0, 0, 0, 0];
    for (const c of COUNTRIES) if (c !== opener) counts[band(d(opener, c))]++;
    console.log(`\nCountries per band from ${openerName}:`);
    counts.forEach((n, i) =>
      console.log(`  ${BAND_NAMES[i].padEnd(12)} ${String(n).padStart(3)}  (${((n / (COUNTRIES.length - 1)) * 100).toFixed(0)}%)`));
  }

  // The headline claim: how far apart can two same-band countries be?
  const opener = COUNTRIES.find((c) => c.name === 'Greece');
  const spread = [[], [], [], [], []];
  for (const c of COUNTRIES) {
    if (c === opener) continue;
    spread[band(d(opener, c))].push(d(opener, c));
  }
  console.log('\nDistance spread inside each band (from Greece):');
  spread.forEach((arr, i) => {
    if (!arr.length) return;
    const lo = Math.min(...arr), hi = Math.max(...arr);
    console.log(`  ${BAND_NAMES[i].padEnd(12)} ${fmt(lo)}–${fmt(hi)} km  → spread ${fmt(hi - lo)} km`);
  });

  // Mean distance to all others — the centrality figure quoted elsewhere.
  const central = COUNTRIES.map((c) => ({
    name: c.name,
    mean: COUNTRIES.filter((o) => o !== c).reduce((s, o) => s + d(c, o), 0) / (COUNTRIES.length - 1),
  })).sort((a, b) => a.mean - b.mean);
  console.log('\nMost central (mean km to all others):');
  central.slice(0, 5).forEach((c) => console.log(`  ${c.name} — ${fmt(c.mean)} km`));
  console.log('Least central:');
  central.slice(-5).forEach((c) => console.log(`  ${c.name} — ${fmt(c.mean)} km`));
}

// ───────────────────────────────────────────────────────────────── states ──
function statesReport() {
  head('POST 4 — US STATES');
  console.log(`states: ${STATES.length}`);
  const d = (a, b) => haversine(a.lat, a.lng, b.lat, b.lng);

  const lonely = STATES.map((s) => ({
    name: s.name,
    nearest: Math.min(...STATES.filter((o) => o !== s).map((o) => d(s, o))),
  })).sort((a, b) => b.nearest - a.nearest);
  console.log('\nMost isolated states (km to nearest other state centre):');
  lonely.slice(0, 10).forEach((s) => console.log(`  ${s.name} — ${fmt(s.nearest)} km`));
  console.log('Tightest packed:');
  lonely.slice(-8).forEach((s) => console.log(`  ${s.name} — ${fmt(s.nearest)} km`));

  // Best opening state by the same worst-case band rule.
  const TOL = 200;
  const scored = STATES.map((opener) => {
    let worst = 0;
    for (const target of STATES) {
      if (target === opener) continue;
      const t = d(opener, target);
      let same = 0;
      for (const other of STATES) {
        if (other === opener) continue;
        if (Math.abs(d(opener, other) - t) <= TOL) same++;
      }
      worst = Math.max(worst, same);
    }
    return { name: opener.name, worst };
  }).sort((a, b) => a.worst - b.worst);
  console.log('\nBest opening states (worst case remaining, 200 km tolerance):');
  scored.slice(0, 8).forEach((s, i) => console.log(`  ${i + 1}. ${s.name} — ${s.worst}`));

  // Mean centrality, for the scanning-order argument.
  const central = STATES.map((s) => ({
    name: s.name,
    mean: STATES.filter((o) => o !== s).reduce((acc, o) => acc + d(s, o), 0) / (STATES.length - 1),
  })).sort((a, b) => a.mean - b.mean);
  console.log('\nMost central states:');
  central.slice(0, 5).forEach((s) => console.log(`  ${s.name} — ${fmt(s.mean)} km`));
}

const which = process.argv[2] ?? 'all';
if (which === 'capitals' || which === 'all') capitalsReport();
if (which === 'borders' || which === 'all') bordersReport();
if (which === 'heat' || which === 'all') heatReport();
if (which === 'states' || which === 'all') statesReport();
