# News

`/news/` and every `/news/<slug>/` page come from one directory:

```
src/content/news/
  2025-01-23-flexman-release.md
  2024-04-15-industry-5-0-workshop.md
```

**One Markdown file per item. The file name is the public address**, and it must start with
the item's own date.

## File names

```
YYYY-MM-DD-short-title.md
```

- The date prefix **must equal** the `date:` field. A unit test enforces it.
- Lower-case letters, digits and hyphens after the date. Keep the title part short: it is
  the URL, not the headline.
- Files whose name starts with `_` are ignored.

`2025-01-23-flexman-release.md` → `/news/2025-01-23-flexman-release/`.

## Fields

Required: `title`, `date`, `summary`, `category`.

| Field | Type | What it is |
| --- | --- | --- |
| `title` | text | The headline. Quote it if it contains a colon. For a paper, use the paper's title. |
| `date` | date | `YYYY-MM-DD`. Must match the file-name prefix. |
| `summary` | text | One or two sentences, shown in the list and used as the meta description. |
| `category` | one of `Project`, `Publication`, `Event`, `Release` | Short label shown in the margin of the list. |
| `author` | slug | The team member posting, from `src/content/people/`. Their portrait appears in the byline. |
| `people` | list | Slugs of team members the item is about. |

The authoritative list is the `news` schema in `src/content.config.ts`.

The text after the closing `---` is the body, in Markdown. **Headings inside it start at
`##`** — the page title is the `h1`. A test enforces it.

## Add a news item

Create `src/content/news/2026-10-02-paper-date-2027-digital-twin.md`:

```markdown
---
title: "A Digital Twin for Reconfigurable Production Lines"
date: 2026-10-02
category: Publication
author: enrico-fraccaroli
summary: "Conference paper at the 2027 Design, Automation and Test in Europe Conference (DATE)."
---

We are pleased to announce a new paper accepted at **DATE 2027**.

## Abstract

One or two paragraphs. Links are welcome.

## Links

- **DOI**: [10.23919/DATE00000.2027.0000000](https://doi.org/10.23919/DATE00000.2027.0000000)
```

The minimum that builds:

```markdown
---
title: Paper accepted at DATE 2027
date: 2026-10-02
category: Publication
summary: One sentence.
---
```

Then run `npm run ci`.

## Common edits

**Change the date.** Rename the file so its prefix matches, or the tests fail. Renaming
changes the public address, so avoid it once an item is published.

**Correct a published item.** Edit the body in place; keep the file name and the `date`.

**Delete an item.** `git rm` the file.

## What not to do

- Do not put an e-mail address or a telephone number in the body or in any field. A test
  scans for both patterns and fails.
- Do not paste HTML. The bodies are Markdown.
- Do not announce something that has not happened, or a result that is not public yet.
- Do not add an image unless it is yours to publish. If you do, put it next to the Markdown
  file, reference it relatively with alt text (`![What it shows](./file.jpg)`), and run
  `npm run strip-metadata` on it first.

## Validate

```bash
npm run dev    # http://localhost:4321/news/
npm run ci     # checks, unit tests, production build, verification
```

## See also

- `docs/team.md` — the slugs used in `author:` and `people:`
- `docs/publications.md` — the paper itself goes in the bibliography, the announcement here
