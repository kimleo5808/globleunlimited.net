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

/** Record a round that ran out of guesses (the capped modes). Without this,
 *  played always equalled wins and every win rate read 100%. */
export function recordLoss(mode: GameMode): ModeStats {
  const s = getStats(mode);
  s.played += 1;
  save(mode, s);
  return s;
}

/** Record one run of a streak game (Higher or Lower): played counts runs,
 *  wins counts correct answers, maxStreak keeps the longest run. */
export function recordStreakRun(mode: GameMode, streak: number): ModeStats {
  const s = getStats(mode);
  s.played += 1;
  s.wins += streak;
  s.maxStreak = Math.max(s.maxStreak, streak);
  save(mode, s);
  return s;
}

// ---- Map Quiz: best result per region ----
export interface MapQuizBest {
  plays: number;
  /** Best share of countries found on the first try, 0–100. */
  accuracy: number;
  /** Time of that best run, in seconds. */
  seconds: number;
}
const MAP_QUIZ_KEY = 'globle:mapquiz';

export function getMapQuizBests(): Record<string, MapQuizBest> {
  if (!hasLS()) return {};
  try {
    return JSON.parse(localStorage.getItem(MAP_QUIZ_KEY) ?? '{}');
  } catch {
    return {};
  }
}

/** Record a finished quiz. Higher accuracy wins; a tie goes to the faster run. */
export function recordMapQuiz(region: string, accuracy: number, seconds: number): MapQuizBest {
  const all = getMapQuizBests();
  const prev = all[region];
  const better = !prev || accuracy > prev.accuracy || (accuracy === prev.accuracy && seconds < prev.seconds);
  const next = better ? { plays: (prev?.plays ?? 0) + 1, accuracy, seconds } : { ...prev, plays: prev.plays + 1 };
  all[region] = next;
  if (hasLS()) {
    try { localStorage.setItem(MAP_QUIZ_KEY, JSON.stringify(all)); } catch { /* quota / private mode */ }
  }
  return next;
}

/** Win rate as a whole percentage, or null before the first round. */
export function winRate(s: ModeStats): number | null {
  return s.played ? Math.round((s.wins / s.played) * 100) : null;
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
    localStorage.setItem(DAILY_KEY, JSON.stringify(rec));
  } catch {
    /* ignore */
  }
}

/** The daily streak as it stands today. The stored figure only resets on the
 *  next win, so a player who skipped a day would otherwise still see the old
 *  streak until they played again. */
export function currentDailyStreak(today: string): number {
  const last = getDaily()?.date;
  if (!last || (last !== today && !isYesterday(last, today))) return 0;
  return getStats('daily').currentStreak;
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
