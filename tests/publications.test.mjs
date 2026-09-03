import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseBibtex } from '../src/lib/bibtex.ts';
import {
  applyOverrides,
  authorMatchesPerson,
  entryToPublication,
  formatAuthors,
  formatVenueLine,
  groupByYear,
  nameTokens,
  publicationsForPerson,
} from '../src/lib/publications.ts';

const bib = `
@inproceedings{DBLP:conf/date/FummiL24,
  author = {Franco Fummi and Michele Lora},
  title = {A Paper},
  booktitle = {DATE},
  pages = {1-6},
  year = {2024},
  url = {https://doi.org/10.23919/DATE.2024.1},
  biburl = {https://dblp.org/rec/conf/date/FummiL24.bib}
}
@article{DBLP:journals/corr/abs-2101-1,
  author = {Nicola Dall'Ora},
  title = {Preprint},
  journal = {CoRR},
  volume = {abs/2101.1},
  year = {2021},
  url = {https://arxiv.org/abs/2101.1}
}
@phdthesis{thesis1, author = {Dora Fixture}, title = {Thesis}, school = {University of Verona}, year = {2022}}
@proceedings{DBLP:conf/fixture/2018, editor = {Ada Fixture and Ben Fixture}, title = {Proceedings of the Fixture Conference}, booktitle = {FIX}, series = {LNCS}, year = {2018}}
`;

test('a non-DOI url survives beside the DOI as the open-access copy', () => {
  const [entry] = parseBibtex(`@article{oa, author = {A B}, title = {T}, journal = {J}, year = {2024},
    doi = {10.1000/x}, url = {https://iris.example.org/paper.pdf}}`);
  const p = entryToPublication(entry);
  assert.equal(p.doi, '10.1000/x');
  assert.equal(p.url, 'https://iris.example.org/paper.pdf');
});

test('entryToPublication derives venue, DOI and DBLP link', () => {
  const [conf, preprint, thesis, proceedings] = parseBibtex(bib).map(entryToPublication);
  assert.equal(conf.venueKind, 'conference');
  assert.equal(conf.venue, 'DATE');
  assert.equal(conf.doi, '10.23919/DATE.2024.1');
  assert.equal(conf.url, undefined, 'DOI urls are not duplicated as plain urls');
  assert.equal(conf.dblp, 'https://dblp.org/rec/conf/date/FummiL24.html');
  assert.equal(conf.pages, '1–6');
  assert.deepEqual(conf.authors, ['Franco Fummi', 'Michele Lora']);
  assert.equal(preprint.venueKind, 'preprint');
  assert.equal(preprint.dblp, 'https://dblp.org/rec/journals/corr/abs-2101-1.html');
  assert.equal(preprint.url, 'https://arxiv.org/abs/2101.1');
  assert.equal(thesis.venueKind, 'thesis');
  assert.equal(thesis.venue, 'University of Verona');
  assert.equal(proceedings.venueKind, 'book');
  assert.equal(proceedings.venue, 'FIX', 'edited proceedings use booktitle as venue');
  assert.deepEqual(proceedings.authors, ['Ada Fixture', 'Ben Fixture'], 'editors stand in for authors');
});

test('entryToPublication rejects entries without year or title', () => {
  assert.throws(() => entryToPublication(parseBibtex('@misc{x, title={T}}')[0]), /no numeric year/);
  assert.throws(() => entryToPublication(parseBibtex('@misc{x, year={2020}}')[0]), /no title/);
});

test('applyOverrides merges known keys and warns on unknown ones', () => {
  const pubs = parseBibtex(bib).map(entryToPublication);
  const warnings = [];
  applyOverrides(pubs, { 'DBLP:conf/date/FummiL24': { featured: true, pdf: '/documents/x.pdf', code: 'https://example.org/code' }, nope: { hidden: true } }, (m) => warnings.push(m));
  assert.equal(pubs[0].featured, true);
  assert.equal(pubs[0].pdf, '/documents/x.pdf');
  assert.equal(pubs[0].code, 'https://example.org/code');
  assert.equal(pubs[1].featured, false);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /"nope"/);
});

test('groupByYear is newest first and stable within a year', () => {
  const groups = groupByYear([
    { year: 2020, title: 'b' },
    { year: 2024, title: 'z' },
    { year: 2024, title: 'a' },
  ]);
  assert.deepEqual(groups.map((g) => g.year), [2024, 2020]);
  assert.deepEqual(groups[0].items.map((i) => i.title), ['a', 'z']);
});

test('author matching handles initials, accents, apostrophes and aliases', () => {
  const fummi = { name: 'Franco Fummi', aliases: [] };
  assert.equal(nameTokens("Nicola Dall'Ora").join(' '), 'nicola dallora');
  assert.equal(authorMatchesPerson('Franco Fummi', fummi), true);
  assert.equal(authorMatchesPerson('F. Fummi', fummi), true);
  assert.equal(authorMatchesPerson('Franca Fummi', fummi), false);
  assert.equal(authorMatchesPerson('Franco Fumm', fummi), false);
  assert.equal(authorMatchesPerson('Fummi', fummi), false, 'family name alone is not enough');
  assert.equal(authorMatchesPerson('Nicola Dall’Ora', { name: "Nicola Dall'Ora" }), true);
  assert.equal(authorMatchesPerson('José Exámple', { name: 'Jose Example' }), true);
  assert.equal(authorMatchesPerson('N. Bombieri', { name: 'Nicola Bombieri', aliases: ['Nick Bombieri'] }), true);
  assert.equal(authorMatchesPerson('Nick Bombieri', { name: 'Nicola Bombieri', aliases: ['Nick Bombieri'] }), true);
});

test('publicationsForPerson uses explicit links or name matching', () => {
  const pubs = parseBibtex(bib).map(entryToPublication);
  applyOverrides(pubs, { thesis1: { people: ['someone-else'] } });
  const lora = publicationsForPerson(pubs, { id: 'michele-lora', name: 'Michele Lora' });
  assert.deepEqual(lora.map((p) => p.key), ['DBLP:conf/date/FummiL24']);
  const other = publicationsForPerson(pubs, { id: 'someone-else', name: 'Someone Else' });
  assert.deepEqual(other.map((p) => p.key), ['thesis1']);
});

test('formatting helpers', () => {
  assert.equal(formatAuthors(['A']), 'A');
  assert.equal(formatAuthors(['A', 'B']), 'A and B');
  assert.equal(formatAuthors(['A', 'B', 'C']), 'A, B and C');
  const [conf] = parseBibtex(bib).map(entryToPublication);
  assert.equal(formatVenueLine(conf), 'DATE, pp. 1–6');
  assert.equal(formatVenueLine({ ...conf, volume: '12', number: '3', pages: undefined }), 'DATE, 12(3)');
});
