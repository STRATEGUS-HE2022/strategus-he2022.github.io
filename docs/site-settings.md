# Project description, funding, partners, branding and theme

Three files hold everything that is not a news item, a person or a publication:

```
src/content/home.md       the project description on the home page (Markdown)
src/data/site.ts          name, tagline, funding statement, partners, links, licence
src/styles/tokens.css     colours (light + dark), type, spacing, widths — the visual language
```

## `src/content/home.md`

The prose under "About STRATEGUS" on the home page. Plain Markdown; headings, if any, start
at `##`. Edit it like any document.

## `src/data/site.ts`

Plain TypeScript, nothing generated. Edit a string and every page that uses it follows.

| Field | Where it shows |
| --- | --- |
| `shortName` | `STRATEGUS` — masthead, page titles, footer |
| `name` | The expanded name, beside the acronym |
| `title` | `<title>` of the home page and the Open Graph site name |
| `description` | Default meta description of every page. **Keep it under 160 characters.** |
| `tagline` | The line under the name in the home page hero |
| `funding.*` | The funding section of the home page and the footer: programme, action, call, grant, CORDIS link, period, acknowledgement, disclaimer |
| `partners` | The two institutions: footer, home page, and the `institution:` vocabulary of team records. Do not remove an entry a person still references |
| `links.github`, `links.email` | Footer |
| `licence` | The colophon |
| `brand.favicon`, `brand.ogImage` | Optional brand assets served from `public/` |

**The mark is not a setting.** It is a light/dark pair of transparent PNGs in
`src/assets/images/` imported by `Header.astro` and `pages/index.astro`. Replacing the mark
means replacing those two files (keep them under 200 KB). The EU emblem,
`src/assets/images/eu-msca.png`, must never be recoloured or altered.

## `src/styles/tokens.css`

Every colour, font size, spacing step, width, rule and radius is a custom property declared
once in this file. Components only ever reference the variables, so changing the look means
changing this file — not the components.

### Type and spacing are an accessibility floor

Running text never falls below 17px, the smallest step (14px) is reserved for mono metadata,
line height is at or above 1.5 everywhere. **If a layout feels tight, cut content or widen
the container. Never reduce a type size.**

### Colour: two palettes, one active theme

1. `--light-*` — the light palette. Real hex values, defined once.
2. `--dark-*` — the dark palette. Real hex values, defined once.
3. `--color-*` — the active theme. An alias pointing at one of the two.

Only layer 3 is switched. Components read layer 3 and never mention layer 1 or 2.

| Active token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `--color-paper` | `#f6f7fb` | `#1a2b56` | Page background, `.band` |
| `--color-paper-2` | `#eaecf5` | `#253865` | Sunken bands, code, footer |
| `--color-ink` | `#141a2e` | `#eff4ff` | Body text and headings |
| `--color-ink-2` | `#3b4468` | `#becef0` | Ledes, summaries |
| `--color-ink-3` | `#5a6383` | `#97aad1` | Eyebrows, meta, captions |
| `--color-rule` | `#d3d8e8` | `#344878` | Hairline separators |
| `--color-rule-strong` | `#141a2e` | `#d5dff3` | Masthead and footer edges, current nav item |
| `--color-accent` | `#b8310a` | `#ff9d73` | Link hover, categories, partner roles, filter focus |
| `--color-accent-strong` | `#872406` | `#ffcdb8` | Selected text |
| `--color-focus` | `#b8310a` | `#ff9d73` | Focus ring |
| `--color-selection` | `#fbe3d9` | `#6a3a2c` | `::selection` background |

The accent is the flame of the mark, darkened (light) or lifted (dark) until it clears
4.5:1 as text on `--color-paper`, `--color-paper-2` and the 7 % tint. The mark's real colours
are recorded as `--brand-navy` and `--brand-flame` and are never used as text.

### How the theme is chosen

1. **No choice made.** Nothing is set on `<html>` and the CSS follows the operating system
   through `@media (prefers-color-scheme: dark)`. This is also the path without JavaScript.
2. **An explicit choice.** The toggle in the masthead writes `light` or `dark` to
   `localStorage` under `strategus-theme` and sets `<html data-theme="…">`.
3. **Choosing your own system default clears the override.**

The inline script that applies step 2 lives in the `<head>` of `BaseLayout.astro` and runs
before first paint, so pages never flash the wrong palette.

### Changing the palette safely

1. Edit `--light-*` and `--dark-*` only. Never touch the `--color-*` aliases and never put a
   colour in a component.
2. Change both palettes.
3. Check the contrast on every ground (`--color-paper`, `--color-paper-2`, the tint): at
   least 7:1 for `--color-ink`, 4.5:1 for `--color-ink-2`, `--color-ink-3`, `--color-accent`
   and `--color-accent-strong`, 3:1 for `--color-focus` and `--color-rule-strong`.
4. Look at both themes: a text-heavy page (`/`), a list-heavy one (`/publications/`) and the
   Team page.

## What not to do

- Do not hard-code the project name, the grant number or a colour into a component.
- Do not add a third-party script, font, analytics tag, map embed or CDN reference. The site
  makes no external request, and `npm run verify` enforces it.
- Do not move the theme script out of the `<head>`, defer it, or bundle it.
- Do not remove the `prefers-reduced-motion` block or the `:focus-visible` rule from
  `base.css`; `npm run verify` fails if either disappears.
- Do not add a brand asset you do not have permission to publish.

## Validate

```bash
npm run dev    # http://localhost:4321
npm run ci
```
