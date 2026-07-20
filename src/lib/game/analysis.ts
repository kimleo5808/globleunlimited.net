// Build-time analysis of a daily answer.
//
// Everything here is derived from src/data/countries.json (176 countries) and
// capitals.json using the same haversine the game itself scores with, so the
// numbers on the answer pages describe the real puzzle rather than a guess at
// it. The formulas are deliberately simple and are disclosed on the page.
import type { Country } from './types';
import { COUNTRIES } from './countries';
import { haversine } from './distance';
import { hintFor } from './hint';
import capitalsData from '../../data/capitals.json';

interface CapitalRow {
  name: string;
  country: string;
  cca2: string;
}

/** A rung of the hint ladder: what the clue tells you, and how many of the
 *  176 countries still satisfy every clue revealed so far. */
export interface Rung {
  /** Short label, e.g. "Continent". */
  label: string;
  /** The clue value shown to the player, e.g. "Africa". */
  clue: string;
  /** Candidates still standing after this rung. */
  remaining: number;
}

export interface Obscurity {
  /** 1 (very easy) – 5 (very hard). */
  score: number;
  label: 'Very easy' | 'Easy' | 'Moderate' | 'Hard' | 'Very hard';
  /** Rank by land area, 1 = largest of the 176. */
  areaRank: number;
}

export interface Opener {
  name: string;
  cca2: string;
  /** Great-circle distance from this opener to the answer. */
  distanceKm: number;
  /** Countries left inside the same colour band after this opening guess. */
  remaining: number;
}

export interface Analysis {
  ladder: Rung[];
  capital: string | null;
  obscurity: Obscurity;
  bestOpener: Opener;
  /** How many countries share the answer's colour band from the best opener. */
  bandPeers: number;
  neighbours: number;
}

/** Two guesses whose distance readings differ by less than this are hard to
 *  tell apart on the colour ramp, so they count as the same band. */
const BAND_TOLERANCE_KM = 500;

/** Openers are limited to countries of at least this size — advice to guess a
 *  micro-state nobody can place on a map is not useful advice. */
const OPENER_MIN_AREA_KM2 = 100_000;

const CAPITALS = capitalsData as CapitalRow[];

/** Land-area ranking, largest first. Computed once for the whole build. */
const AREA_RANK = new Map<string, number>(
  [...COUNTRIES]
    .sort((a, b) => (b.area ?? 0) - (a.area ?? 0))
    .map((c, i) => [c.name, i + 1]),
);

const OPENERS = COUNTRIES.filter((c) => (c.area ?? 0) >= OPENER_MIN_AREA_KM2);

/** Capital city of a country, or null when the dataset has no row for it. */
export function capitalOf(country: Country): string | null {
  const row = CAPITALS.find((c) => c.cca2 === country.cca2);
  return row ? row.name : null;
}

/** Candidates remaining after each hint rung, filters applied cumulatively. */
export function hintLadder(country: Country): Rung[] {
  const hint = hintFor(country);
  const letters = (c: Country) => c.name.replace(/[^A-Za-z]/g, '').length;

  // Ordered weakest filter first, so every rung removes a meaningful share of
  // the field. Putting the first letter early collapses the count straight to
  // one and makes the later rungs meaningless.
  const rungs: Array<{ label: string; clue: string; test: (c: Country) => boolean }> = [
    {
      label: 'Continent',
      clue: hint.region,
      test: (c) => (c.region || 'Unknown') === hint.region,
    },
    {
      label: 'Subregion',
      clue: country.subregion || hint.region,
      test: (c) => (c.subregion || c.region || '') === (country.subregion || country.region || ''),
    },
    {
      label: 'Hemisphere and coastline',
      clue: `${hint.hemisphere} hemisphere, ${country.landlocked ? 'landlocked' : 'has a coastline'}`,
      test: (c) => (c.lat >= 0 ? 'Northern' : 'Southern') === hint.hemisphere
        && Boolean(c.landlocked) === Boolean(country.landlocked),
    },
    {
      label: 'First letter and length',
      clue: `Starts with ${hint.startsWith}, ${hint.letters} letters`,
      test: (c) => c.name[0].toUpperCase() === hint.startsWith && letters(c) === hint.letters,
    },
  ];

  const passed: Array<(c: Country) => boolean> = [];
  return rungs.map((rung) => {
    passed.push(rung.test);
    return {
      label: rung.label,
      clue: rung.clue,
      remaining: COUNTRIES.filter((c) => passed.every((t) => t(c))).length,
    };
  });
}

/** How hard this country is to stumble across.
 *
 *  Two things make a country hard in a distance game: it is small (a small
 *  target is easy to overshoot) and it has few land neighbours (no dense
 *  cluster of near-misses to walk in from). Weighted 65/35 toward size. */
export function obscurityOf(country: Country): Obscurity {
  const areaRank = AREA_RANK.get(country.name) ?? COUNTRIES.length;
  const areaPct = areaRank / COUNTRIES.length; // 0 = largest, 1 = smallest
  const borderPct = 1 - Math.min(country.borders ?? 0, 8) / 8;
  const raw = 0.65 * areaPct + 0.35 * borderPct;

  const score = Math.max(1, Math.min(5, Math.round(raw * 4) + 1));
  const labels: Obscurity['label'][] = ['Very easy', 'Easy', 'Moderate', 'Hard', 'Very hard'];
  return { score, label: labels[score - 1], areaRank };
}

/** The opening guess that would have isolated this answer fastest.
 *
 *  For every plausible opener we count how many countries sit within
 *  BAND_TOLERANCE_KM of the answer's distance reading — those are the
 *  countries the player still cannot tell apart after that one guess. The
 *  opener leaving the fewest wins; ties go to the larger, better-known country. */
export function bestOpenerFor(country: Country): Opener {
  let best: Opener | null = null;
  let bestArea = -1;

  for (const opener of OPENERS) {
    if (opener.name === country.name) continue;
    const target = haversine(opener.lat, opener.lng, country.lat, country.lng);

    let remaining = 0;
    for (const c of COUNTRIES) {
      if (c.name === opener.name) continue;
      const d = haversine(opener.lat, opener.lng, c.lat, c.lng);
      if (Math.abs(d - target) <= BAND_TOLERANCE_KM) remaining++;
    }

    const area = opener.area ?? 0;
    if (!best || remaining < best.remaining || (remaining === best.remaining && area > bestArea)) {
      best = { name: opener.name, cca2: opener.cca2, distanceKm: Math.round(target), remaining };
      bestArea = area;
    }
  }

  // OPENERS always contains at least one country other than the answer.
  return best as Opener;
}

/** A one-line, spoiler-safe description of the day's country, assembled from
 *  dataset fields only — no hand-written copy to maintain for 176 countries.
 *
 *  Deliberately vague about anything that would name it: no capital, no first
 *  letter, no neighbour names. */
export function teaserFor(country: Country): string {
  const region = country.subregion || country.region || 'somewhere on the map';
  const coast = country.landlocked ? 'Landlocked' : 'On the coast';

  const size = (() => {
    const rank = AREA_RANK.get(country.name) ?? COUNTRIES.length;
    if (rank <= 20) return 'one of the twenty largest countries on Earth';
    if (rank <= 60) return 'a good-sized country';
    if (rank <= 120) return 'not a big country';
    return 'one of the smaller countries in the pool';
  })();

  const neighbours = country.borders ?? 0;
  const company =
    neighbours === 0
      ? 'with no land borders at all'
      : neighbours === 1
        ? 'sharing a land border with exactly one other country'
        : `hemmed in by ${neighbours} land neighbours`;

  return `${coast}, in ${region}, ${size} — ${company}.`;
}

/** Everything the answer pages need about one day's country. */
export function analyse(country: Country): Analysis {
  const bestOpener = bestOpenerFor(country);
  return {
    ladder: hintLadder(country),
    capital: capitalOf(country),
    obscurity: obscurityOf(country),
    bestOpener,
    bandPeers: bestOpener.remaining,
    neighbours: country.borders ?? 0,
  };
}
