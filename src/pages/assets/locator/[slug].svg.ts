// Locator globes as standalone, cacheable SVG files — one revealed and one
// masked per archived day. Inlining these would add ~60 KB to every document.
//
// Slug is either "2026-07-20" (target highlighted) or "2026-07-20-masked"
// (target drawn as ordinary land, so the hero can show it before the reveal).
import type { APIRoute } from 'astro';
import { answerForDate } from '../../../lib/game/daily';
import { locatorSvg } from '../../../lib/game/locator';
import { archiveDates, todayISO } from '../../../lib/game/archive';

export function getStaticPaths() {
  return archiveDates(todayISO()).flatMap((date) => [
    { params: { slug: date } },
    { params: { slug: `${date}-masked` } },
  ]);
}

export const GET: APIRoute = ({ params }) => {
  const slug = params.slug as string;
  const masked = slug.endsWith('-masked');
  const date = masked ? slug.slice(0, -'-masked'.length) : slug;

  return new Response(locatorSvg(answerForDate(date), masked), {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
