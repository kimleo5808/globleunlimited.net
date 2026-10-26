// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build
export default defineConfig({
  site: 'https://globleunlimited.net',
  // Pages are served as directories (/daily/) and Cloudflare 308s the bare
  // form. 'always' makes the dev server 404 a link written without the slash,
  // so one that slips in is caught locally instead of costing a redirect live.
  trailingSlash: 'always',
  integrations: [sitemap()],
  build: {
    inlineStylesheets: 'auto',
  },
});
