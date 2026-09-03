# STRATEGUS website rebuild — design

Date: 2026-09-03. Status: approved in conversation, implemented in the initial commit.

## Goal

Replace the Jekyll/Petridish STRATEGUS site with a purely static Astro site that shares
the structure, navigation, editorial layout and light/dark theme of the CISD site
(`esd-univr/esd-univr.github.io`), branded for STRATEGUS. Fresh git history, no vendored
libraries, no file above 200 KB, no third-party request at runtime.

## What carries over from the old site

Only content:

- the project description (two paragraphs) shown on the home page;
- 19 news items (3 announcements, 16 paper announcements);
- the 17-entry BibTeX bibliography;
- the three team members with role, bio and profile links, and their portraits;
- the funding statement (Horizon Europe · MSCA Global Fellowship, grant 101109243),
  the two partner institutions and the CC BY 4.0 content licence;
- the STRATEGUS mark and the EU / MSCA emblem.

Dropped: Bootstrap, jQuery, FontAwesome, Academicons, the Twitter feed, the cookie banner,
the banner photograph, the screenshot, the Python BibTeX→YAML script, card images on news
posts. Old news addresses (`/news/<year>/<slug>/`) are not preserved.

## What carries over from the CISD site

The shell and the machinery: Astro 7 static build, `BaseLayout` → `PageLayout` →
`DetailLayout`, `Header`/`Footer`/`Seo`, the `NewsList`, `PublicationList` and `Portrait`
components, `tokens.css` + `base.css`, the self-hosted fonts, the pre-paint theme script and
toggle, the BibTeX parser and publications loader, the CI and Pages deploy workflows, the
verify script and the test style (`node --test`).

Removed: groups, research topics, projects, opportunities, assets collections and their
pages, legacy-redirect stubs, Markdown figure transform, CISD branding and CISD documentation.

## Site map

| URL | Content |
| --- | --- |
| `/` | Hero (mark, name, expanded name, mission, section links); band: about the project; band: latest three news; band: funding and partners |
| `/news/`, `/news/<date>-<slug>/` | News by year, newest first; one page per item |
| `/publications/`, `/publications.bib` | Bibliography by year with DOI / open-access links and a client-side filter; BibTeX export |
| `/team/` | One section per person: portrait, role, affiliation, bio, profile links. Anchors `#<slug>` are the author-link targets |
| `/404.html`, `/robots.txt`, `/sitemap-index.xml` | Generated |

Masthead navigation: Home, News, Publications, Team, plus the theme toggle. The mark links
home as well.

## Content model (`src/content.config.ts`)

- `people` (`src/content/people/<slug>.md` + portrait next to it): `name`, `role`,
  `institution` (`univr` | `unc`), `affiliation`, `order`, `photo`, optional `email`,
  `website`, `orcid`, `scholar`, `researchgate`, `github`, `aliases`. Body = bio.
- `news` (`src/content/news/YYYY-MM-DD-<slug>.md`): `title`, `date`, `summary`,
  `category` (`Project` | `Publication` | `Event` | `Release`), optional `author`
  (person slug), `people`. Body = the post. The date prefix must equal `date`.
- `publications` (`src/data/publications.bib` + `publications.overrides.yaml`): same as
  CISD minus `projects`. A `url` that is not a DOI is shown as "Open access" even when a
  DOI exists.
- Long home prose lives in `src/content/home.md`, imported by the home page.
- Institutional strings (name, mission, funding, partners, links) live in
  `src/data/site.ts`.

## Design tokens

Neutral ramp (paper, ink, rules) unchanged from CISD: it is already contrast-verified. The
accent becomes the flame from the mark, adjusted for text contrast:

| Token | Light | Dark |
| --- | --- | --- |
| `--color-accent` | `#b8310a` | `#ff9d73` |
| `--color-accent-strong` | `#872406` | `#ffcdb8` |
| `--color-focus` | `#b8310a` | `#ff9d73` |
| `--color-selection` | `#fbe3d9` | `#6a3a2c` |

Every accent clears 4.5:1 on `--color-paper`, `--color-paper-2` and the 7 % tint. Brand-only
tokens record the mark's own colours: `--brand-navy #292572`, `--brand-flame #f3400e`.
There are no group hues.

The mark is a transparent PNG derived from the original JPEG. The dark theme uses a
variant whose navy arcs are set in the dark ink colour so they stay visible on navy paper;
the flame is untouched. The EU emblem is never recoloured; it sits on a white plate.

### Revision, 2026-09-03 (later the same day)

The navy dark theme was rejected. The dark palette is now neutral: paper `#151515`, plates
`#202020`, ink `#f2f2f2` / `#c4c4c4` / `#9a9a9a`, rules `#2e2e2e` / `#d9d9d9`, accent
`#ff8f5e` / `#ffc4ab`, selection `#4a2a1c`. The dark mark's arcs follow the new ink. The
theme toggle cross-fades over 500 ms (`--duration-theme`, skipped under reduced motion), and
switching from dark to light shows a "Flash out!" frame under the toggle for 1.5 s.

## Guardrails

- `npm run ci` = `astro check` → unit tests → build → `scripts/verify.mjs`.
- Tests: BibTeX parser; news file names match dates; portraits are named after a person and
  carry no metadata; every publication has at least one author on the team.
- Verify: required routes exist, one `h1` per page, no heading jumps, `lang`, title,
  description, canonical, `<main>`, skip link, no external script or CDN, internal links
  resolve, and **no tracked file larger than 200 KB**.

## Repository hygiene

One `main` branch, deployed by `.github/workflows/deploy.yml` (Pages source: GitHub Actions,
already configured). Pull requests run `.github/workflows/ci.yml`. The old checkout is kept
outside the repository at `../strategus-he2022.github.io.old-jekyll` until the new site is
verified live, then it can be deleted.
