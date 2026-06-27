import type { Country } from './types';

export interface Hint {
  region: string;
  startsWith: string;
  letters: number;
  hemisphere: 'Northern' | 'Southern';
}

/** Progressive hints for a mystery country — revealed before the answer. */
export function hintFor(c: Country): Hint {
  return {
    region: c.region || 'Unknown',
    startsWith: c.name[0].toUpperCase(),
    letters: c.name.replace(/[^A-Za-z]/g, '').length,
    hemisphere: c.lat >= 0 ? 'Northern' : 'Southern',
  };
}

/** Pretty US-locale date, e.g. "June 27, 2026". */
export function prettyDate(dateISO: string): string {
  return new Date(dateISO + 'T00:00:00Z').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
