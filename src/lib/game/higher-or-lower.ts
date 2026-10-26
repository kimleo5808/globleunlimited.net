// Higher or Lower: Countries — dealing pairs and judging answers.
// Population comes from src/data/population.json (World Bank, built by
// scripts/build-population.mjs); land area from countries.json, the same
// figure every other game on the site uses.
import popData from '../../data/population.json';
import { COUNTRIES } from './countries';
import type { Country } from './types';

export type Stat = 'population' | 'area';
export type HolMode = Stat | 'mixed';

const PEOPLE = (popData as { people: Record<string, number> }).people;
export const POPULATION_YEAR = (popData as { year: string }).year;

/** Countries a stat can be asked about: population needs a figure. */
const POOLS: Record<Stat, Country[]> = {
  population: COUNTRIES.filter((c) => PEOPLE[c.name] && c.area),
  area: COUNTRIES.filter((c) => c.area),
};

export const valueOf = (c: Country, stat: Stat): number => (stat === 'population' ? PEOPLE[c.name] : c.area ?? 0);

/** Two values this close are a tie, and either answer counts as right. */
const TIE = 1.005;

export type Answer = 'higher' | 'lower';

/** Whether the challenger's value is higher or lower than the current one,
 *  or 'tie' when they are within half a percent. */
export function judge(current: Country, challenger: Country, stat: Stat): Answer | 'tie' {
  const a = valueOf(current, stat), b = valueOf(challenger, stat);
  if (Math.max(a, b) / Math.min(a, b) < TIE) return 'tie';
  return b > a ? 'higher' : 'lower';
}

/** The pair where land area points one way and population the other: the
 *  bigger country has fewer people. */
const isTrap = (a: Country, b: Country) => (a.area! > b.area!) !== (PEOPLE[a.name] > PEOPLE[b.name]);

/** Difficulty by streak: first wide gaps, then a band with a few extra traps
 *  mixed in, then values within one and a half times of each other. Pairs
 *  this close are traps about a third of the time on their own, so only a
 *  light push is needed. */
function band(streak: number): { lo: number; hi: number; trapChance: number } {
  if (streak < 5) return { lo: 3, hi: Infinity, trapChance: 0 };
  if (streak < 15) return { lo: 1.5, hi: 3, trapChance: 0.1 };
  return { lo: TIE, hi: 1.5, trapChance: 0 };
}

/** Pick the next challenger for `current`. Countries already used in this
 *  run are skipped; if the band is empty the nearest usable country is taken. */
export function nextChallenger(rng: () => number, current: Country, stat: Stat, streak: number, used: Set<string>): Country {
  const pool = POOLS[stat].filter((c) => c.name !== current.name && !used.has(c.name));
  const cur = valueOf(current, stat);
  const ratio = (c: Country) => Math.max(cur, valueOf(c, stat)) / Math.min(cur, valueOf(c, stat));
  const { lo, hi, trapChance } = band(streak);
  let candidates = pool.filter((c) => ratio(c) >= lo && ratio(c) < hi);
  if (stat === 'population' && rng() < trapChance) {
    const traps = candidates.filter((c) => isTrap(current, c));
    if (traps.length) candidates = traps;
  }
  if (!candidates.length) candidates = [...pool].sort((x, y) => Math.abs(ratio(x) - lo) - Math.abs(ratio(y) - lo)).slice(0, 10);
  return candidates[Math.floor(rng() * candidates.length)];
}

/** A random opening country for a stat. */
export const firstCountry = (rng: () => number, stat: Stat): Country => POOLS[stat][Math.floor(rng() * POOLS[stat].length)];

/** 1.45B / 41.3M / 402K people, or a full km² figure. */
export function formatValue(n: number, stat: Stat): string {
  if (stat === 'area') return `${Math.round(n).toLocaleString('en-US')} km²`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  return `${Math.round(n / 1e3)}K`;
}

/** Country names that read with "the" in a sentence. */
const WITH_THE = new Set([
  'United States', 'United Kingdom', 'United Arab Emirates', 'Netherlands', 'Philippines',
  'Bahamas', 'Gambia', 'Central African Republic', 'Dominican Republic',
  'Republic of the Congo', 'Solomon Islands', 'Falkland Islands',
]);
const inSentence = (name: string) => (WITH_THE.has(name) ? `the ${name}` : name);
const capitalise = (s: string) => s[0].toUpperCase() + s.slice(1);

/** When size and population point opposite ways, the sentence that names the
 *  trap ("Canada is 3.0× larger by area."); otherwise null. */
export function trapNote(current: Country, challenger: Country, stat: Stat): string | null {
  if (stat !== 'population' || !isTrap(current, challenger)) return null;
  const [big, small] = current.area! > challenger.area! ? [current, challenger] : [challenger, current];
  return capitalise(`${inSentence(big.name)} is ${(big.area! / small.area!).toFixed(1)}× larger by area — that is the trap.`);
}

/** "India has 35× the population of Canada" — the line shown after each reveal. */
export function compareLine(current: Country, challenger: Country, stat: Stat): string {
  const a = valueOf(current, stat), b = valueOf(challenger, stat);
  const noun = stat === 'population' ? 'population' : 'land area';
  const [big, small, r] = b >= a ? [challenger, current, b / a] : [current, challenger, a / b];
  if (r < TIE) return capitalise(`${inSentence(challenger.name)} and ${inSentence(current.name)} are level on ${noun}.`);
  const times = r >= 10 ? Math.round(r).toLocaleString('en-US') : r.toFixed(1);
  return capitalise(`${inSentence(big.name)} has ${times}× the ${noun} of ${inSentence(small.name)}.`);
}
