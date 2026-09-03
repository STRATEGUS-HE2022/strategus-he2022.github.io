/**
 * Invariants of the published content: file names, resolvable cross-references and
 * images, no contact details beyond the sanctioned `email` field, and a well-formed
 * bibliography whose every entry has an author on the team.
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { parseBibtex, splitNames } from '../src/lib/bibtex.ts';
import { authorMatchesPerson } from '../src/lib/publications.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CONTENT = path.join(ROOT, 'src/content');
const DATA = path.join(ROOT, 'src/data');
const COLLECTIONS = ['people', 'news'];
const CATEGORIES = ['Project', 'Publication', 'Event', 'Release'];
const INSTITUTIONS = ['univr', 'unc'];
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
// Italian landline/mobile shapes, with or without the +39 prefix; not inside DOIs or URLs.
const PHONE = /(?<![\w./-])(?:\+\d{2}\s?)?\(?0\d{1,3}\)?[\s.-]?\d{6,8}(?![\w./-])/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function entries(collection) {
  const dir = path.join(CONTENT, collection);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .map((file) => {
      const src = readFileSync(path.join(dir, file), 'utf8');
      const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(src);
      assert.ok(m, `${collection}/${file}: missing frontmatter`);
      return { collection, file, slug: file.slice(0, -3), data: YAML.parse(m[1]), body: m[2], dir };
    });
}
const all = Object.fromEntries(COLLECTIONS.map((c) => [c, entries(c)]));
const slugs = Object.fromEntries(COLLECTIONS.map((c) => [c, new Set(all[c].map((e) => e.slug))]));
const label = (e) => `${e.collection}/${e.file}`;

test('file names are lower-case slugs and news files start with their date', () => {
  for (const c of COLLECTIONS) {
    for (const e of all[c]) {
      assert.match(e.slug, SLUG, label(e));
      if (c === 'news') {
        const date = String(e.data.date instanceof Date ? e.data.date.toISOString() : e.data.date).slice(0, 10);
        assert.ok(e.slug.startsWith(`${date}-`), `${label(e)}: file name must start with ${date}-`);
        assert.ok(e.slug.length > 11, `${label(e)}: the file name needs a title part after the date`);
      }
    }
  }
});

test('news items carry a known category and people a known institution', () => {
  for (const e of all.news) assert.ok(CATEGORIES.includes(e.data.category), `${label(e)}: category "${e.data.category}" is not one of ${CATEGORIES.join(', ')}`);
  for (const e of all.people) assert.ok(INSTITUTIONS.includes(e.data.institution), `${label(e)}: institution "${e.data.institution}" is not one of ${INSTITUTIONS.join(', ')}`);
});

test('news bodies start their headings at h2, under the page title', () => {
  for (const e of all.news) {
    const first = /^(#{1,6}) /m.exec(e.body);
    if (first) assert.equal(first[1], '##', `${label(e)}: the first heading in the body is ${first[1]}; headings start at ##`);
    assert.doesNotMatch(e.body, /^# /m, `${label(e)}: a body must not contain an h1`);
  }
});

test('no e-mail addresses or telephone numbers outside the sanctioned email field', () => {
  for (const e of COLLECTIONS.flatMap((c) => all[c])) {
    assert.doesNotMatch(e.body, EMAIL, `${label(e)}: e-mail address in the body`);
    assert.doesNotMatch(e.body, PHONE, `${label(e)}: telephone number in the body`);
    for (const [key, value] of Object.entries(e.data)) {
      if (key === 'email') continue;
      const text = JSON.stringify(value);
      assert.doesNotMatch(text, EMAIL, `${label(e)}: e-mail address in field ${key}`);
      assert.doesNotMatch(text, PHONE, `${label(e)}: telephone number in field ${key}`);
    }
  }
});

test('cross-references point at existing records', () => {
  for (const e of all.news) {
    for (const field of ['author', 'people']) {
      const value = e.data[field];
      if (value === undefined) continue;
      for (const ref of Array.isArray(value) ? value : [value]) {
        assert.ok(slugs.people.has(ref), `${label(e)}: ${field} "${ref}" is not a people record`);
      }
    }
  }
});

test('relative image references exist next to the file', () => {
  for (const c of COLLECTIONS) {
    for (const e of all[c]) {
      const value = e.data.photo;
      if (typeof value !== 'string') continue;
      assert.ok(existsSync(path.join(e.dir, value)), `${label(e)}: photo ${value} not found`);
    }
  }
});

test('bibliography parses, keys are unique, overrides refer to known keys and records', () => {
  const bib = parseBibtex(readFileSync(path.join(DATA, 'publications.bib'), 'utf8'));
  assert.ok(bib.length > 0, 'the bibliography is empty');
  const keys = new Set();
  for (const entry of bib) {
    assert.ok(!keys.has(entry.key), `duplicate BibTeX key ${entry.key}`);
    keys.add(entry.key);
    assert.ok(entry.fields.title, `${entry.key}: title missing`);
    assert.ok(entry.fields.author || entry.fields.editor, `${entry.key}: author/editor missing`);
    assert.match(entry.fields.year ?? '', /^\d{4}$/, `${entry.key}: year missing`);
    assert.doesNotMatch(entry.raw.booktitle ?? '', /(?<!\\)&/, `${entry.key}: write "\\&" for an ampersand in BibTeX`);
  }
  const overrides = YAML.parse(readFileSync(path.join(DATA, 'publications.overrides.yaml'), 'utf8')) ?? {};
  for (const [key, ov] of Object.entries(overrides)) {
    assert.ok(keys.has(key), `overrides: unknown key ${key}`);
    for (const ref of ov.people ?? []) assert.ok(slugs.people.has(ref), `overrides ${key}: people "${ref}" does not exist`);
  }
});

test('every publication has an author among the team', () => {
  const bib = parseBibtex(readFileSync(path.join(DATA, 'publications.bib'), 'utf8'));
  const team = all.people.map((p) => ({ name: p.data.name, aliases: p.data.aliases ?? [] }));
  const unmatched = bib.filter((entry) => {
    const authors = splitNames(entry.fields.author ?? entry.fields.editor ?? '');
    return !authors.some((author) => team.some((person) => authorMatchesPerson(author, person)));
  });
  assert.deepEqual(unmatched.map((e) => e.key), [], 'publications without a team author (curation rule)');
});

test('inline Markdown images have alt text and exist next to the file', () => {
  const IMAGE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  for (const e of COLLECTIONS.flatMap((c) => all[c])) {
    for (const [, alt, src] of e.body.matchAll(IMAGE)) {
      assert.ok(alt.trim() !== '', `${label(e)}: ![](${src}) has no alt text`);
      if (src.startsWith('.')) assert.ok(existsSync(path.join(e.dir, src)), `${label(e)}: ${src} does not exist`);
    }
  }
});
