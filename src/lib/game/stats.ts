// Persistent player stats via localStorage. Per-mode tracking + daily lock.
import type { GameMode } from './types';

export interface ModeStats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  /** Fewest guesses to a win (lower is better). */
  bestGuesses: number | null;
  /** Histogram: guesses -> count (capped bucket "7+"). */
  distribution: Record<string, number>;
}

export interface DailyRecord {
  /** ISO date "YYYY-MM-DD" of the last completed daily. */
  date: string;
  guesses: number;
  country: string;
}

const KEY = (mode: GameMode) => `globle:stats:${mode}`;
const DAILY_KEY = 'globle:daily';

const empty = (): ModeStats => ({
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  bestGuesses: null,
  distribution: {},
});

const hasLS = () => typeof localStorage !== 'undefined';

export function getStats(mode: GameMode): ModeStats {
  if (!hasLS()) return empty();
  try {
    const raw = localStorage.getItem(KEY(mode));
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch {
    return empty();
  }
}

function save(mode: GameMode, s: ModeStats) {
  if (!hasLS()) return;
  try {
    localStorage.setItem(KEY(mode), JSON.stringify(s));
  } catch {
    /* quota / private mode — ignore */
  }
}

/** Record a win. Returns updated stats. Streaks count only for daily mode.
 *  Pass resetStreak=true when the previous daily was NOT yesterday. */
export function recordWin(mode: GameMode, guesses: number, resetStreak = false): ModeStats {
  const s = getStats(mode);
  s.played += 1;
  s.wins += 1;
  if (mode === 'daily') {
    if (resetStreak) s.currentStreak = 0;
    s.currentStreak += 1;
    s.maxStreak = Math.max(s.maxStreak, s.currentStreak);
  }
  s.bestGuesses = s.bestGuesses === null ? guesses : Math.min(s.bestGuesses, guesses);
  const bucket = guesses >= 7 ? '7+' : String(guesses);
  s.distribution[bucket] = (s.distribution[bucket] ?? 0) + 1;
  save(mode, s);
  return s;
}

// ---- Daily lock ----
export function getDaily(): DailyRecord | null {
  if (!hasLS()) return null;
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    return raw ? (JSON.parse(raw) as DailyRecord) : null;
  } catch {
    return null;
  }
}

export function isDailyDone(todayISO: string): boolean {
  return getDaily()?.date === todayISO;
}

export function setDailyDone(rec: DailyRecord) {
  if (!hasLS()) return;
  try {
    const prev = getDaily();
    // Break streak if the player skipped a day before today.
    localStorage.setItem(DAILY_KEY, JSON.stringify(rec));
    void prev;
  } catch {
    /* ignore */
  }
}

/** Today's date in UTC as ISO "YYYY-MM-DD" (daily answer is UTC-synced). */
export function todayISO(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** True if isoA is exactly one day before isoB. */
export function isYesterday(isoA: string, isoB: string): boolean {
  const a = Date.parse(isoA + 'T00:00:00Z');
  const b = Date.parse(isoB + 'T00:00:00Z');
  return b - a === 86400000;
}
