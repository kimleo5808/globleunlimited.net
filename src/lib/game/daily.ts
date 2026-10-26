// Deterministic daily answer — shared by the game engine (client) and the
// answer pages (build-time + client), so /answer always matches what players see.
import type { Country, Dataset } from './types';
import { COUNTRIES, countriesDataset } from './countries';
import poolNames from '../../data/daily-pool.json';

/** Deterministic RNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash "YYYY-MM-DD" -> 32-bit seed so the whole world shares the daily answer. */
export function dateSeed(dateISO: string): number {
  let h = 2166136261;
  for (let i = 0; i < dateISO.length; i++) {
    h ^= dateISO.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The daily draws from this frozen list, not from countries.json. A date's
 *  answer is pool[floor(rng * length)], so reordering, adding or removing a
 *  single entry would rewrite every past answer in the archive and swap today's
 *  puzzle mid-day. countries.json is free to change (it is re-sorted by the
 *  generator with localeCompare, which is not stable across ICU versions);
 *  this list is not. To grow the pool, start a second list from a future date
 *  rather than editing this one. */
const DAILY_POOL: Country[] = (poolNames as string[]).map((name) => {
  const country = COUNTRIES.find((c) => c.name === name);
  if (!country) throw new Error(`daily-pool.json names "${name}", which is not in countries.json`);
  return country;
});

const pickDaily = (rng: () => number) => DAILY_POOL[Math.floor(rng() * DAILY_POOL.length)];

/** The mystery country for a given ISO date. Matches GameEngine('daily', dateSeed). */
export function answerForDate(dateISO: string): Country {
  return pickDaily(mulberry32(dateSeed(dateISO)));
}

/** Countries dataset whose target is drawn from the frozen daily pool. Guesses
 *  still resolve against every country. */
export const dailyDataset: Dataset = { ...countriesDataset, random: pickDaily };

/** Add/subtract days from an ISO date (UTC). */
export function shiftISO(dateISO: string, days: number): string {
  const t = Date.parse(dateISO + 'T00:00:00Z') + days * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}
