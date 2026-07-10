// Direction + proximity clues for the silhouette / states / flags modes.
// A guess reports: how far (distance, from haversine), which way (compass arrow),
// and how close (proximity %). Distance itself lives in distance.ts.

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Initial great-circle bearing in degrees (0–360, 0 = north) from A to B. */
export function bearing(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const φ1 = toRad(aLat);
  const φ2 = toRad(bLat);
  const Δλ = toRad(bLng - aLng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

const ARROWS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'] as const;
const NAMES = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'] as const;

/** Nearest 8-point compass index (0 = N, clockwise) for a bearing in degrees. */
function octant(deg: number): number {
  return Math.round(deg / 45) % 8;
}

/** Compass arrow (↑ ↗ → …) pointing from the guess toward the target. */
export function compassArrow(bearingDeg: number): string {
  return ARROWS[octant(bearingDeg)];
}

/** Spoken compass name (for aria-live) — e.g. "northeast". */
export function compassName(bearingDeg: number): string {
  return NAMES[octant(bearingDeg)];
}

/** Farthest two points on Earth are ~20,000 km apart (half the circumference). */
export const MAX_PROXIMITY_KM = 20000;

/** Closeness as a 0–100 % score. 100 % = the correct answer, 0 % = maxKm apart.
 *  maxKm defaults to half Earth's circumference; pass a smaller value for a
 *  regional board (e.g. US states) so proximity spreads across a useful range. */
export function proximityPct(distanceKm: number, maxKm: number = MAX_PROXIMITY_KM): number {
  const clamped = Math.max(0, Math.min(maxKm, distanceKm));
  return Math.round((1 - clamped / maxKm) * 100);
}
