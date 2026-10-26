// Route logic for Globle Routes: the land network, dealing a route, judging a
// guess, and the cheapest way to finish a half-built chain. The network itself
// is built by scripts/build-routes.mjs.
import data from '../../data/routes.json';
import { COUNTRIES } from './countries';

export type RouteRegion = 'World' | 'Europe' | 'Africa' | 'Asia' | 'Americas';
export type RouteLength = 'short' | 'medium' | 'long';

export const ROUTE_REGIONS: RouteRegion[] = ['World', 'Europe', 'Africa', 'Asia', 'Americas'];

/** Countries between start and finish, inclusive range, per length. */
export const ROUTE_LENGTHS: Record<RouteLength, [number, number]> = {
  short: [2, 3],
  medium: [4, 5],
  long: [6, 8],
};

/** Extra guesses allowed beyond par before the round is lost. */
export const SPARE_GUESSES = 5;

const LINKS = data.links as Record<string, string[]>;
export const CROSSINGS = data.crossings as Array<[string, string, string]>;

type Graph = Map<string, string[]>;
const graphs = new Map<RouteRegion, Graph>();

/** The network restricted to one region, so a European route never detours
 *  through Asia. 'World' is the whole network. */
export function graphFor(region: RouteRegion): Graph {
  let g = graphs.get(region);
  if (g) return g;
  const inRegion = new Set(
    COUNTRIES.filter((c) => region === 'World' || c.region === region).map((c) => c.name),
  );
  g = new Map();
  for (const [name, next] of Object.entries(LINKS)) {
    if (!inRegion.has(name)) continue;
    const kept = next.filter((n) => inRegion.has(n));
    if (kept.length) g.set(name, kept);
  }
  graphs.set(region, g);
  return g;
}

/** True when the country has at least one land link anywhere. */
export const hasLandRoute = (name: string) => name in LINKS;

/** Hop counts from `from` to every reachable country. */
export function hops(graph: Graph, from: string): Map<string, number> {
  const d = new Map([[from, 0]]);
  const q = [from];
  for (let i = 0; i < q.length; i++) {
    const x = q[i];
    for (const y of graph.get(x) ?? []) {
      if (!d.has(y)) {
        d.set(y, d.get(x)! + 1);
        q.push(y);
      }
    }
  }
  return d;
}

export interface Route {
  start: string;
  end: string;
  region: RouteRegion;
  /** Countries on the shortest route between start and finish. */
  par: number;
  graph: Graph;
  fromStart: Map<string, number>;
  fromEnd: Map<string, number>;
}

/** Deal a random route whose shortest path crosses a number of countries in
 *  the length's range. Returns null when the region has no such route. */
export function dealRoute(rng: () => number, length: RouteLength, region: RouteRegion): Route | null {
  const graph = graphFor(region);
  const nodes = [...graph.keys()];
  const [lo, hi] = ROUTE_LENGTHS[length];
  for (let attempt = 0; attempt < 300; attempt++) {
    const start = nodes[Math.floor(rng() * nodes.length)];
    const fromStart = hops(graph, start);
    const ends = [...fromStart].filter(([, d]) => d - 1 >= lo && d - 1 <= hi).map(([n]) => n);
    if (!ends.length) continue;
    const end = ends[Math.floor(rng() * ends.length)];
    return { start, end, region, par: fromStart.get(end)! - 1, graph, fromStart, fromEnd: hops(graph, end) };
  }
  return null;
}

export type Verdict = 'on' | 'near' | 'off' | 'island' | 'outside';

/** Judge a guess: on a shortest route, bordering one ("near"), or no help. */
export function verdictFor(route: Route, name: string): { verdict: Verdict; via?: string } {
  if (!route.graph.has(name)) return { verdict: hasLandRoute(name) ? 'outside' : 'island' };
  const length = route.par + 1;
  const onShortest = (n: string) => (route.fromStart.get(n) ?? Infinity) + (route.fromEnd.get(n) ?? Infinity) === length;
  if (onShortest(name)) return { verdict: 'on' };
  const via = (route.graph.get(name) ?? []).find(onShortest);
  return via ? { verdict: 'near', via } : { verdict: 'off' };
}

/** The cheapest way to finish the chain: a 0-1 search where passing through a
 *  country already named costs nothing and any other country costs one.
 *  `toGo` is how many more countries are needed; `path` runs start → finish. */
export function completion(route: Route, named: Set<string>): { toGo: number; path: string[] } {
  const free = (n: string) => n === route.end || named.has(n);
  const cost = new Map([[route.start, 0]]);
  const prev = new Map<string, string>();
  const deque = [route.start];
  while (deque.length) {
    const x = deque.shift()!;
    if (x === route.end) break;
    for (const y of route.graph.get(x) ?? []) {
      const c = cost.get(x)! + (free(y) ? 0 : 1);
      if (c < (cost.get(y) ?? Infinity)) {
        cost.set(y, c);
        prev.set(y, x);
        if (free(y)) deque.unshift(y);
        else deque.push(y);
      }
    }
  }
  const path: string[] = [];
  for (let n: string | undefined = route.end; n; n = prev.get(n)) path.unshift(n);
  return { toGo: cost.get(route.end) ?? Infinity, path };
}

/** Whether a region has any route of the given length (greys out empty chips). */
export function lengthAvailable(region: RouteRegion, length: RouteLength): boolean {
  const graph = graphFor(region);
  const [lo, hi] = ROUTE_LENGTHS[length];
  for (const start of graph.keys()) {
    for (const d of hops(graph, start).values()) if (d - 1 >= lo && d - 1 <= hi) return true;
  }
  return false;
}
