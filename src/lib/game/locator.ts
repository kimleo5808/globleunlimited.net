// Build-time locator globe for a single country.
//
// Renders an orthographic projection rotated so the answer country sits at the
// centre of the visible hemisphere — the same view a player would end up with
// after solving the round. d3-geo is a devDependency and this module is only
// ever imported from .astro frontmatter, so none of it reaches the browser.
import { geoOrthographic, geoPath, geoGraticule10 } from 'd3-geo';
import type { Country } from './types';
import world from '../../../public/assets/data/world.geo.json';

interface WorldFeature {
  type: string;
  properties: { name: string; cca2: string };
  geometry: unknown;
}

const FEATURES = (world as { features: WorldFeature[] }).features;

export interface Locator {
  /** Viewport edge length; the map is square. */
  size: number;
  /** Ocean disc outline. */
  sphere: string;
  /** 10-degree graticule. */
  graticule: string;
  /** Every landmass except the target, as one combined path. */
  land: string;
  /** The target country, drawn on top. */
  target: string;
  /** Every landmass including the target, as one path. Used by the masked
   *  variant: drawing land and target as two translucent layers would stack
   *  their opacity and outline the answer. */
  landAll: string;
}

const SIZE = 480;
const PADDING = 8;

/** Path data comes out of d3-geo with ~6 decimal places, which is far more
 *  precision than a 480px viewport can show. Rounding to whole units cuts the
 *  world outline by roughly half with no visible difference. */
function round(d: string | null): string {
  return (d ?? '').replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n))));
}

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** The point `distDeg` degrees of arc from (lat, lng) along `bearingDeg`. */
function destination(lat: number, lng: number, bearingDeg: number, distDeg: number) {
  const φ1 = toRad(lat);
  const λ1 = toRad(lng);
  const θ = toRad(bearingDeg);
  const δ = toRad(distDeg);
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 = λ1 + Math.atan2(
    Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
    Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
  );
  return { lat: toDeg(φ2), lng: ((toDeg(λ2) + 540) % 360) - 180 };
}

/** View centre for the masked globe. Centring it on the answer would point
 *  straight at the country, so the view is pushed 30–50° of arc away in a
 *  seeded direction: the answer stays on the visible face, but not where the
 *  eye lands first. */
function maskedCentre(country: Country, seed: number) {
  const bearingDeg = seed % 360;
  const distDeg = 30 + ((seed >>> 9) % 21);
  return destination(country.lat, country.lng, bearingDeg, distDeg);
}

/** Orthographic locator centred on `centre` (defaults to the country itself). */
export function locatorFor(country: Country, centre: { lat: number; lng: number } = country): Locator {
  const projection = geoOrthographic()
    .rotate([-centre.lng, -centre.lat, 0])
    .scale(SIZE / 2 - PADDING)
    .translate([SIZE / 2, SIZE / 2])
    .clipAngle(90);

  const path = geoPath(projection);

  const targetFeature = FEATURES.find(
    (f) => f.properties.cca2 === country.cca2 || f.properties.name === country.name,
  );

  const others = FEATURES.filter((f) => f !== targetFeature);

  return {
    size: SIZE,
    sphere: round(path({ type: 'Sphere' })),
    graticule: round(path(geoGraticule10())),
    land: round(path({ type: 'FeatureCollection', features: others })),
    target: targetFeature ? round(path(targetFeature)) : '',
    landAll: round(path({ type: 'FeatureCollection', features: FEATURES })),
  };
}

/** Standalone SVG document for the locator, served as its own cacheable file
 *  so the answer pages stay light. Colours are the shared globe tokens, which
 *  are identical in both themes.
 *
 *  `masked` draws the target in the same parchment as every other landmass and
 *  turns the globe off-centre (see maskedCentre), so the hero can show it
 *  before the answer is revealed without giving it away. `seed` picks the
 *  off-centre direction. */
export function locatorSvg(country: Country, masked = false, seed = 0): string {
  if (masked) {
    const l = locatorFor(country, maskedCentre(country, seed));
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${l.size}" height="${l.size}" viewBox="0 0 ${l.size} ${l.size}" role="img" aria-label="Globe turned to the hemisphere containing today's mystery country, which is not highlighted">
<circle cx="${l.size / 2}" cy="${l.size / 2}" r="${l.size / 2 - PADDING}" fill="#1E5F8C"/>
<path d="${l.graticule}" fill="none" stroke="#F4C95D" stroke-opacity="0.16" stroke-width="0.6"/>
<path d="${l.landAll}" fill="#E8D9B5" fill-opacity="0.55"/>
<circle cx="${l.size / 2}" cy="${l.size / 2}" r="${l.size / 2 - PADDING}" fill="none" stroke="#F4C95D" stroke-opacity="0.45"/>
</svg>`;
  }
  // Explicit width/height give the file an intrinsic size, so the browser can
  // reserve the right box before it loads instead of assuming 150x150.
  const l = locatorFor(country);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${l.size}" height="${l.size}" viewBox="0 0 ${l.size} ${l.size}" role="img" aria-label="Globe centred on ${country.name}, shown in red against the rest of the world">
<circle cx="${l.size / 2}" cy="${l.size / 2}" r="${l.size / 2 - PADDING}" fill="#1E5F8C"/>
<path d="${l.graticule}" fill="none" stroke="#F4C95D" stroke-opacity="0.16" stroke-width="0.6"/>
<path d="${l.land}" fill="#E8D9B5" fill-opacity="0.55"/>
<path d="${l.target}" fill="#C42D1C" stroke="#F4C95D" stroke-width="1.5" stroke-linejoin="round"/>
<circle cx="${l.size / 2}" cy="${l.size / 2}" r="${l.size / 2 - PADDING}" fill="none" stroke="#F4C95D" stroke-opacity="0.45"/>
</svg>`;
}
