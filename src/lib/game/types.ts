/** Anything guessable on the globe: has a name, flag, coordinates and aliases. */
export interface Guessable {
  name: string;
  cca2: string;
  lat: number;
  lng: number;
  aliases: string[];
}

/** A pluggable set of guessable items (countries or capitals). */
export interface Dataset {
  all: Guessable[];
  find(input: string): Guessable | null;
  suggest(query: string, limit?: number): Guessable[];
  random(rng: () => number): Guessable;
}

export interface Country {
  name: string;
  /** ISO 3166-1 alpha-2 (for flag emoji); '' when unknown. */
  cca2: string;
  lat: number;
  lng: number;
  /** Continent region, e.g. "Asia" (from world-countries); '' when unknown. */
  region?: string;
  /** Subregion, e.g. "Eastern Asia"; '' when unknown. */
  subregion?: string;
  aliases: string[];
}

export interface Guess {
  /** The guessed item (a Country, or a Capital in capitals mode). */
  country: Guessable;
  /** Great-circle distance (km) from guess centroid to target centroid. */
  distanceKm: number;
  /** Heat colour for this guess (#rrggbb). */
  color: string;
  /** True when this guess is the mystery country. */
  correct: boolean;
}

export type GameMode = 'unlimited' | 'daily' | 'practice' | 'capitals';

export interface Capital {
  /** Capital city name. */
  name: string;
  /** Country the capital belongs to. */
  country: string;
  /** ISO 3166-1 alpha-2 of the country (for flag emoji). */
  cca2: string;
  lat: number;
  lng: number;
  aliases: string[];
}
