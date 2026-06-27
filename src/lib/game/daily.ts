// Deterministic daily answer — shared by the game engine (client) and the
// answer pages (build-time + client), so /answer always matches what players see.
import type { Country } from './types';
import { COUNTRIES } from './countries';

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

/** The mystery country for a given ISO date. Matches GameEngine('daily', dateSeed). */
export function answerForDate(dateISO: string): Country {
  const rng = mulberry32(dateSeed(dateISO));
  return COUNTRIES[Math.floor(rng() * COUNTRIES.length)];
}

/** Add/subtract days from an ISO date (UTC). */
export function shiftISO(dateISO: string, days: number): string {
  const t = Date.parse(dateISO + 'T00:00:00Z') + days * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}
