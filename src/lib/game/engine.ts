import type { Guessable, Dataset, Guess, GameMode } from './types';
import { COUNTRIES, countriesDataset, normalize } from './countries';
import { haversine } from './distance';
import { heatColor, WIN_COLOR } from './color';
import { mulberry32, dateSeed } from './daily';

export { dateSeed };

export type GuessOutcome =
  | { status: 'invalid' }
  | { status: 'duplicate'; guess: Guess }
  | { status: 'ok'; guess: Guess; won: boolean };

export class GameEngine {
  readonly mode: GameMode;
  target!: Guessable;
  guesses: Guess[] = [];
  won = false;

  private rng: () => number;
  private dataset: Dataset;
  /** Distance (km) between a guess and the target. Defaults to centroid haversine;
   *  countries mode injects a border-to-border distance for fidelity. */
  private distanceFn: (a: Guessable, b: Guessable) => number;

  constructor(
    mode: GameMode = 'unlimited',
    seed?: number,
    dataset: Dataset = countriesDataset,
    distanceFn?: (a: Guessable, b: Guessable) => number,
  ) {
    this.mode = mode;
    this.dataset = dataset;
    this.distanceFn = distanceFn ?? ((a, b) => haversine(a.lat, a.lng, b.lat, b.lng));
    this.rng = seed === undefined ? Math.random : mulberry32(seed);
    this.pickTarget();
  }

  private pickTarget() {
    this.target = this.dataset.random(this.rng);
    this.guesses = [];
    this.won = false;
  }

  /** Start a fresh round (Unlimited "Play Again"). */
  reset() {
    // For unlimited/practice keep rolling random; daily stays fixed (re-seed handled by caller).
    this.pickTarget();
  }

  /** True if this item has already been guessed. */
  private alreadyGuessed(c: Guessable): boolean {
    return this.guesses.some((g) => g.country.name === c.name);
  }

  /** Submit a typed guess. */
  guess(input: string): GuessOutcome {
    if (this.won) return { status: 'invalid' };
    const country = this.dataset.find(input);
    if (!country) return { status: 'invalid' };

    const distanceKm = this.distanceFn(country, this.target);
    const correct = country.name === this.target.name;
    const guess: Guess = {
      country,
      distanceKm,
      color: correct ? WIN_COLOR : heatColor(distanceKm),
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
