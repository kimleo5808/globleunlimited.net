import type { Country } from './types';
import data from '../../data/countries.json';

export const COUNTRIES: Country[] = data as Country[];

/** Lowercase, strip accents & punctuation, collapse whitespace. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Build lookup: normalized name + every alias -> Country.
const INDEX = new Map<string, Country>();
for (const c of COUNTRIES) {
  INDEX.set(normalize(c.name), c);
  for (const a of c.aliases) {
    if (!INDEX.has(a)) INDEX.set(a, c);
  }
}

/** Resolve a user-typed string to a Country, or null if unrecognized. */
export function findCountry(input: string): Country | null {
  return INDEX.get(normalize(input)) ?? null;
}

/** Autocomplete suggestions: names starting with the query rank above contains-matches. */
export function suggest(query: string, limit = 6): Country[] {
  const q = normalize(query);
  if (!q) return [];
  const starts: Country[] = [];
  const contains: Country[] = [];
  for (const c of COUNTRIES) {
    const n = normalize(c.name);
    if (n.startsWith(q)) starts.push(c);
    else if (n.includes(q)) contains.push(c);
  }
  return [...starts, ...contains].slice(0, limit);
}

/** Flag emoji from ISO alpha-2 (regional indicator symbols). */
export function flag(cca2: string): string {
  if (!cca2 || cca2.length !== 2) return '🏳️';
  const base = 0x1f1e6;
  return String.fromCodePoint(
    base + (cca2.charCodeAt(0) - 65),
    base + (cca2.charCodeAt(1) - 65),
  );
}

/** Uniform random country. */
export function randomCountry(rng: () => number = Math.random): Country {
  return COUNTRIES[Math.floor(rng() * COUNTRIES.length)];
}
