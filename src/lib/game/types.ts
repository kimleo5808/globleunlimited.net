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
  /** Land area in km² (from world-countries); 0 when unknown. */
  area?: number;
  /** Number of bordering countries; 0 for islands / unknown. */
  borders?: number;
  /** True if the country has no coastline. */
  landlocked?: boolean;
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
  /** Great-circle bearing (deg, 0 = N) from this guess toward the target.
   *  Set by clue-based modes (silhouette); undefined elsewhere. */
  bearing?: number;
  /** Closeness as a 0–100 % score. Set by clue-based modes; undefined elsewhere. */
  proximity?: number;
}

export type GameMode = 'unlimited' | 'daily' | 'practice' | 'capitals' | 'silhouette' | 'flags' | 'clues' | 'states';

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
