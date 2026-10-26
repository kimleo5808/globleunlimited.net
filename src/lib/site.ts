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
  legalUpdated: 'October 26, 2026',
  /** Governing law for the Terms of Service. */
  jurisdiction: 'the United States',
  /** Default meta keywords (overridable per page). */
  keywords:
    'globle unlimited, globle, globle game, country guessing game, geography game, mystery country, guess the country, 3d globe game',
  /** Site launch date (ISO). The answer archive starts here and grows forward —
   *  never backfilled before launch, never pre-generating future (spoiler) dates. */
  launchDate: '2026-06-27',
} as const;

/** Every playable mode — single source of truth for the /unlimited hub cards. */
export const GAME_MODES = [
  { href: '/', key: 'globe', name: 'Globle Unlimited', img: '/assets/svg/games/globe.svg', blurb: 'Guess the country on a 3D globe — it glows warmer as you close in.' },
  { href: '/routes/', key: 'routes', name: 'Globle Routes', img: '/assets/svg/games/routes.svg', blurb: 'Connect two countries over land — name every country in between.' },
  { href: '/silhouette/', key: 'shape', name: 'Globle Shapes', img: '/assets/svg/games/worldle.svg', blurb: 'Name the country from its silhouette alone, with distance and direction clues.' },
  { href: '/flags/', key: 'flag', name: 'Globle Flags', img: '/assets/svg/games/flagle.svg', blurb: 'Guess the country from its flag, revealed one tile at a time.' },
  { href: '/clues/', key: 'clue', name: 'Globle Clues', img: '/assets/svg/games/countryle.svg', blurb: 'Deduce the country from six attribute clues — no map required.' },
  { href: '/states/', key: 'usstates', name: 'Globle States', img: '/assets/svg/games/statele.svg', blurb: 'Guess the US state from its outline — all 50 states.' },
  { href: '/higher-or-lower/', key: 'hol', name: 'Higher or Lower', img: '/assets/svg/games/higher-or-lower.svg', blurb: 'Which country has more people? Keep the streak going.' },
  { href: '/map-quiz/', key: 'mapquiz', name: 'Map Quiz', img: '/assets/svg/games/map-quiz.svg', blurb: 'Click every country on the map — the whole world, one continent or the US states.' },
  { href: '/capitals/', key: 'capital', name: 'Globle Capitals', img: '/assets/svg/games/capitals.svg', blurb: 'Find the mystery capital city on the interactive globe.' },
  { href: '/practice/', key: 'practice', name: 'Practice Mode', img: '/assets/svg/games/practice.svg', blurb: 'Relaxed, unlimited rounds with no streak pressure.' },
] as const;

/** The header "Games" menu, grouped so a dozen modes stay scannable. */
export const GAME_MENU = [
  {
    label: 'Globe games',
    links: [
      { href: '/', label: 'Globle Unlimited' },
      { href: '/daily/', label: 'Daily Globle' },
      { href: '/practice/', label: 'Practice Mode' },
      { href: '/capitals/', label: 'Globle Capitals' },
      { href: '/routes/', label: 'Globle Routes' },
    ],
  },
  {
    label: 'Shapes & flags',
    links: [
      { href: '/silhouette/', label: 'Globle Shapes' },
      { href: '/flags/', label: 'Globle Flags' },
      { href: '/clues/', label: 'Globle Clues' },
      { href: '/states/', label: 'Globle States' },
    ],
  },
  {
    label: 'Quizzes',
    links: [
      { href: '/higher-or-lower/', label: 'Higher or Lower' },
      { href: '/map-quiz/', label: 'World Map Quiz' },
      { href: '/map-quiz/us-states/', label: 'US States Map Quiz' },
    ],
  },
  {
    label: 'Continent quizzes',
    links: [
      { href: '/map-quiz/africa/', label: 'Africa Map Quiz' },
      { href: '/map-quiz/asia/', label: 'Asia Map Quiz' },
      { href: '/map-quiz/europe/', label: 'Europe Map Quiz' },
      { href: '/map-quiz/north-america/', label: 'North America Map Quiz' },
      { href: '/map-quiz/south-america/', label: 'South America Map Quiz' },
      { href: '/map-quiz/oceania/', label: 'Oceania Map Quiz' },
    ],
  },
] as const;

export const FOOTER_LINKS = {
  play: [
    { href: '/', label: 'Globle Unlimited' },
    { href: '/daily/', label: 'Daily Globle' },
    { href: '/routes/', label: 'Globle Routes' },
    { href: '/silhouette/', label: 'Globle Shapes' },
    { href: '/flags/', label: 'Globle Flags' },
    { href: '/clues/', label: 'Globle Clues' },
    { href: '/states/', label: 'Globle States' },
    { href: '/practice/', label: 'Practice Mode' },
    { href: '/capitals/', label: 'Globle Capitals' },
    { href: '/higher-or-lower/', label: 'Higher or Lower' },
    { href: '/map-quiz/', label: 'Map Quiz' },
    { href: '/unlimited/', label: 'All Unlimited Games' },
  ],
  learn: [
    { href: '/how-to-play/', label: 'How to Play' },
    { href: '/globle-vs-worldle/', label: 'Globle vs Worldle' },
    { href: '/globle-answer-today/', label: "Today's Answer" },
    { href: '/globle-answer-archive/', label: 'Answer Archive' },
    { href: '/blog/', label: 'Blog' },
  ],
  about: [
    { href: '/about/', label: 'About Us' },
    { href: '/privacy-policy/', label: 'Privacy Policy' },
    { href: '/terms-of-service/', label: 'Terms of Service' },
    { href: '/contact/', label: 'Contact' },
  ],
} as const;

export const DISCLAIMER =
  'Globle Unlimited is an independent, fan-made project and is not affiliated with or endorsed by the official Globle game by Trainwreck Labs.';
