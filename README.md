# Globle Unlimited

The endless country-guessing globe game. Guess the mystery country on a real 3D globe with
unlimited rounds — no daily wait.

Live site: **https://globleunlimited.net**

Built with [Astro](https://astro.build) + [globe.gl](https://globe.gl) (Three.js / WebGL).
Deployed on Cloudflare Pages via GitHub.

---

## Tech stack

- **Astro 5** — static site, zero-JS content pages (great Core Web Vitals)
- **globe.gl / three** — interactive 3D globe (NASA Blue Marble imagery), hydrated only on game pages
- **TypeScript** — game logic (distance, heat colour, matching, engine) in `src/lib/game/`
- **Content Collections** — blog in `src/content/blog/`
- Self-hosted fonts (Fraunces, Hanken Grotesk, Space Mono) via `@fontsource`

## Project structure

```
src/
├─ components/        Header, Footer, game/ (GlobeGame island + controller)
├─ layouts/           BaseLayout (SEO head, OG, JSON-LD)
├─ lib/
│  ├─ site.ts         site metadata, nav, contact email, legal config
│  └─ game/           distance, color, countries, engine, daily, stats, hint
├─ pages/             routes (index, daily, practice, capitals, stats,
│                     how-to-play, answer/, blog/, about, privacy, terms, contact, 404)
├─ content/blog/      markdown articles
├─ data/countries.json
└─ styles/            tokens.css (design system), global.css
public/
├─ assets/svg/        logo, heat-scale, how-to-play, og-image
├─ assets/og-image.png    social share image (1200x630)
├─ assets/textures/   NASA earth-blue-marble.jpg, earth-topology.png
└─ assets/data/world.geo.json   country polygons for the globe
scripts/              one-time data/asset generators (see below)
```

## Local development

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # outputs to dist/
npm run preview    # serve the production build
npm run check      # astro type check
```

## Regenerating data & assets (rarely needed)

These produce committed files, so you only re-run them when the source data changes:

```bash
npm run build:data   # src/data/countries.json + public/assets/data/world.geo.json
npm run build:maps   # assets/svg/how-to-play.svg + og-image.svg (real Natural Earth borders)
```

> The OG PNG is rendered from `og-image.svg` with `@resvg/resvg-js` (dev-only, one-time).

## Deployment — GitHub + Cloudflare Pages

1. Push this repo to GitHub.
2. In the Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**, pick the repo.
3. Build settings:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Environment variable:** `NODE_VERSION = 22` (also pinned in `.node-version`)
4. Deploy. Add the custom domain **globleunlimited.net** under the Pages project → Custom domains.
5. Every push to the default branch auto-builds and deploys.

## Analytics & ads

- **Cloudflare Web Analytics:** enable it on the Pages project (privacy-friendly, no code change needed),
  or paste the beacon snippet into `BaseLayout.astro` if you prefer the JS version.
- **Google AdSense:** add the AdSense script to `BaseLayout.astro` `<head>` when approved.
  The Privacy Policy already covers AdSense cookies and opt-outs.

## Attribution

- Country borders: [Natural Earth](https://www.naturalearthdata.com/) (public domain)
- Globe imagery: [NASA Visible Earth / Blue Marble](https://visibleearth.nasa.gov/) (public domain)

Globle Unlimited is an independent, fan-made project and is not affiliated with or endorsed by the
official Globle game by Trainwreck Labs.
