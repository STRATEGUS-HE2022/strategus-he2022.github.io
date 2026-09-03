# Software

`/software/` lists the software produced by the project and the ecosystem that carries it
forward. It comes from one directory:

```
src/content/software/
  glacier.md
  frost.md
  flexman.md
```

**One Markdown file per record. The file name is the anchor**: `frost.md` → `/software/#frost`.
The home page shows the same records in a compact list, and news items may link to an anchor.

## Fields

Required: `name`, `kind`, `summary`, `repository`, `licence`.

| Field | Type | What it is |
| --- | --- | --- |
| `name` | text | The name as shown. |
| `kind` | text | Short label in the margin: `Open-source ecosystem`, `Simulation platform`, `C++ library`. |
| `summary` | text | One sentence, shown on the home page and under the name. |
| `partOf` | slug | The ecosystem this piece belongs to, another record in this directory. |
| `website` | URL | Public site, if any. |
| `repository` | URL | The GitHub repository, or the GitHub organisation for an ecosystem. |
| `documentation` | URL | Documentation site, if separate from the repository. |
| `licence` | text | SPDX id (`BSD-2-Clause`) or a short phrase (`BSD (per repository)`). |
| `languages` | list | Main implementation languages, as shown. |
| `publications` | list | BibTeX keys from `src/data/publications.bib`. A test checks they exist. |
| `people` | list | Slugs of team members involved; linked to the Team page. |
| `order` | number | Display order, lowest first (default 100). |

The authoritative list is the `software` schema in `src/content.config.ts`.

The text after the closing `---` is the body, in Markdown: two or three paragraphs on what
the software does and how it relates to the project. **Headings inside it start at `##`.**

## Add a record

Create `src/content/software/frost-planner.md`:

```markdown
---
name: Frost Planner
kind: Python library
summary: "A Python library for solving flexible job-shop scheduling problems."
partOf: glacier
repository: https://github.com/glacier-project/frost-planner
licence: BSD-2-Clause
languages:
  - Python
publications: []
people:
  - enrico-fraccaroli
order: 4
---

What it does, in two paragraphs.
```

Then run `npm run ci`.

## Common edits

**Link a paper.** Add its BibTeX key to `publications:`; the title, authors and venue come
from the bibliography, so they never drift.

**Retire a piece of software.** `git rm` the file, and remove any `partOf:` pointing at it.

## What not to do

- Do not list software that is not public. Every record needs a repository anyone can open.
- Do not put an e-mail address or a telephone number anywhere in the file. A test scans for
  both patterns and fails.
- Do not copy a README into the body. Two or three paragraphs; the repository has the rest.

## Validate

```bash
npm run dev    # http://localhost:4321/software/
npm run ci     # checks, unit tests, production build, verification
```

## See also

- `docs/team.md` — the slugs used in `people:`
- `docs/publications.md` — the bibliography the `publications:` keys refer to
