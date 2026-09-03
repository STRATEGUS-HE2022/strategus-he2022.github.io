# STRATEGUS — STRATEgic GUide to Smart manufacturing

Static website of **STRATEGUS**, a Horizon Europe Marie Skłodowska-Curie Postdoctoral
Fellowship (Global Fellowship, grant agreement 101109243) carried out between the University
of Verona and the University of North Carolina at Chapel Hill.

Live at <https://strategus-he2022.github.io/>.

## Updating the site

Content lives in plain text files. You never edit a template or write code to change what
the site says. Find your task, open the guide, follow it.

| I want to… | Read |
| --- | --- |
| Add news | [docs/news.md](docs/news.md) |
| Add a publication, or find papers missing from the list | [docs/publications.md](docs/publications.md) |
| Edit a team member or a portrait | [docs/team.md](docs/team.md) |
| Change the project description, funding statement, partners, colours | [docs/site-settings.md](docs/site-settings.md) |
| Preview or deploy | [docs/deployment.md](docs/deployment.md) |

The short version of every guide:

```bash
npm ci               # once, after cloning
npm run dev          # http://localhost:4321 — reloads as you save
npm run ci           # before pushing: checks, tests, build, verification
```

Pushing to `main` deploys the site automatically. If something is wrong the build stops
and names the file and the field, for example `news/2026-01-01-x.md → summary: Required`.

Using an AI coding agent? Point it at [AGENTS.md](AGENTS.md).

## How it is built

The site is **completely static**: no database, no server-side code, no cookies, no
third-party request at runtime. Content is Markdown and BibTeX under `src/`, built with
[Astro](https://astro.build) into HTML, CSS, a little JavaScript and optimised images.

Node.js **24** (see `.nvmrc`; anything from 22.12 works) and npm ≥ 9.

| Command | What it does |
| --- | --- |
| `npm ci` | Install the exact dependencies from `package-lock.json` |
| `npm run dev` | Development server on <http://localhost:4321> |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm run check` | Astro + TypeScript checks (templates, schemas, types) |
| `npm test` | Unit tests and content invariants |
| `npm run verify` | Repository hygiene and built-site checks |
| `npm run strip-metadata <file…>` | Remove EXIF/GPS/IPTC/XMP from an image, losslessly |
| `npm run ci` | Everything CI runs, in order |

### Repository structure

```
astro.config.ts            site URL, sitemap, image defaults
src/content.config.ts      schema of every content type, validated at build time
src/data/
  site.ts                  name, mission, funding, partners, links
  publications.bib         the bibliography (BibTeX)
  publications.overrides.yaml   per-entry extras (PDF, code, notes)
src/content/
  home.md                  the project description on the home page
  people/                  one Markdown file per team member (+ portrait next to it)
  news/                    one Markdown file per news item, YYYY-MM-DD-<slug>.md
src/assets/                the mark, the EU emblem, the vendored Inter font
src/pages/                 routes — no content lives here
src/layouts/               HTML shell, inner-page layout, detail layout
src/components/            lists and small building blocks
src/styles/                tokens.css (design tokens) + base.css (global styles)
src/lib/                   plain TypeScript helpers (BibTeX, publications, people)
src/loaders/publications.ts   turns publications.bib into a collection
public/                    copied verbatim: favicon, .nojekyll
scripts/                   verify.mjs (CI quality gate), strip-image-metadata.mjs,
                           suggest-publications.py (maintainer tool, Python, see docs/publications.md)
tests/                     unit tests and content invariants (node --test)
docs/                      the task guides linked above
```

### Routes

| URL | Source |
| --- | --- |
| `/` | `src/pages/index.astro` |
| `/news/`, `/news/<slug>/` | `src/pages/news/` |
| `/publications/`, `/publications.bib` | `src/pages/publications/`, `src/pages/publications.bib.ts` |
| `/team/` (`#<slug>` per person) | `src/pages/team.astro` |
| `/404.html` | `src/pages/404.astro` |
| `/sitemap-index.xml`, `/robots.txt` | generated |

### Design

Plain CSS with custom properties (`src/styles/tokens.css`), self-hosted fonts (Inter, IBM Plex
Serif and Mono; no third-party requests), and an editorial layout built from lists and rules
rather than cards. Deep navy ink with the flame of the mark as the accent, in a **light and a
dark theme**: the site follows the operating system by default and the toggle in the masthead
overrides it. Navigation is plain links and works without JavaScript; the only scripts are the
inline theme switch and an optional text filter on the publications page.

### Provenance

This site replaces the previous Jekyll site of the project. Its structure and design are
adapted from the website of the CISD research groups at the University of Verona
(<https://github.com/esd-univr/esd-univr.github.io>). The content — project description, news,
bibliography, team — was carried over; the third-party libraries, the banner image and the
cookie banner were not. `docs/superpowers/specs/` records the design of the rebuild.

## Licence

Code: MIT (see `LICENSE`). Written content: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Third-party material is listed in `THIRD_PARTY_NOTICES.md`.
