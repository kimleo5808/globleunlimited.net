// Countryle-style attribute clues. Compare a guessed country to the target
// across six data-backed dimensions (all from world-countries, no new deps).
import type { Country, Dataset } from './types';
import { COUNTRIES, findCountry, suggest } from './countries';
import { bearing, compassArrow } from './direction';

/** Only countries with real attribute data are used as the mystery answer. */
export const CLUE_COUNTRIES: Country[] = COUNTRIES.filter((c) => c.region && (c.area ?? 0) > 0);

export const cluesDataset: Dataset = {
  all: COUNTRIES,
  find: findCountry,
  suggest,
  random: (rng = Math.random) => CLUE_COUNTRIES[Math.floor(rng() * CLUE_COUNTRIES.length)],
};

export type ClueState = 'match' | 'close' | 'far' | 'info';

export interface Clue {
  key: string;
  /** Text shown in the cell (value, yes/no, or arrow). */
  display: string;
  /** Drives the cell colour. */
  state: ClueState;
  /** For numeric clues: is the answer higher (↑) or lower (↓) than the guess? */
  hint?: 'up' | 'down';
}

const hemisphere = (lat: number) => (lat >= 0 ? 'N' : 'S');

function fmtArea(km2: number): string {
  if (km2 >= 1_000_000) return `${(km2 / 1_000_000).toFixed(1)}M`;
  if (km2 >= 1_000) return `${Math.round(km2 / 1_000)}k`;
  return String(km2);
}

/** Column definitions, in display order. */
export const CLUE_COLUMNS = [
  { key: 'continent', label: 'Continent' },
  { key: 'hemisphere', label: 'Hemi' },
  { key: 'direction', label: 'Dir' },
  { key: 'area', label: 'Area km²' },
  { key: 'borders', label: 'Borders' },
  { key: 'landlocked', label: 'Landlocked' },
] as const;

/** Compute the six clue cells for a guess against the target. */
export function computeClues(guess: Country, target: Country): Record<string, Clue> {
  const out: Record<string, Clue> = {};

  // Continent — green if same region, yellow if same broad landmass, else red.
  out.continent = {
    key: 'continent',
    display: guess.region || '—',
    state: guess.region === target.region ? 'match' : 'far',
  };

  // Hemisphere — north/south match.
  const gh = hemisphere(guess.lat);
  out.hemisphere = {
    key: 'hemisphere',
    display: gh,
    state: gh === hemisphere(target.lat) ? 'match' : 'far',
  };

  // Direction — compass arrow toward the target (informational, always neutral).
  const correct = guess.name === target.name;
  out.direction = {
    key: 'direction',
    display: correct ? '🎯' : compassArrow(bearing(guess.lat, guess.lng, target.lat, target.lng)),
    state: 'info',
  };

  // Area — closeness by ratio + up/down hint.
  const ga = guess.area ?? 0;
  const ta = target.area ?? 0;
  const ratio = ga > 0 && ta > 0 ? Math.max(ga, ta) / Math.min(ga, ta) : Infinity;
  out.area = {
    key: 'area',
    display: fmtArea(ga),
    state: ratio < 1.1 ? 'match' : ratio < 3 ? 'close' : 'far',
    hint: ga === ta ? undefined : ta > ga ? 'up' : 'down',
  };

  // Borders — closeness by count difference + up/down hint.
  const gb = guess.borders ?? 0;
  const tb = target.borders ?? 0;
  const diff = Math.abs(gb - tb);
  out.borders = {
    key: 'borders',
    display: String(gb),
    state: diff === 0 ? 'match' : diff <= 2 ? 'close' : 'far',
    hint: gb === tb ? undefined : tb > gb ? 'up' : 'down',
  };

  // Landlocked — yes/no match.
  const gl = !!guess.landlocked;
  out.landlocked = {
    key: 'landlocked',
    display: gl ? 'Yes' : 'No',
    state: gl === !!target.landlocked ? 'match' : 'far',
  };

  return out;
}
