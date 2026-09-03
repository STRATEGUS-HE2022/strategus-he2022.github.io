// Astro configuration for the STRATEGUS project website (static, GitHub Pages).
// See README.md for the project overview and docs/deployment.md for build and deployment.
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Organisation Pages repository (strategus-he2022.github.io) => served at the domain root.
  site: 'https://strategus-he2022.github.io',
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    // One folder per page (news/index.html) so every URL ends with a slash.
    format: 'directory',
  },
  image: {
    // Responsive <Image> output by default (srcset + sizes) with cropping to the box.
    layout: 'constrained',
    responsiveStyles: true,
  },
  integrations: [sitemap()],
});
