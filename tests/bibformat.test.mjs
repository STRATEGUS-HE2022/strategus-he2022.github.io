/**
 * scripts/format-bib.mjs: the canonical layout of publications.bib, and the rule that the
 * committed file is already in it (so `npm run ci` says when to run the formatter).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { formatBibtex, strayText } from '../scripts/format-bib.mjs';
import { parseBibtex } from '../src/lib/bibtex.ts';

const BIB = new URL('../src/data/publications.bib', import.meta.url);

const messy = `@inproceedings{late,
  title = {Second & Last},
  author = {Zeta, Anna and Beta, Bob},
  booktitle={Proc. X},
  volume = {},
  year = {2023},
  pages = {1-8},
  abstract = {long text},
  url = {https://example.org/?a=1&b=2}
}
% an old divider
@article{new, author = {Alpha, Ann}, journal = {J}, title = {Newest},   year = {2025}, pages = {12–19}}
@article{new2, author = {Beta, Bob}, journal = {J}, title = {Also 2025}, year = {2025}}
`;

test('sorts newest year first, then by first author, and opens each year with a divider', () => {
  const { text } = formatBibtex(messy);
  const keys = [...text.matchAll(/^@\w+\{([^,]+),/gm)].map((m) => m[1]);
  assert.deepEqual(keys, ['new', 'new2', 'late']);
  const dividers = [...text.matchAll(/^% (\d{4})$/gm)].map((m) => m[1]);
  assert.deepEqual(dividers, ['2025', '2023']);
  assert.match(text, /^% ={77}$/m);
});

test('canonical field layout: fixed order, aligned =, braces, no trailing comma, empties and abstracts dropped', () => {
  const { text, notes } = formatBibtex(messy);
  const start = text.indexOf('@inproceedings{late,');
  const late = text.slice(start, text.indexOf('\n}', start) + 2); // up to the entry's own closing brace
  assert.equal(
    late,
    [
      '@inproceedings{late,',
      '  author    = {Zeta, Anna and Beta, Bob},',
      '  title     = {Second \\& Last},',
      '  booktitle = {Proc. X},',
      '  year      = {2023},',
      '  pages     = {1--8},',
      '  url       = {https://example.org/?a=1&b=2}',
      '}',
    ].join('\n'),
  );
  assert.ok(notes.some((n) => n.includes('late: dropped empty field volume')));
  assert.ok(notes.some((n) => n.includes('late: dropped abstract')));
  assert.match(text, /pages\s+= \{12--19\}/, 'en dashes in page ranges become --');
});

test('formatting is idempotent and keeps every entry parseable', () => {
  const once = formatBibtex(messy).text;
  const twice = formatBibtex(once).text;
  assert.equal(twice, once);
  assert.equal(parseBibtex(once).length, 3);
  assert.equal(parseBibtex(once).find((e) => e.key === 'late').fields.title, 'Second & Last');
});

test('refuses to drop text that is neither an entry nor a comment, and duplicate keys', () => {
  assert.throws(() => formatBibtex('some prose\n@article{a, title = {T}, year = {2020}}'), /text outside entries/);
  assert.equal(strayText('% only comments\n\n@misc{a, title = {T}}\n'), null);
  assert.throws(() => formatBibtex('@article{a, title = {T}, year = {2020}}\n@article{a, title = {U}, year = {2021}}'), /duplicate citation key a/);
});

test('src/data/publications.bib is formatted (run `npm run format:bib`)', () => {
  const source = readFileSync(BIB, 'utf8');
  const { text } = formatBibtex(source);
  assert.equal(text, source, 'publications.bib is not in canonical form — run `npm run format:bib` and commit the result');
});
