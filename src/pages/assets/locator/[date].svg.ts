// Locator globes as standalone, cacheable SVG files — one per archived day.
// Inlining these into the answer pages would add ~60 KB to every document.
import type { APIRoute } from 'astro';
import { answerForDate } from '../../../lib/game/daily';
import { locatorSvg } from '../../../lib/game/locator';
import { archiveDates, todayISO } from '../../../lib/game/archive';

export function getStaticPaths() {
  // Tomorrow is included so the client-side date correction on the answer page
  // still finds a map if a visitor crosses 00:00 UTC on a stale build.
  const dates = archiveDates(todayISO());
  return dates.map((date) => ({ params: { date } }));
}

export const GET: APIRoute = ({ params }) => {
  const date = params.date as string;
  return new Response(locatorSvg(answerForDate(date)), {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
