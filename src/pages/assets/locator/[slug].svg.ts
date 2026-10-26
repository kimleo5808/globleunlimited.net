// Locator globes for today's answer page as standalone, cacheable SVG files —
// one revealed and one masked. Inlining these would add ~60 KB to the document.
//
// Slug is either "2026-07-20" (target highlighted) or "2026-07-20-masked"
// (target drawn as ordinary land, so the hero can show it before the reveal).
// Only today's pair is built: the per-day archive pages that used older pairs
// were folded into the archive index.
import type { APIRoute } from 'astro';
import { answerForDate, dateSeed } from '../../../lib/game/daily';
import { locatorSvg } from '../../../lib/game/locator';
import { todayISO } from '../../../lib/game/archive';

export function getStaticPaths() {
  const date = todayISO();
  return [{ params: { slug: date } }, { params: { slug: `${date}-masked` } }];
}

export const GET: APIRoute = ({ params }) => {
  const slug = params.slug as string;
  const masked = slug.endsWith('-masked');
  const date = masked ? slug.slice(0, -'-masked'.length) : slug;

  return new Response(locatorSvg(answerForDate(date), masked, dateSeed(date)), {
    headers: { 'Content-Type': 'image/svg+xml' },
  });
};
