// Shared site metadata & navigation config.
export const SITE = {
  name: 'Globle Unlimited',
  domain: 'globleunlimited.net',
  url: 'https://globleunlimited.net',
  tagline: 'Play the endless country-guessing globe game',
  description:
    'Play Globle Unlimited free: guess the mystery country on a 3D globe with unlimited rounds. No daily wait—new game every time.',
  ogImage: '/assets/og-image.png',
  twitter: '@globleunlimited',
  locale: 'en_US',
  email: 'hello@globleunlimited.net',
  /** Effective/last-updated date for legal pages. */
  legalUpdated: 'June 27, 2026',
  /** Governing law for the Terms of Service. */
  jurisdiction: 'the United States',
  /** Default meta keywords (overridable per page). */
  keywords:
    'globle unlimited, globle, globle game, country guessing game, geography game, mystery country, guess the country, 3d globe game',
  /** Site launch date (ISO). The answer archive starts here and grows forward —
   *  never backfilled before launch, never pre-generating future (spoiler) dates. */
  launchDate: '2026-06-27',
} as const;

export const MODES = [
  { href: '/daily', label: 'Daily' },
  { href: '/silhouette', label: 'Worldle' },
  { href: '/flags', label: 'Flags' },
  { href: '/clues', label: 'Clues' },
  { href: '/states', label: 'States' },
  { href: '/practice', label: 'Practice' },
  { href: '/capitals', label: 'Capitals' },
] as const;

/** Every playable mode — single source of truth for the /unlimited hub cards. */
export const GAME_MODES = [
  { href: '/', key: 'globe', name: 'Globle Unlimited', blurb: 'Guess the country on a 3D globe — it glows warmer as you close in.' },
  { href: '/silhouette', key: 'shape', name: 'Worldle Unlimited', blurb: 'Name the country from its silhouette alone, with distance and direction clues.' },
  { href: '/flags', key: 'flag', name: 'Flagle Unlimited', blurb: 'Guess the country from its flag, revealed one tile at a time.' },
  { href: '/clues', key: 'clue', name: 'Countryle Unlimited', blurb: 'Deduce the country from six attribute clues — no map required.' },
  { href: '/states', key: 'usstates', name: 'Statele Unlimited', blurb: 'Guess the US state from its outline — all 50 states.' },
  { href: '/capitals', key: 'capital', name: 'Globle Capitals', blurb: 'Find the mystery capital city on the interactive globe.' },
  { href: '/practice', key: 'practice', name: 'Practice Mode', blurb: 'Relaxed, unlimited rounds with no streak pressure.' },
] as const;

export const FOOTER_LINKS = {
  play: [
    { href: '/', label: 'Globle Unlimited' },
    { href: '/unlimited', label: 'All Unlimited Games' },
    { href: '/daily', label: 'Daily Globle' },
    { href: '/silhouette', label: 'Worldle Unlimited' },
    { href: '/flags', label: 'Flagle Unlimited' },
    { href: '/clues', label: 'Countryle Unlimited' },
    { href: '/states', label: 'Statele Unlimited' },
    { href: '/practice', label: 'Practice Mode' },
    { href: '/capitals', label: 'Globle Capitals' },
  ],
  learn: [
    { href: '/how-to-play', label: 'How to Play' },
    { href: '/globle-vs-worldle', label: 'Globle vs Worldle' },
    { href: '/answer', label: "Today's Answer" },
    { href: '/blog', label: 'Blog' },
  ],
  about: [
    { href: '/about', label: 'About Us' },
    { href: '/privacy-policy', label: 'Privacy Policy' },
    { href: '/terms-of-service', label: 'Terms of Service' },
    { href: '/contact', label: 'Contact' },
  ],
} as const;

export const DISCLAIMER =
  'Globle Unlimited is an independent, fan-made project and is not affiliated with or endorsed by the official Globle game by Trainwreck Labs.';
