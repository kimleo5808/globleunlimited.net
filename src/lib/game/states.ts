// US-states dataset for the Statele-style /states mode. Same shape as the
// countries dataset, so it plugs straight into the shared silhouette game.
import type { Guessable, Dataset } from './types';
import { normalize } from './countries';
import data from '../../data/us-states.json';

export const STATES: Guessable[] = data as Guessable[];

// name + abbreviation -> state
const INDEX = new Map<string, Guessable>();
for (const s of STATES) {
  INDEX.set(normalize(s.name), s);
  for (const a of s.aliases) if (!INDEX.has(a)) INDEX.set(a, s);
}

export function findState(input: string): Guessable | null {
  return INDEX.get(normalize(input)) ?? null;
}

export function suggestState(query: string, limit = 6): Guessable[] {
  const q = normalize(query);
  if (!q) return [];
  const starts: Guessable[] = [];
  const contains: Guessable[] = [];
  for (const s of STATES) {
    const n = normalize(s.name);
    if (n.startsWith(q) || normalize(s.cca2) === q) starts.push(s);
    else if (n.includes(q)) contains.push(s);
  }
  return [...starts, ...contains].slice(0, limit);
}

export const statesDataset: Dataset = {
  all: STATES,
  find: findState,
  suggest: suggestState,
  random: (rng = Math.random) => STATES[Math.floor(rng() * STATES.length)],
};
