import type { Country, Guess, GameMode } from './types';
import { COUNTRIES, findCountry, randomCountry, normalize } from './countries';
import { haversine } from './distance';
import { heatColor } from './color';
import { mulberry32, dateSeed } from './daily';

export { dateSeed };

export type GuessOutcome =
  | { status: 'invalid' }
  | { status: 'duplicate'; guess: Guess }
  | { status: 'ok'; guess: Guess; won: boolean };

export class GameEngine {
  readonly mode: GameMode;
  target!: Country;
  guesses: Guess[] = [];
  won = false;

  private rng: () => number;

  constructor(mode: GameMode = 'unlimited', seed?: number) {
    this.mode = mode;
    this.rng = seed === undefined ? Math.random : mulberry32(seed);
    this.pickTarget();
  }

  private pickTarget() {
    this.target = randomCountry(this.rng);
    this.guesses = [];
    this.won = false;
  }

  /** Start a fresh round (Unlimited "Play Again"). */
  reset() {
    // For unlimited/practice keep rolling random; daily stays fixed (re-seed handled by caller).
    this.pickTarget();
  }

  /** True if this country has already been guessed. */
  private alreadyGuessed(c: Country): boolean {
    return this.guesses.some((g) => g.country.name === c.name);
  }

  /** Submit a typed guess. */
  guess(input: string): GuessOutcome {
    if (this.won) return { status: 'invalid' };
    const country = findCountry(input);
    if (!country) return { status: 'invalid' };

    const distanceKm = haversine(country.lat, country.lng, this.target.lat, this.target.lng);
    const correct = country.name === this.target.name;
    const guess: Guess = {
      country,
      distanceKm,
      color: heatColor(distanceKm),
      correct,
    };

    if (this.alreadyGuessed(country)) return { status: 'duplicate', guess };

    this.guesses.push(guess);
    if (correct) this.won = true;
    return { status: 'ok', guess, won: correct };
  }

  /** Closest guessed country so far (by distance). */
  get closest(): Guess | null {
    if (!this.guesses.length) return null;
    return this.guesses.reduce((a, b) => (b.distanceKm < a.distanceKm ? b : a));
  }

  get guessCount(): number {
    return this.guesses.length;
  }
}

export { COUNTRIES, normalize };
