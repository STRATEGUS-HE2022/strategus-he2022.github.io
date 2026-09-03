/**
 * Publication records: BibTeX entries + optional overrides → plain objects used by
 * the `publications` collection and the pages. Pure functions (no Astro imports) so
 * they can be unit-tested with Node's test runner.
 */
import { splitNames, type BibEntry } from './bibtex.ts';

export type VenueKind = 'journal' | 'conference' | 'chapter' | 'book' | 'thesis' | 'report' | 'preprint' | 'other';

export interface Publication {
  /** BibTeX citation key (unique id). */
  key: string;
  /** BibTeX entry type. */
  type: string;
  title: string;
  /** Display names, "Given Family", in publication order. */
  authors: string[];
  year: number;
  /** Journal, conference, publisher, school or institution — whatever names the venue. */
  venue?: string;
  venueKind: VenueKind;
  volume?: string;
  number?: string;
  pages?: string;
  publisher?: string;
  doi?: string;
  /** A non-DOI link given in the entry: the open-access copy (institutional repository, arXiv). */
  url?: string;
  /** DBLP record page. */
  dblp?: string;
  /** Local (/documents/…) or external PDF, set through the overrides file. */
  pdf?: string;
  /** Code repository. */
  code?: string;
  note?: string;
  featured: boolean;
  /** Hidden entries stay in the data set but are never rendered or exported. */
  hidden: boolean;
  /** Slugs of people linked through the overrides file, when name matching is not enough. */
  people: string[];
}

export interface PublicationOverride {
  featured?: boolean;
  hidden?: boolean;
  pdf?: string;
  code?: string;
  note?: string;
  people?: string[];
}

export type PublicationOverrides = Record<string, PublicationOverride>;

const PREPRINT_JOURNALS = /^(corr|arxiv|biorxiv|medrxiv|ssrn|techrxiv|hal)\b/i;

/** Convert one parsed BibTeX entry into a Publication. */
export function entryToPublication(entry: BibEntry): Publication {
  const f = entry.fields;
  const year = Number.parseInt(f.year ?? '', 10);
  if (!Number.isFinite(year)) {
    throw new Error(`Publication "${entry.key}" has no numeric year field`);
  }
  if (!f.title) {
    throw new Error(`Publication "${entry.key}" has no title field`);
  }

  const { venue, venueKind } = venueOf(entry);
  const doi = doiOf(f);

  return {
    key: entry.key,
    type: entry.type,
    title: f.title,
    authors: splitNames(f.author ?? f.editor ?? ''),
    year,
    venue,
    venueKind,
    volume: f.volume,
    number: f.number,
    pages: f.pages?.replace(/--/g, '–').replace(/(\d)-(\d)/g, '$1–$2'),
    publisher: f.publisher,
    doi,
    url: f.url && !isDoiUrl(f.url) ? f.url : f.ee && !isDoiUrl(f.ee) ? f.ee : undefined,
    dblp: dblpOf(entry),
    featured: false,
    hidden: false,
    people: [],
  };
}

function venueOf(entry: BibEntry): { venue?: string; venueKind: VenueKind } {
  const f = entry.fields;
  const isArxiv = /arxiv/i.test(f.eprinttype ?? f.archiveprefix ?? '') || (f.journal !== undefined && PREPRINT_JOURNALS.test(f.journal));
  switch (entry.type) {
    case 'article':
      return { venue: f.journal, venueKind: isArxiv ? 'preprint' : 'journal' };
    case 'inproceedings':
    case 'conference':
      return { venue: f.booktitle, venueKind: 'conference' };
    case 'incollection':
    case 'inbook':
      return { venue: f.booktitle ?? f.title, venueKind: 'chapter' };
    case 'proceedings':
      // Edited proceedings (DBLP "Editorship"): the venue acronym may be given as booktitle.
      return { venue: f.booktitle ?? f.series ?? f.publisher, venueKind: 'book' };
    case 'book':
      return { venue: f.publisher ?? f.series, venueKind: 'book' };
    case 'phdthesis':
    case 'mastersthesis':
      return { venue: f.school, venueKind: 'thesis' };
    case 'techreport':
      return { venue: f.institution, venueKind: 'report' };
    default:
      return { venue: f.journal ?? f.booktitle ?? f.howpublished ?? f.publisher, venueKind: isArxiv ? 'preprint' : 'other' };
  }
}

function isDoiUrl(url: string): boolean {
  return /^https?:\/\/(dx\.)?doi\.org\//i.test(url);
}

function doiOf(f: Record<string, string>): string | undefined {
  const explicit = f.doi?.trim();
  if (explicit) return explicit.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  for (const candidate of [f.url, f.ee]) {
    if (candidate && isDoiUrl(candidate)) return candidate.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  }
  return undefined;
}

function dblpOf(entry: BibEntry): string | undefined {
  const biburl = entry.fields.biburl;
  if (biburl && /dblp\.org\/rec\//.test(biburl)) return biburl.replace(/\.bib$/, '.html');
  if (entry.key.startsWith('DBLP:')) return `https://dblp.org/rec/${entry.key.slice('DBLP:'.length)}.html`;
  return undefined;
}

/** Merge the overrides file into the publications (mutates and returns the array). */
export function applyOverrides(
  publications: Publication[],
  overrides: PublicationOverrides | null | undefined,
  warn: (message: string) => void = () => {},
): Publication[] {
  const byKey = new Map(publications.map((p) => [p.key, p]));
  for (const [key, override] of Object.entries(overrides ?? {})) {
    const publication = byKey.get(key);
    if (!publication) {
      warn(`publications.overrides: key "${key}" does not exist in the bibliography and was ignored`);
      continue;
    }
    if (override.featured !== undefined) publication.featured = override.featured;
    if (override.hidden !== undefined) publication.hidden = override.hidden;
    if (override.pdf !== undefined) publication.pdf = override.pdf;
    if (override.code !== undefined) publication.code = override.code;
    if (override.note !== undefined) publication.note = override.note;
    if (override.people) publication.people = [...override.people];
  }
  return publications;
}

/** Newest first, then by title. */
export function sortPublications<T extends { year: number; title: string }>(publications: T[]): T[] {
  return [...publications].sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
}

/** Group (already sorted) publications by year, newest first. */
export function groupByYear<T extends { year: number }>(publications: T[]): Array<{ year: number; items: T[] }> {
  const groups = new Map<number, T[]>();
  for (const p of sortPublications(publications as Array<T & { title: string }>)) {
    const items = groups.get(p.year);
    if (items) items.push(p);
    else groups.set(p.year, [p]);
  }
  return [...groups.entries()].map(([year, items]) => ({ year, items }));
}

// --- Matching authors to people -------------------------------------------------

/** Lower-case ASCII tokens: "Nicola Dall'Ora" → ["nicola", "dallora"]. */
export function nameTokens(name: string): string[] {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’'`´\-]/g, '')
    .replace(/[.,]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Does an author string (from BibTeX) denote this person?
 * Exact normalised match on the name or any alias; otherwise the family name must
 * match and every given-name token must be equal or an initial of the person's.
 */
export function authorMatchesPerson(author: string, person: { name: string; aliases?: readonly string[] }): boolean {
  const authorTokens = nameTokens(author);
  if (authorTokens.length === 0) return false;
  const candidates = [person.name, ...(person.aliases ?? [])];
  for (const candidate of candidates) {
    const personTokens = nameTokens(candidate);
    if (personTokens.length === 0) continue;
    if (authorTokens.join(' ') === personTokens.join(' ')) return true;
    if (authorTokens.length < 2 || personTokens.length < 2) continue;
    if (authorTokens.at(-1) !== personTokens.at(-1)) continue;
    const authorGiven = authorTokens.slice(0, -1);
    const personGiven = personTokens.slice(0, -1);
    const pairs = Math.min(authorGiven.length, personGiven.length);
    let ok = true;
    for (let i = 0; i < pairs; i++) {
      const a = authorGiven[i]!;
      const p = personGiven[i]!;
      if (a !== p && !(a.length === 1 && p.startsWith(a))) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

/** Publications by a person: explicit override link, or author-name match. */
export function publicationsForPerson<T extends Publication>(
  publications: T[],
  person: { id: string; name: string; aliases?: readonly string[] },
): T[] {
  return publications.filter(
    (p) => p.people.includes(person.id) || p.authors.some((author) => authorMatchesPerson(author, person)),
  );
}

/** "A, B and C" for display. */
export function formatAuthors(authors: readonly string[]): string {
  if (authors.length <= 1) return authors[0] ?? '';
  return `${authors.slice(0, -1).join(', ')} and ${authors.at(-1)}`;
}

/** One-line venue description: "IEEE Trans. Computers 72(3), pp. 1–12". */
export function formatVenueLine(p: Publication): string {
  const parts: string[] = [];
  if (p.venue) parts.push(p.venue);
  const vol = p.volume ? `${p.volume}${p.number ? `(${p.number})` : ''}` : p.number ? `(${p.number})` : '';
  if (vol) parts.push(vol);
  if (p.pages) parts.push(`pp. ${p.pages}`);
  if (!p.venue && p.publisher) parts.push(p.publisher);
  return parts.join(', ');
}
