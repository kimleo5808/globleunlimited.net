import type { Capital, Dataset } from './types';
import data from '../../data/capitals.json';
import { normalize } from './countries';

export const CAPITALS: Capital[] = data as Capital[];

// Lookup: normalized capital name + aliases -> Capital.
const INDEX = new Map<string, Capital>();
for (const c of CAPITALS) {
  INDEX.set(normalize(c.name), c);
  for (const a of c.aliases) if (!INDEX.has(a)) INDEX.set(a, c);
}

export function findCapital(input: string): Capital | null {
  return INDEX.get(normalize(input)) ?? null;
}

export function suggestCapital(query: string, limit = 6): Capital[] {
  const q = normalize(query);
  if (!q) return [];
  const starts: Capital[] = [];
  const contains: Capital[] = [];
  for (const c of CAPITALS) {
    const n = normalize(c.name);
    if (n.startsWith(q)) starts.push(c);
    else if (n.includes(q)) contains.push(c);
  }
  return [...starts, ...contains].slice(0, limit);
}

export function randomCapital(rng: () => number = Math.random): Capital {
  return CAPITALS[Math.floor(rng() * CAPITALS.length)];
}

/** Capitals as a pluggable Dataset for the game engine. */
export const capitalsDataset: Dataset = {
  all: CAPITALS,
  find: findCapital,
  suggest: suggestCapital,
  random: randomCapital,
};
