# AGENTS.md — instructions for coding agents

Authoritative rules for any AI coding agent working in this repository. Read this file
first, then the guide the routing table assigns to your task. Do not start editing before
you have read them.

## What this repository is

The static website of **STRATEGUS**, a Marie Skłodowska-Curie Global Fellowship at the
University of Verona and UNC Chapel Hill.

- Astro builds Markdown and BibTeX into static HTML, CSS and optimised images.
- There is **no backend, no database, no CMS, no login, no runtime Python**. Nothing on
  the deployed site executes on a server, and the site makes no third-party request. The
  one Python file, `scripts/suggest-publications.py`, is a maintainer tool that only prints.
- The site is deployed to GitHub Pages from `main`. `dist/` is generated, never edited.

## Principles

1. **A content change touches content files.** Editing a team member, a news item or a
   publication means editing files under `src/content/` or `src/data/` — nothing else.
2. **Do not refactor while doing editorial work.** No renames, no restructuring, no
   dependency bumps, no CSS tidying as a side effect of adding a news item.
3. **Never invent academic or personnel information.** Roles, titles, affiliations,
   dates, grant numbers, funders and publication metadata must come from a source the
   requester gave you or from a record already in the repository.
4. **Prefer omission over an unsupported claim.** Every field except the required ones
   is optional, and the design looks right with fields missing.
5. **Keep the repository small.** No vendored libraries, no build output, no file above
   200 KB. `npm run verify` enforces the limit.
6. **The build is the safety net, not a formality.** `npm run ci` must pass before you
   report that work is done.

## Documentation routing

| Task | Read |
| --- | --- |
| Add or update news | `docs/news.md` |
| Add or update publications (then `npm run format:bib`) | `docs/publications.md` |
| Add, update or remove a team member; add or replace a portrait | `docs/team.md` |
| Edit the project description, funding statement, partners, links, colours, theme | `docs/site-settings.md` |
| Deployment, GitHub Pages, CI | `docs/deployment.md` |

If your task matches no row, it is probably not an editorial task — say so before changing
anything.

## Hard rules

- A content-only request MUST NOT modify components, layouts, routes, schemas,
  dependencies or CSS unless the request is technically impossible without it. If it is,
  say so and explain why before doing it.
- Never publish a photograph, e-mail address, telephone number or any other personal
  datum that the requester has not explicitly approved. The tests reject e-mail addresses
  and telephone numbers anywhere but the `email` field of a team member.
- Never add a third-party script, font, analytics tag, map embed or CDN reference.
  `npm run verify` fails if one appears in the build.
- Never commit `dist/`, `node_modules/`, credentials, archives or logs.
- Run `npm run ci` and report the real result. Do not claim success you have not observed.
- Do not commit or push unless you were asked to.

## The page contract

Every page is **one opening block plus its own content, and nothing else.** The opening is
`PageLayout`'s header, or the home hero.

1. The opening carries its own `.container`. Never nest a `.container` inside another.
2. Never give the opening padding. Its spacing is the single `.page-open` rule in
   `src/styles/base.css`, and the title's size and measure are `.page-open h1`.
3. The width travels with both blocks: if the content uses `container--wide`, the opening
   takes `wide` too. `PageLayout`'s `width` prop does this for you.
4. A new page adds content, not a frame. If two pages need the same block it belongs in
   `src/components/`.
5. Bands are full-bleed, so they cannot live in a container. A page that alternates bands
   passes `bleed` to `PageLayout` and puts a `.container` *inside* each band.

**The test:** `main h1` sits at the same left offset on every page of the same width class,
and no page nests a `.container`.

## Where things are

| Path | What lives there |
| --- | --- |
| `src/content/people/` | One Markdown file per team member, plus their portrait |
| `src/content/news/` | One Markdown file per news item, `YYYY-MM-DD-<slug>.md` |
| `src/content/home.md` | The project description shown on the home page |
| `src/data/` | `site.ts`, `publications.bib`, `publications.overrides.yaml` |
| `src/content.config.ts` | The schema of every content type |
| `src/pages/` | Routes. No content lives here |
| `src/layouts/` | `BaseLayout` (the shell) → `PageLayout` (one opening) → `DetailLayout` (opening + sidebar) |
| `src/components/` | Building blocks shared by more than one page |
| `src/styles/` | `tokens.css` (design tokens) and `base.css` |
| `src/lib/`, `src/loaders/` | Plain TypeScript helpers (BibTeX, publications, people) |
| `public/` | Files copied verbatim into the build |
| `scripts/verify.mjs` | Repository and built-site verification, run by CI |
| `scripts/format-bib.mjs` | `npm run format:bib`: canonical layout of `publications.bib`; a test checks the file is formatted |
| `scripts/suggest-publications.py` | Maintainer tool: compares Scholar/OpenAlex with the bibliography and prints what is missing. Never writes |
| `tests/` | Unit tests and content invariants (`node --test`) |
| `THIRD_PARTY_NOTICES.md` | Provenance and licences of third-party material. Add an entry before adding an asset you did not make |

`src/content.config.ts` is the source of truth for which fields a record may have. If a
guide and the schema disagree, the schema wins — and fix the guide.

## Commands

```bash
npm ci        # install exactly what package-lock.json says
npm run dev   # local preview on http://localhost:4321
npm run ci    # check + unit tests + production build + verification
```
