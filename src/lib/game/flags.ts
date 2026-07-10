// Flags dataset for the Flagle-style mode. Same lookup/suggest as countries,
// but the mystery answer is only ever drawn from countries that have a flag
// asset (public/assets/flags/{cca2}.svg — built by scripts/build-flags.mjs).
import type { Country, Dataset } from './types';
import { COUNTRIES, findCountry, suggest } from './countries';

/** Countries that have an ISO alpha-2 code (and therefore a flag SVG). */
export const FLAG_COUNTRIES: Country[] = COUNTRIES.filter((c) => c.cca2);

/** Flag asset URL for a country code. */
export function flagUrl(cca2: string): string {
  return `/assets/flags/${cca2.toLowerCase()}.svg`;
}

export const flagsDataset: Dataset = {
  all: COUNTRIES,
  find: findCountry,
  suggest,
  random: (rng = Math.random) => FLAG_COUNTRIES[Math.floor(rng() * FLAG_COUNTRIES.length)],
};
