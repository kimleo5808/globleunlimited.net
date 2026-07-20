// Flag rendering.
//
// Flag emoji were the obvious choice and the wrong one: Windows ships no
// regional-indicator glyphs, so a large share of desktop visitors saw "UG"
// and "IE" instead of flags. These are the same SVGs the Flagle mode already
// uses, served from public/assets/flags/{cca2}.svg.
//
// Aspect ratios in the set run from 0.82 (Nepal) to 2.00, so every flag is
// drawn into a fixed box with object-fit: contain — see .flag-img in
// global.css — rather than being stretched to a common shape.

/** Shown for the handful of entries with no ISO alpha-2 code (Kosovo,
 *  N. Cyprus, Somaliland). */
export const FLAG_FALLBACK = '/assets/flags/_unknown.svg';

/** Flag asset URL for a country code, or the neutral placeholder. */
export function flagUrl(cca2: string): string {
  return cca2 ? `/assets/flags/${cca2.toLowerCase()}.svg` : FLAG_FALLBACK;
}

/** Flag as an HTML string, for the game controllers that assemble markup with
 *  innerHTML. Alt is empty on purpose: the country name always sits directly
 *  beside it, so announcing the flag again would be noise. */
export function flagImg(cca2: string, extraClass = ''): string {
  const cls = extraClass ? `flag-img ${extraClass}` : 'flag-img';
  return `<img class="${cls}" src="${flagUrl(cca2)}" alt="" width="28" height="20" loading="lazy" decoding="async">`;
}
