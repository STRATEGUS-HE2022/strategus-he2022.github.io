#!/usr/bin/env python3
"""
Suggest publications to add to src/data/publications.bib.

Looks up a team member's publications on Google Scholar (through the `scholarly`
package) or on OpenAlex (through their ORCID), compares them with the bibliography,
and prints the ones that are missing. For every suggestion it prints where the paper
lives (the publisher's page that doi.org points at — IEEE Xplore, ACM DL, MDPI, arXiv)
and, with `--bibtex`, downloads the BibTeX entry from the DOI registrar and reformats
it in the style of the bibliography. It is a maintainer tool: it reads the repository,
talks to the sources, prints a report, and **never modifies a file**.

Setup, once:

    python3 -m venv .venv
    .venv/bin/pip install -r scripts/requirements.txt

Usage:

    .venv/bin/python scripts/suggest-publications.py                     # Google Scholar, since the project start
    .venv/bin/python scripts/suggest-publications.py --source openalex   # OpenAlex by ORCID (reliable, no scraping)
    .venv/bin/python scripts/suggest-publications.py --bibtex            # BibTeX for every suggestion, ready to paste
    .venv/bin/python scripts/suggest-publications.py --person franco-fummi --since 2024

Where the data comes from:

  - Google Scholar has no API: `scholarly` scrapes it, and Google throttles or blocks
    scrapers without warning. When that happens the script says so; run it again later
    or use `--source openalex`, an open API keyed on the person's ORCID.
  - A suggestion without a DOI (Scholar rarely has them) is looked up on Crossref by
    title; the DOI is accepted only when the titles match.
  - `page:` is the address doi.org redirects to. The script reads the redirect and never
    fetches the publisher's page itself.
  - `--bibtex` asks doi.org for `application/x-bibtex`, which Crossref and DataCite serve
    for every DOI they register. The entry is reformatted (ampersands escaped, page ranges
    in BibTeX form, the open-access copy known to OpenAlex as `url`) and gets a key in the
    style `fraccaroli2025frost`. Check it against the publisher before pasting.
"""
from __future__ import annotations

import argparse
import difflib
import html
import json
import re
import sys
import textwrap
import unicodedata
from dataclasses import asdict, dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PEOPLE = ROOT / "src/content/people"
BIB = ROOT / "src/data/publications.bib"
SITE = ROOT / "src/data/site.ts"
TIMEOUT = 30

# --- Records --------------------------------------------------------------------------


@dataclass
class Work:
    """One publication as reported by a source."""

    title: str
    year: int | None
    source: str
    doi: str | None = None
    venue: str | None = None
    kind: str | None = None  # journal | conference | preprint | chapter | other
    authors: list[str] = field(default_factory=list)
    url: str | None = None
    oa_url: str | None = None
    landing: str | None = None
    volume: str | None = None
    number: str | None = None
    pages: str | None = None
    doi_note: str | None = None
    raw: object = field(default=None, repr=False, compare=False)


@dataclass
class BibEntry:
    key: str
    type: str
    title: str
    doi: str | None
    year: int | None


# --- Reading the repository -----------------------------------------------------------


def read_frontmatter(path: Path) -> dict[str, str]:
    """`key: value` pairs of a Markdown frontmatter block; quotes are stripped."""
    text = path.read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---", text, re.S)
    if not m:
        raise SystemExit(f"{path}: no frontmatter")
    data: dict[str, str] = {}
    for line in m.group(1).splitlines():
        kv = re.match(r"^([A-Za-z_]+):\s*(.*)$", line)
        if kv:
            data[kv.group(1)] = kv.group(2).strip().strip("\"'")
    return data


def project_start_year() -> int:
    m = re.search(r"start:\s*'(\d{4})-\d{2}-\d{2}'", SITE.read_text(encoding="utf-8"))
    return int(m.group(1)) if m else 2023


def site_email() -> str | None:
    m = re.search(r"email:\s*'([^']+)'", SITE.read_text(encoding="utf-8"))
    return m.group(1) if m else None


def _read_value(s: str, i: int) -> tuple[str, int]:
    """Read a BibTeX field value starting at s[i]: {…} with nesting, "…", or a bare token."""
    if s[i] == "{":
        depth, j = 0, i
        while j < len(s):
            if s[j] == "{":
                depth += 1
            elif s[j] == "}":
                depth -= 1
                if depth == 0:
                    return s[i + 1 : j], j + 1
            j += 1
        raise ValueError("unbalanced braces")
    if s[i] == '"':
        j = s.index('"', i + 1)
        return s[i + 1 : j], j + 1
    m = re.match(r"[^,}\s]+", s[i:])
    if not m:
        raise ValueError("empty value")
    return m.group(0), i + len(m.group(0))


def parse_entries(text: str) -> list[tuple[str, str, dict[str, str]]]:
    """(type, key, raw fields) for every entry; braces inside values are kept."""
    entries: list[tuple[str, str, dict[str, str]]] = []
    for m in re.finditer(r"@(\w+)\s*\{\s*([^,\s]+)\s*,", text):
        etype = m.group(1).lower()
        if etype in ("comment", "string", "preamble"):
            continue
        i = m.end()
        fields: dict[str, str] = {}
        while True:
            fm = re.compile(r"\s*([A-Za-z_]+)\s*=\s*").match(text, i)
            if not fm:
                break
            try:
                value, i = _read_value(text, fm.end())
            except ValueError:
                break
            fields[fm.group(1).lower()] = value
            cm = re.compile(r"\s*,").match(text, i)
            if cm:
                i = cm.end()
        entries.append((etype, m.group(2), fields))
    return entries


def plain(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("{", "").replace("}", "")).strip()


def parse_bib(text: str) -> list[BibEntry]:
    out: list[BibEntry] = []
    for etype, key, fields in parse_entries(text):
        year = plain(fields.get("year", ""))
        out.append(BibEntry(key=key, type=etype, title=plain(fields.get("title", "")), doi=norm_doi(plain(fields.get("doi", ""))), year=int(year) if year.isdigit() else None))
    return out


# --- Matching -------------------------------------------------------------------------


def norm_doi(doi: str | None) -> str | None:
    if not doi:
        return None
    return re.sub(r"^https?://(dx\.)?doi\.org/", "", doi.strip(), flags=re.I).lower() or None


def norm_title(title: str) -> str:
    t = unicodedata.normalize("NFKD", title)
    t = "".join(c for c in t if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", " ", t.lower()).strip()


def same_title(a: str, b: str) -> bool:
    na, nb = norm_title(a), norm_title(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    short, long_ = sorted((na, nb), key=len)
    # "…: Wild-and-Crazy-Idea Paper" and similar subtitles the sources drop or add.
    if len(short) >= 30 and long_.startswith(short):
        return True
    return difflib.SequenceMatcher(None, na, nb).ratio() >= 0.92


def find_in_bib(work: Work, bib: list[BibEntry]) -> BibEntry | None:
    if work.doi:
        for e in bib:
            if e.doi and e.doi == work.doi:
                return e
    for e in bib:
        if same_title(work.title, e.title):
            return e
    return None


def is_preprint(work: Work) -> bool:
    return work.kind == "preprint" or bool(re.search(r"arxiv|techrxiv|biorxiv|ssrn|preprint", (work.venue or "") + " " + (work.doi or ""), re.I))


def drop_superseded_preprints(works: list[Work]) -> tuple[list[Work], list[Work]]:
    """A preprint whose published version is also in the list is noise, not a suggestion."""
    published = [w for w in works if not is_preprint(w)]
    kept, dropped = [], []
    for w in works:
        if is_preprint(w) and any(same_title(w.title, p.title) for p in published):
            dropped.append(w)
        else:
            kept.append(w)
    return kept, dropped


# --- Sources --------------------------------------------------------------------------


def user_agent(mailto: str | None) -> str:
    return f"strategus-he2022.github.io suggest-publications ({'mailto:' + mailto if mailto else 'https://strategus-he2022.github.io/'})"


def fetch_openalex(orcid: str, since: int, mailto: str | None) -> list[Work]:
    import requests

    works: list[Work] = []
    cursor: str | None = "*"
    params = {
        "filter": f"authorships.author.orcid:{orcid},publication_year:>{since - 1}",
        "per-page": 200,
        "select": "id,doi,title,publication_year,type,primary_location,biblio,authorships,open_access,best_oa_location",
    }
    if mailto:
        params["mailto"] = mailto
    while cursor:
        r = requests.get("https://api.openalex.org/works", params={**params, "cursor": cursor}, timeout=TIMEOUT, headers={"User-Agent": user_agent(mailto)})
        r.raise_for_status()
        data = r.json()
        for w in data.get("results", []):
            loc = w.get("primary_location") or {}
            src = loc.get("source") or {}
            src_type = src.get("type")
            wtype = w.get("type")
            if wtype == "preprint" or src_type == "repository":
                kind = "preprint"
            elif wtype == "conference-paper" or src_type == "conference":
                kind = "conference"
            elif src_type == "journal" or wtype == "review":
                kind = "journal"
            elif wtype == "book-chapter":
                kind = "chapter"
            else:
                kind = "other"
            # Conference venues are often only in the raw source name, HTML-escaped once or twice.
            venue = src.get("display_name") or loc.get("raw_source_name")
            if venue:
                venue = html.unescape(html.unescape(venue)).strip() or None
            biblio = w.get("biblio") or {}
            first, last = biblio.get("first_page"), biblio.get("last_page")
            oa = (w.get("best_oa_location") or {}).get("pdf_url") or (w.get("open_access") or {}).get("oa_url")
            doi = norm_doi(w.get("doi"))
            if oa and doi and norm_doi(oa) == doi:
                oa = None  # the "open access" location is just the DOI link
            works.append(
                Work(
                    title=w.get("title") or "",
                    year=w.get("publication_year"),
                    source="openalex",
                    doi=doi,
                    venue=venue,
                    kind=kind,
                    authors=[a["author"]["display_name"] for a in w.get("authorships", []) if a.get("author")],
                    url=loc.get("landing_page_url") or w.get("id"),
                    oa_url=oa,
                    volume=biblio.get("volume"),
                    number=biblio.get("issue"),
                    pages=f"{first}--{last}" if first and last and first != last else first,
                    raw=w,
                )
            )
        cursor = (data.get("meta") or {}).get("next_cursor")
    return works


def fetch_scholar(scholar_id: str, since: int) -> list[Work]:
    from scholarly import scholarly

    author = scholarly.search_author_id(scholar_id)
    scholarly.fill(author, sections=["publications"])
    works: list[Work] = []
    for pub in author.get("publications", []):
        bib = pub.get("bib", {})
        year_text = str(bib.get("pub_year", "")).strip()
        year = int(year_text) if year_text.isdigit() else None
        if year is not None and year < since:
            continue
        works.append(Work(title=bib.get("title", ""), year=year, source="scholar", venue=bib.get("citation") or None, url=pub.get("pub_url"), raw=pub))
    return works


# --- Resolving: DOI by title, landing page, BibTeX from the registrar ------------------


def find_doi_by_title(title: str, mailto: str | None) -> str | None:
    import requests

    params = {"query.bibliographic": title, "rows": 3, "select": "DOI,title"}
    if mailto:
        params["mailto"] = mailto
    try:
        r = requests.get("https://api.crossref.org/works", params=params, timeout=TIMEOUT, headers={"User-Agent": user_agent(mailto)})
        r.raise_for_status()
    except requests.RequestException:
        return None
    for item in (r.json().get("message") or {}).get("items", []):
        candidate = (item.get("title") or [""])[0]
        if candidate and same_title(candidate, title):
            return norm_doi(item.get("DOI"))
    return None


def landing_page(doi: str, mailto: str | None) -> str | None:
    """Where doi.org sends a browser — read from the redirect, without visiting the publisher."""
    import requests

    try:
        r = requests.head(f"https://doi.org/{doi}", allow_redirects=False, timeout=TIMEOUT, headers={"User-Agent": user_agent(mailto)})
    except requests.RequestException:
        return None
    return r.headers.get("Location")


def registrar_bibtex(doi: str, mailto: str | None) -> str | None:
    import requests

    try:
        r = requests.get(
            f"https://doi.org/{doi}",
            headers={"Accept": "application/x-bibtex; charset=utf-8", "User-Agent": user_agent(mailto)},
            timeout=TIMEOUT,
        )
    except requests.RequestException:
        return None
    text = r.text.strip()
    return text if r.ok and text.startswith("@") else None


# --- Output ---------------------------------------------------------------------------

STOPWORDS = {"a", "an", "the", "of", "on", "for", "and", "to", "in", "with", "via", "from", "by", "at", "towards", "toward"}
FIELD_ORDER = ["author", "title", "journal", "booktitle", "howpublished", "year", "volume", "number", "pages", "month", "issn", "isbn", "doi", "url"]


def bibtex_key(work: Work, authors: list[str] | None = None) -> str:
    """`fraccaroli2025frost`: family name of the first author, year, first significant title word."""
    names = authors or work.authors
    first = names[0] if names else ""
    # "Family, Given" (BibTeX) or "Given Family" (OpenAlex); the family name is kept whole: Dall'Ora -> dallora.
    family_text = first.split(",")[0] if "," in first else (first.split()[-1] if first.split() else "anon")
    family = re.sub(r"[^a-z0-9]", "", norm_title(family_text).replace(" ", "")) or "anon"
    words = [w for w in norm_title(work.title).split(" ") if w and w not in STOPWORDS and not w.isdigit()]
    return f"{family}{work.year or ''}{words[0] if words else ''}"


def bib_escape(value: str) -> str:
    return re.sub(r"(?<!\\)&", r"\\&", value)


def clean_value(value: str) -> str:
    value = html.unescape(html.unescape(value))
    value = re.sub(r"\s+", " ", value).strip()
    return bib_escape(value)


def format_entry(etype: str, key: str, fields: dict[str, str]) -> str:
    lines = [f"@{etype}{{{key},"]
    for name in FIELD_ORDER:
        if fields.get(name):
            lines.append(f"  {name:<9} = {{{fields[name]}}},")
    lines[-1] = lines[-1].rstrip(",")
    lines.append("}")
    return "\n".join(lines)


def tidy_registrar_bibtex(text: str, work: Work) -> str | None:
    """Registrar BibTeX → the bibliography's style. Returns None when the text is not one entry."""
    parsed = parse_entries(text)
    if len(parsed) != 1:
        return None
    etype, _, raw = parsed[0]
    fields = {k: clean_value(v) for k, v in raw.items()}
    if fields.get("pages"):
        fields["pages"] = re.sub(r"\s*[–—-]+\s*", "--", fields["pages"])
    doi = norm_doi(fields.get("doi")) or work.doi
    if doi:
        fields["doi"] = doi
    # The registrar's url is the DOI link again; the site wants the open-access copy there, if any.
    if fields.get("url") and norm_doi(fields["url"]) == doi:
        fields.pop("url")
    arxiv = re.match(r"^10\.48550/arxiv\.(.+)$", doi or "")
    if arxiv:
        # DataCite describes arXiv as @misc with publisher; the bibliography writes them as the existing entry does.
        etype = "article"
        fields["journal"] = f"arXiv preprint arXiv:{arxiv.group(1)}"
        fields["url"] = f"https://arxiv.org/pdf/{arxiv.group(1)}"
    else:
        if work.kind == "preprint" and not (fields.get("journal") or fields.get("booktitle")):
            # Other preprint servers (TechRxiv, bioRxiv…): the site's parser reads the server name
            # from `journal` to label the entry a preprint, as it does for arXiv.
            server = "TechRxiv" if (doi or "").startswith("10.36227/") else (work.venue or "Preprint")
            etype = "article"
            fields["journal"] = f"{server} preprint"
        if work.oa_url and not fields.get("url"):
            fields["url"] = work.oa_url
    authors = [a.strip() for a in re.split(r"\s+and\s+", fields.get("author", "")) if a.strip()]
    if not work.year and fields.get("year", "").isdigit():
        work.year = int(fields["year"])
    return format_entry(etype, bibtex_key(work, authors), fields)


def draft_bibtex(work: Work) -> str:
    """A BibTeX entry drafted from the source's own fields, used when the registrar has nothing."""
    if work.source == "scholar" and not work.doi:
        from scholarly import scholarly

        try:
            scholarly.fill(work.raw)
            return scholarly.bibtex(work.raw).strip()
        except Exception as error:  # noqa: BLE001 — Scholar fails in many ways; the draft is best-effort
            return f"% could not fetch details from Google Scholar ({error.__class__.__name__}); title: {work.title}"
    etype = {"journal": "article", "conference": "inproceedings", "chapter": "incollection"}.get(work.kind or "", "misc")
    venue_field = {"article": "journal", "inproceedings": "booktitle", "incollection": "booktitle"}.get(etype, "howpublished")
    fields = {
        "author": " and ".join(work.authors),
        "title": bib_escape(work.title),
        venue_field: bib_escape(work.venue) if work.venue else "",
        "year": str(work.year) if work.year else "",
        "volume": work.volume or "",
        "number": work.number or "",
        "pages": work.pages or "",
        "doi": work.doi or "",
        "url": work.oa_url or "",
    }
    return format_entry(etype, bibtex_key(work), fields)


def bibtex_for(work: Work, mailto: str | None) -> str:
    if work.doi:
        text = registrar_bibtex(work.doi, mailto)
        tidy = tidy_registrar_bibtex(text, work) if text else None
        if tidy:
            return tidy
        return f"% doi.org returned no BibTeX for {work.doi}; drafted from the source instead:\n" + draft_bibtex(work)
    return "% no DOI known; drafted from the source:\n" + draft_bibtex(work)


def describe(work: Work) -> str:
    bits = [b for b in (work.venue, f"doi:{work.doi}" if work.doi else None, work.kind if work.kind and work.kind != "other" else None) if b]
    lines = [f"{work.year or '????'}  {work.title}"]
    if bits:
        lines.append(textwrap.fill(" · ".join(bits), 96, initial_indent="      ", subsequent_indent="      "))
    if work.doi_note:
        lines.append(f"      {work.doi_note}")
    page = work.landing or (work.url if work.source == "scholar" else None)
    if page:
        lines.append(f"      page: {page}")
    if work.oa_url:
        lines.append(f"      open access: {work.oa_url}")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[1], formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--person", default="enrico-fraccaroli", help="slug of the team member (src/content/people/<slug>.md)")
    parser.add_argument("--source", choices=("scholar", "openalex", "both"), default="scholar", help="where to look (default: scholar)")
    parser.add_argument("--since", type=int, default=None, help="earliest publication year (default: the project start year from site.ts)")
    parser.add_argument("--bibtex", action="store_true", help="print a BibTeX entry for every suggestion, fetched from the DOI registrar")
    parser.add_argument("--json", action="store_true", help="print the suggestions as JSON instead of the report")
    parser.add_argument("--include-superseded", action="store_true", help="also list preprints whose published version was found")
    parser.add_argument("--include-undated", action="store_true", help="also list items without a year (usually Scholar profile noise)")
    parser.add_argument("--no-resolve", action="store_true", help="skip Crossref and doi.org: no DOI lookup by title, no publisher page")
    args = parser.parse_args()

    person_file = PEOPLE / f"{args.person}.md"
    if not person_file.exists():
        available = ", ".join(sorted(p.stem for p in PEOPLE.glob("[!_]*.md")))
        raise SystemExit(f"no team member '{args.person}' (available: {available})")
    person = read_frontmatter(person_file)
    since = args.since or project_start_year()
    mailto = person.get("email") or site_email()
    bib = parse_bib(BIB.read_text(encoding="utf-8"))

    scholar_id = None
    if person.get("scholar"):
        m = re.search(r"[?&]user=([A-Za-z0-9_-]+)", person["scholar"])
        scholar_id = m.group(1) if m else None
    orcid = person.get("orcid")

    works: list[Work] = []
    errors: list[str] = []
    sources_used: list[str] = []
    if args.source in ("scholar", "both"):
        if not scholar_id:
            errors.append(f"{args.person} has no Google Scholar link in the people record")
        else:
            try:
                works += fetch_scholar(scholar_id, since)
                sources_used.append(f"Google Scholar (user {scholar_id})")
            except Exception as error:  # noqa: BLE001 — network, captcha, layout change: all end the same way
                errors.append(f"Google Scholar failed ({error.__class__.__name__}: {str(error)[:120]}). Google blocks scrapers; retry later or use --source openalex.")
    if args.source in ("openalex", "both"):
        if not orcid:
            errors.append(f"{args.person} has no ORCID in the people record")
        else:
            try:
                works += fetch_openalex(orcid, since, mailto)
                sources_used.append(f"OpenAlex (ORCID {orcid})")
            except Exception as error:  # noqa: BLE001
                errors.append(f"OpenAlex failed ({error.__class__.__name__}: {str(error)[:120]})")

    if not sources_used:
        for e in errors:
            print(f"error: {e}", file=sys.stderr)
        return 2

    # Merge duplicates across sources (and within a source), preferring records with a DOI.
    merged: list[Work] = []
    for w in sorted(works, key=lambda w: (w.doi is None, w.source)):
        if not w.title:
            continue
        if not any((w.doi and w.doi == m.doi) or same_title(w.title, m.title) for m in merged):
            merged.append(w)
    merged, superseded = drop_superseded_preprints(merged)
    if args.include_superseded:
        merged += superseded
    undated = [w for w in merged if w.year is None]
    if not args.include_undated:
        merged = [w for w in merged if w.year is not None]

    listed = [(w, e) for w in merged if (e := find_in_bib(w, bib))]
    listed_keys = {e.key for _, e in listed}
    suggestions = sorted((w for w in merged if find_in_bib(w, bib) is None), key=lambda w: (-(w.year or 0), w.title))
    unmatched_bib = [e for e in bib if e.key not in listed_keys and (e.year or 0) >= since]

    if not args.no_resolve:
        for w in suggestions:
            if not w.doi:
                found = find_doi_by_title(w.title, mailto)
                if found:
                    w.doi, w.doi_note = found, "DOI found on Crossref by title"
                    if find_in_bib(w, bib):
                        w.doi_note += " — already in publications.bib under that DOI"
            if w.doi:
                w.landing = landing_page(w.doi, mailto)
        suggestions = [w for w in suggestions if not (w.doi_note and "already" in w.doi_note)]

    if args.json:
        print(json.dumps([{k: v for k, v in asdict(w).items() if k != "raw"} for w in suggestions], indent=2, ensure_ascii=False))
        return 0

    print(f"Source: {' + '.join(sources_used)} — {len(merged)} publications since {since} for {person.get('name', args.person)}")
    for e in errors:
        print(f"warning: {e}")
    print(f"Already in publications.bib: {len(listed)}")
    if superseded and not args.include_superseded:
        print(f"Preprints superseded by a published version (hidden, --include-superseded shows them): {len(superseded)}")
    if undated and not args.include_undated:
        print(f"Items without a year, usually profile noise (hidden, --include-undated shows them): {len(undated)}")
    print()
    if suggestions:
        print(f"Suggested additions ({len(suggestions)}):")
        for w in suggestions:
            print("  " + describe(w).replace("\n", "\n  "))
            if args.bibtex:
                print(textwrap.indent(bibtex_for(w, mailto), "      "))
            print()
    else:
        print("Nothing to add: every publication found is already in the bibliography.\n")
    if unmatched_bib:
        print(f"In publications.bib but not found at the source ({len(unmatched_bib)}):")
        for e in unmatched_bib:
            print(f"  {e.year or '????'}  {e.title}  [{e.key}]")
        print()
    print("Nothing was written. Add the entries you want to src/data/publications.bib and run `npm run ci`.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
