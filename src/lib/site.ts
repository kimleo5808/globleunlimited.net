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
} as const;

export const MODES = [
  { href: '/daily', label: 'Daily' },
  { href: '/practice', label: 'Practice' },
  { href: '/capitals', label: 'Capitals' },
] as const;

export const FOOTER_LINKS = {
  play: [
    { href: '/', label: 'Globle Unlimited' },
    { href: '/daily', label: 'Daily Globle' },
    { href: '/practice', label: 'Practice Mode' },
    { href: '/capitals', label: 'Globle Capitals' },
  ],
  learn: [
    { href: '/how-to-play', label: 'How to Play' },
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
