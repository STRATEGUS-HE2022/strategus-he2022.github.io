# Publications

The bibliography is two files:

```
src/data/publications.bib               the entries themselves (BibTeX)
src/data/publications.overrides.yaml    per-entry extras, keyed by BibTeX key
```

They feed `/publications/` and the machine-readable export at `/publications.bib`.

## The curation rule

A unit test enforces the rule that keeps the list coherent:

> Every entry must have at least one author who is listed under Team.

Author names are matched ignoring accents, apostrophes, hyphens, case and initials, so
`Fraccaroli, Enrico`, `Enrico Fraccaroli` and `E. Fraccaroli` all match.

## `publications.bib`

Standard BibTeX. Required in every entry: a unique key, `title`, `author` (or `editor`) and
a four-digit `year`. Used when present: `journal` / `booktitle`, `volume`, `number`,
`pages`, `publisher`, `school`, `institution`, `doi`, `url`, `ee`, `biburl`.

```bibtex
@inproceedings{10885702,
  author    = {Zhu, Tingan and Fraccaroli, Enrico and Chakraborty, Samarjit},
  booktitle = {2025 17th International Conference on COMmunication Systems \& NETworks (COMSNETS)},
  title     = {Controllers for Edge-Cloud Cyber-Physical Systems},
  year      = {2025},
  pages     = {198--206},
  doi       = {10.1109/COMSNETS63942.2025.10885702},
  url       = {https://iris.univr.it/retrieve/.../paper.pdf}
}
```

The entry type decides how the venue is shown: `article` → journal, `inproceedings` /
`conference` → conference, `incollection` / `inbook` → book chapter, `book` /
`proceedings` → book, `phdthesis` / `mastersthesis` → thesis, `techreport` → report. An
`article` in a preprint server (`arXiv`, `CoRR`, …) is labelled a preprint.

**Links.** `doi` becomes the DOI link. A `url` that is not a DOI is shown as **Open access**
— the institutional repository (IRIS) or arXiv copy. Both are shown when both exist.

### Adding a paper

1. Export the BibTeX from IEEE Xplore, DBLP or the publisher.
2. Paste it into `src/data/publications.bib` (the file is ordered newest-first for
   readability; the site sorts by year regardless).
3. Add the open-access `url` if there is one.
4. Run `npm run ci`.

### Things to fix on paste

- **Ampersands.** Write `\&`, never a bare `&`. A test checks `booktitle`.
- **Page ranges.** `pages = {1--6}` is correct BibTeX; the site renders the en dash.
- **HTML entities.** Replace `&amp;` and friends with the real character.
- **Duplicates.** A preprint and the published version are two entries; keep one,
  normally the published one. Duplicate keys fail the tests.
- **Abstracts and keywords.** Drop `abstract`, `file` and `annote`; `keywords` is harmless
  but unused.

## `publications.overrides.yaml`

Everything the bibliography cannot express. The key is the exact BibTeX key:

```yaml
10885702:
  pdf: /documents/papers/zhu25.pdf     # a file under public/documents/ or an https URL
  code: https://github.com/STRATEGUS-HE2022/flexman
  note: Best paper award
  people: [samarjit-chakraborty]       # only when automatic author matching fails
  featured: true                        # marks the entry as selected (no page reads it today)
  hidden: true                          # keep the entry but never show or export it
```

Every field is optional. An unknown key fails the tests, which catches a typo in a citation
key. Only link a PDF the publisher's licence allows you to host.

## Validate

```bash
npm run dev    # http://localhost:4321/publications/
npm run ci     # checks, unit tests, production build, verification
```

## See also

- `docs/team.md` — author matching and the `aliases` field
- `docs/news.md` — announcing a paper
