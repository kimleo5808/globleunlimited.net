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
  country: Country;
  /** Great-circle distance (km) from guess centroid to target centroid. */
  distanceKm: number;
  /** Heat colour for this guess (#rrggbb). */
  color: string;
  /** True when this guess is the mystery country. */
  correct: boolean;
}

export type GameMode = 'unlimited' | 'daily' | 'practice';
