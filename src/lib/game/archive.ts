// Shared date range for everything that enumerates past answers: the archive
// index, the per-day pages and the locator endpoint. Keeping it in one place
// means those three can never disagree about which days exist.
import { SITE } from '../site';
import { shiftISO } from './daily';

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
