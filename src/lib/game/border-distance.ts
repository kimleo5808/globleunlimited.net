// The distance the country modes actually score with: nearest border point to
// nearest border point, so neighbours read as (near) 0 km the way they do in
// the official Globle. Shared by the globe game (built from the fetched
// GeoJSON) and the build-time answer analysis (built from the same file), so a
// number printed on an answer page is the number a player would see.
import type { Guessable } from './types';
import { haversine } from './distance';

/** Pairs whose borders are certainly further apart than this skip the border
 *  pass and read centre to centre: the difference is a small share of the
 *  reading and does not move the colour. */
export const FAR_KM = 3500;

interface Outline {
  /** Boundary points, flattened [lat, lng, lat, lng, …]. */
  points: Float64Array;
  /** Furthest boundary point from the country's centre (km); computed on first use. */
  reach?: number;
}

/** Boundary outline per country name. */
export type BorderIndex = Map<string, Outline>;

interface Feature {
  properties: { name: string };
  geometry: { type: string; coordinates: any };
}

/** Flatten a GeoJSON geometry to [lat,lng,...], downsampled to ~400 points. */
export function flattenGeometry(geom: Feature['geometry']): Float64Array {
  const pts: number[] = [];
  const polys = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates];
  for (const poly of polys) {
    for (const ring of poly) {
      for (const [lng, lat] of ring) pts.push(lat, lng);
    }
  }
  const maxPts = 400;
  const total = pts.length / 2;
  if (total <= maxPts) return Float64Array.from(pts);
  const stride = Math.ceil(total / maxPts);
  const out: number[] = [];
  for (let i = 0; i < total; i += stride) out.push(pts[i * 2], pts[i * 2 + 1]);
  return Float64Array.from(out);
}

/** Index every feature's boundary by country name. */
export function buildBorderIndex(features: Feature[]): BorderIndex {
  const index: BorderIndex = new Map();
  for (const f of features) index.set(f.properties.name, { points: flattenGeometry(f.geometry) });
  return index;
}

function reachKm(outline: Outline, centre: Guessable): number {
  if (outline.reach === undefined) {
    const p = outline.points;
    let max = 0;
    for (let i = 0; i < p.length; i += 2) max = Math.max(max, haversine(centre.lat, centre.lng, p[i], p[i + 1]));
    outline.reach = max;
  }
  return outline.reach;
}

/** Border-to-border distance (km) between two countries; falls back to the
 *  centroid distance when they are far apart or either outline is missing. */
export function borderDistanceKm(index: BorderIndex, a: Guessable, b: Guessable): number {
  const c = haversine(a.lat, a.lng, b.lat, b.lng);
  const oa = index.get(a.name);
  const ob = index.get(b.name);
  if (!oa || !ob) return c;
  // No two border points can be closer than the centre distance minus how far
  // each outline reaches from its centre. Only when even that bound is past
  // FAR_KM is the border pass safe to skip. Comparing the centre distance alone
  // made Russia's western neighbours read 3,500–4,300 km against it, because
  // its centre is in Siberia.
  if (c - reachKm(oa, a) - reachKm(ob, b) > FAR_KM) return c;
  const pa = oa.points;
  const pb = ob.points;
  let min = c;
  for (let i = 0; i < pa.length; i += 2) {
    const la = pa[i], lo = pa[i + 1];
    for (let j = 0; j < pb.length; j += 2) {
      const d = haversine(la, lo, pb[j], pb[j + 1]);
      if (d < min) {
        min = d;
        if (min < 10) return min;
      }
    }
  }
  return min;
}
