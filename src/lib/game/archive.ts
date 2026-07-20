// Shared date range for everything that enumerates past answers: the archive
// index, the per-day pages and the locator endpoint. Keeping it in one place
// means those three can never disagree about which days exist.
import { SITE } from '../site';
import { answerForDate, shiftISO } from './daily';
import { obscurityOf } from './analysis';
import { prettyDate } from './hint';
import type { AnswerCard } from '../../components/answer/AnswerCards.astro';

/** Guard against an accidental infinite loop if a date ever goes malformed. */
const MAX_DAYS = 4000;

/** Today in UTC, matching the puzzle's 00:00 UTC rollover. */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Every archived day from launch up to and including `today`, oldest first.
 *
 *  The archive never reaches back before launch (those puzzles never ran) and
 *  never runs ahead of the build date, which would spoil upcoming answers. */
export function archiveDates(today: string = todayISO()): string[] {
  const dates: string[] = [];
  let d = SITE.launchDate as string;
  while (d <= today && dates.length < MAX_DAYS) {
    dates.push(d);
    d = shiftISO(d, 1);
  }
  return dates;
}

/** Dispatch number for a date — its 1-based position in the archive. */
export function dispatchNoFor(date: string): string {
  const dates = archiveDates(date);
  return String(dates.length).padStart(4, '0');
}

/** Turn dates into answer cards, newest first. Shared by the landing page and
 *  the archive so the two grids can never disagree. */
export function cardsFor(dates: string[]): AnswerCard[] {
  return dates
    .map((date) => {
      const c = answerForDate(date);
      return {
        date,
        nice: prettyDate(date),
        name: c.name,
        cca2: c.cca2,
        region: c.region || 'Other',
        difficulty: obscurityOf(c).score,
        dispatch: dispatchNoFor(date),
      };
    })
    .reverse();
}
