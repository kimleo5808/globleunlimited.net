// Distance -> heat colour. Near = hot (deep red), far = cold (pale yellow).
// Mirrors --heat-* tokens in src/styles/tokens.css.

/** Beyond this distance (km) a guess is shown as the coldest colour. */
export const MAX_DISTANCE_KM = 12000;

export const WIN_COLOR = '#2E9E4F';

// Ordered NEAR -> FAR.
const STOPS: Array<[number, number, number]> = [
  [0x8b, 0x00, 0x00], // heat-4 nearest
  [0xc4, 0x2d, 0x1c], // heat-3
  [0xe8, 0x74, 0x3b], // heat-2
  [0xfe, 0xb2, 0x4c], // heat-1
  [0xff, 0xed, 0xa0], // heat-0 farthest
];

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const hex2 = (n: number) => Math.round(n).toString(16).padStart(2, '0');

/** Interpolated heat colour (#rrggbb) for a distance in km. */
export function heatColor(distanceKm: number): string {
  if (distanceKm <= 0) return WIN_COLOR;
  const t = clamp01(distanceKm / MAX_DISTANCE_KM);
  const span = STOPS.length - 1;
  const pos = t * span;
  const i = Math.min(span - 1, Math.floor(pos));
  const f = pos - i;
  const [r1, g1, b1] = STOPS[i];
  const [r2, g2, b2] = STOPS[i + 1];
  return `#${hex2(r1 + (r2 - r1) * f)}${hex2(g1 + (g2 - g1) * f)}${hex2(b1 + (b2 - b1) * f)}`;
}
