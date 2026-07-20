// Minimal ambient types for the parts of d3-geo the locator map uses.
// d3-geo ships no type definitions and @types/d3-geo is not installed; this is
// build-time-only code, so a narrow local declaration is enough.
declare module 'd3-geo' {
  interface GeoProjection {
    rotate(angles: [number, number, number]): GeoProjection;
    scale(s: number): GeoProjection;
    translate(t: [number, number]): GeoProjection;
    clipAngle(a: number): GeoProjection;
  }

  interface GeoPath {
    (object: unknown): string | null;
  }

  export function geoOrthographic(): GeoProjection;
  export function geoPath(projection?: GeoProjection): GeoPath;
  export function geoGraticule10(): unknown;
}
