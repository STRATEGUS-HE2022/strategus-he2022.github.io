#!/usr/bin/env node
/**
 * Format src/data/publications.bib: one canonical layout, newest year first, a divider
 * per year.
 *
 *   node scripts/format-bib.mjs            rewrite the file in place
 *   node scripts/format-bib.mjs --check    exit 1 if the file is not already formatted
 *   node scripts/format-bib.mjs --stdout   print the formatted file, write nothing
 *
 * What it does:
 *   - sorts entries by year, newest first, then by the first author's family name and
 *     the title, and opens every year with a `% ====` divider;
 *   - writes every entry the same way: `@type{key,`, fields in a fixed order (author,
 *     title, venue, year, volume, number, pages, month, keywords, identifiers, url…) with
 *     aligned `=`, values in braces, no trailing comma on the last field;
 *   - drops empty fields (`volume = {}`), and the `abstract`, `file` and `annote` fields
 *     docs/publications.md says not to keep;
 *   - normalises page ranges to `1--8` and escapes a bare `&` as `\&` (never inside a URL
 *     or a DOI);
 *   - keeps everything else exactly as written: braces protecting acronyms, LaTeX accents,
 *     the citation keys.
 *
 * It refuses to run when the file contains text that is neither an entry nor a `%`
 * comment, because that text would be lost. `%` comments are regenerated, so put notes
 * about an entry in its `note` field, not in a comment.
 *
 * The same code is used by tests/bibformat.test.mjs to check that the committed file is
 * formatted, so `npm run ci` tells you when to run this. Uses the site's own BibTeX
 * parser (src/lib/bibtex.ts); no dependencies.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBibtex, splitNames } from '../src/lib/bibtex.ts';

const DEFAULT_FILE = 'src/data/publications.bib';

/** Fields in the order they are written; anything else follows, alphabetically. */
const FIELD_ORDER = [
  'author', 'editor', 'title', 'booktitle', 'journal', 'howpublished', 'school', 'institution',
  'publisher', 'series', 'edition', 'chapter', 'year', 'month', 'volume', 'number', 'pages',
  'address', 'keywords', 'issn', 'isbn', 'doi', 'url', 'ee', 'biburl', 'note',
];
/** A bare `&` is an error in BibTeX text but part of the syntax in an address. */
const NO_ESCAPE = new Set(['url', 'doi', 'ee', 'biburl']);
/** Fields the bibliography does not keep (local paths, private notes, long abstracts). */
const DROP = new Set(['abstract', 'file', 'annote']);
const MIN_WIDTH = 9; // `booktitle`, the longest common name, so most entries align the same way

const RULE = `% ${'='.repeat(77)}`;
const HEADER = [
  '% STRATEGUS bibliography — src/data/publications.bib',
  '% Formatted by `npm run format:bib`: newest year first, one divider per year, fields in a',
  '% fixed order. Edit freely, then run the formatter; the tests check the file is formatted.',
  '% See docs/publications.md.',
].join('\n');

/** Text that is neither a `%` comment line nor an entry — content the formatter would drop. */
export function strayText(source) {
  let i = 0;
  const n = source.length;
  while (i < n) {
    const ch = source[i];
    if (/\s/.test(ch)) {
      i++;
    } else if (ch === '%') {
      const eol = source.indexOf('\n', i);
      i = eol === -1 ? n : eol + 1;
    } else if (ch === '@') {
      let j = i + 1;
      while (j < n && /[A-Za-z]/.test(source[j])) j++;
      while (j < n && /\s/.test(source[j])) j++;
      const open = source[j];
      if (open !== '{' && open !== '(') return source.slice(i, Math.min(n, i + 80));
      const close = open === '{' ? '}' : ')';
      let depth = 0;
      for (; j < n; j++) {
        if (source[j] === open || (open === '(' && source[j] === '{')) depth++;
        else if (source[j] === close || (open === '(' && source[j] === '}')) depth--;
        if (depth === 0) break;
      }
      if (j >= n) return source.slice(i, Math.min(n, i + 80));
      i = j + 1;
    } else {
      const eol = source.indexOf('\n', i);
      return source.slice(i, eol === -1 ? n : eol);
    }
  }
  return null;
}

function normalizeEntry(entry, notes) {
  const fields = {};
  const empty = [];
  for (const [name, rawValue] of Object.entries(entry.raw)) {
    let value = rawValue.replace(/\s+/g, ' ').trim();
    if (value === '') {
      empty.push(name);
      continue;
    }
    if (DROP.has(name)) {
      notes.push(`${entry.key}: dropped ${name} (not kept in this bibliography)`);
      continue;
    }
    if (name === 'pages') value = value.replace(/\s*[–—]\s*/g, '--').replace(/(\d)\s*-\s*(?=\d)/g, '$1--');
    if (!NO_ESCAPE.has(name)) value = value.replace(/(?<!\\)&/g, '\\&');
    fields[name] = value;
  }
  if (empty.length > 0) notes.push(`${entry.key}: dropped empty field${empty.length > 1 ? 's' : ''} ${empty.join(', ')}`);
  return { type: entry.type.toLowerCase(), key: entry.key, fields, decoded: entry.fields };
}

function familyName(fields) {
  const [first] = splitNames(fields.author ?? fields.editor ?? '');
  const tokens = (first ?? '').split(/\s+/);
  return (tokens[tokens.length - 1] ?? '').toLowerCase();
}

function yearOf(fields) {
  const year = Number.parseInt(fields.year ?? '', 10);
  return Number.isFinite(year) ? year : null;
}

function compareEntries(a, b) {
  const ya = yearOf(a.decoded) ?? -Infinity;
  const yb = yearOf(b.decoded) ?? -Infinity;
  if (ya !== yb) return yb - ya;
  return familyName(a.decoded).localeCompare(familyName(b.decoded)) || (a.decoded.title ?? '').localeCompare(b.decoded.title ?? '') || a.key.localeCompare(b.key);
}

function renderEntry({ type, key, fields }) {
  const names = [...FIELD_ORDER.filter((n) => n in fields), ...Object.keys(fields).filter((n) => !FIELD_ORDER.includes(n)).sort()];
  const width = Math.max(MIN_WIDTH, ...names.map((n) => n.length));
  const lines = names.map((n) => `  ${n.padEnd(width)} = {${fields[n]}},`);
  if (lines.length > 0) lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1);
  return [`@${type}{${key},`, ...lines, '}'].join('\n');
}

/** Format a BibTeX document. Returns the text and a list of notes about what was changed. */
export function formatBibtex(source) {
  const notes = [];
  const stray = strayText(source);
  if (stray !== null) {
    throw new Error(`text outside entries would be lost — move it into an entry's note field or delete it: ${JSON.stringify(stray)}`);
  }
  const entries = parseBibtex(source);
  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry.key)) throw new Error(`duplicate citation key ${entry.key}`);
    seen.add(entry.key);
  }
  const normalized = entries.map((entry) => normalizeEntry(entry, notes)).sort(compareEntries);

  const blocks = [HEADER];
  let currentYear;
  for (const entry of normalized) {
    const year = yearOf(entry.decoded);
    const label = year === null ? 'Without a year' : String(year);
    if (label !== currentYear) {
      currentYear = label;
      blocks.push(`${RULE}\n% ${label}\n${RULE}`);
      if (year === null) notes.push(`${entry.key}: no year — the site rejects this entry`);
    }
    blocks.push(renderEntry(entry));
  }
  const text = `${blocks.join('\n\n')}\n`;

  // The formatted text must describe the same bibliography: same keys, same decoded fields
  // (apart from the fields deliberately dropped and the two normalisations above).
  const after = new Map(parseBibtex(text).map((e) => [e.key, e]));
  for (const before of entries) {
    const entry = after.get(before.key);
    if (!entry) throw new Error(`internal error: entry ${before.key} disappeared`);
    for (const [name, value] of Object.entries(before.fields)) {
      if (DROP.has(name) || value.trim() === '') continue;
      const expected = name === 'pages' ? value.replace(/\s*[–—]\s*/g, '–').replace(/(\d)\s*-\s*(?=\d)/g, '$1–') : value.replace(/\s+/g, ' ').trim();
      const actual = (entry.fields[name] ?? '').replace(/\s+/g, ' ').trim();
      if (actual !== expected.replace(/\s+/g, ' ').trim()) throw new Error(`internal error: ${before.key}.${name} changed from ${JSON.stringify(value)} to ${JSON.stringify(entry.fields[name])}`);
    }
  }
  return { text, notes, count: entries.length };
}

// --- Command line ---------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const stdout = args.includes('--stdout');
  const file = args.find((a) => !a.startsWith('--')) ?? path.join(fileURLToPath(new URL('..', import.meta.url)), DEFAULT_FILE);
  const rel = path.relative(process.cwd(), file) || file;
  const source = readFileSync(file, 'utf8');
  let result;
  try {
    result = formatBibtex(source);
  } catch (error) {
    console.error(`✗ ${rel}: ${error.message}`);
    process.exit(1);
  }
  if (stdout) {
    process.stdout.write(result.text);
  } else if (check) {
    if (result.text !== source) {
      console.error(`✗ ${rel} is not formatted — run \`npm run format:bib\``);
      process.exit(1);
    }
    console.log(`✓ ${rel}: ${result.count} entries, formatted`);
  } else if (result.text === source) {
    console.log(`✓ ${rel}: ${result.count} entries, already formatted`);
  } else {
    writeFileSync(file, result.text);
    console.log(`✓ ${rel}: ${result.count} entries formatted`);
  }
  for (const note of result.notes) console.error(`  · ${note}`);
}
