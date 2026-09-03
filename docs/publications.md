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

1. Export the BibTeX from IEEE Xplore, DBLP or the publisher (or take the entry
   `scripts/suggest-publications.py --bibtex` fetched for you).
2. Paste it anywhere into `src/data/publications.bib`.
3. Add the open-access `url` if there is one.
4. Run `npm run format:bib`, then `npm run ci`.

### Keeping the file tidy

`npm run format:bib` rewrites `publications.bib` in one canonical layout, so the file
reads the same whoever last touched it:

- entries sorted by year, newest first, then by the first author's family name; every year
  opens with a `% ====` divider;
- fields in a fixed order (author, title, venue, year, volume, number, pages, month,
  keywords, identifiers, url…), aligned `=`, values in braces;
- empty fields (`volume = {}`) and the `abstract`, `file` and `annote` fields dropped;
- page ranges normalised to `1--8`, a bare `&` escaped as `\&` (never inside a URL or DOI).

Everything else — citation keys, braces protecting acronyms, LaTeX accents — is kept
exactly as written. A test checks that the committed file is formatted, so `npm run ci`
tells you when to run it. `%` comments are regenerated: notes about an entry belong in its
`note` field.

### Things to fix on paste

- **HTML entities.** Replace `&amp;` and friends with the real character.
- **Duplicates.** A preprint and the published version are two entries; keep one,
  normally the published one. Duplicate keys fail the tests.
- **Keywords.** Harmless but unused; keep or drop as you like.

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

## Finding papers to add

`scripts/suggest-publications.py` looks up a team member's publications on Google Scholar
(or on OpenAlex, through their ORCID), compares them with `publications.bib`, and prints the
ones that are missing. **It never modifies a file**: it is a reminder, not an importer.

Setup, once — a Python virtual environment, git-ignored:

```bash
python3 -m venv .venv
.venv/bin/pip install -r scripts/requirements.txt
```

Then:

```bash
.venv/bin/python scripts/suggest-publications.py                     # Google Scholar, since the project start
.venv/bin/python scripts/suggest-publications.py --source openalex   # OpenAlex by ORCID: reliable, no scraping
.venv/bin/python scripts/suggest-publications.py --bibtex            # a draft BibTeX entry per suggestion
.venv/bin/python scripts/suggest-publications.py --person franco-fummi --since 2024
.venv/bin/python scripts/suggest-publications.py --help
```

The report lists what was found, what is already in the bibliography, the suggested
additions (newest first) and, at the end, the entries of the bibliography the source did
not return. For every suggestion it prints the DOI, the venue when the source has it, the
**publisher's page** that doi.org points at (IEEE Xplore, ACM Digital Library, MDPI,
arXiv…) so you can go there, and the open-access copy when OpenAlex knows one. A
suggestion without a DOI (Scholar rarely has them) is looked up on Crossref by title.
Preprints whose published version was also found are hidden; `--include-superseded` shows
them.

**`--bibtex` fetches real entries.** For every suggestion with a DOI it asks doi.org for
`application/x-bibtex` — the entry Crossref or DataCite registered — and reformats it in
the style of `publications.bib`: ampersands escaped, page ranges as `--`, the open-access
copy as `url`, arXiv records written like the existing arXiv entry, and a key in the style
`fraccaroli2025frost`. Paste, check against the publisher's record (the IEEE Xplore
"Cite This" export also carries `keywords` and `issn`, which are optional), add the IRIS
`url` if there is one, and run `npm run ci`.

The Scholar and ORCID ids come from the person's record in `src/content/people/`, so the
tool works for anyone on the Team page who has them. Google Scholar has no API and blocks
scrapers without warning; when it fails, the script says so — retry later or use OpenAlex.

## Validate

```bash
npm run dev    # http://localhost:4321/publications/
npm run ci     # checks, unit tests, production build, verification
```

## See also

- `docs/team.md` — author matching and the `aliases` field
- `docs/news.md` — announcing a paper
