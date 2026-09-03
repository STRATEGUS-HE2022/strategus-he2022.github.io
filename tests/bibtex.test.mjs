import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeValue, formatName, parseBibtex, serializeBibtex, splitNames } from '../src/lib/bibtex.ts';

test('parses braces, quotes, numbers and concatenation', () => {
  const src = `@Article{key1,
    author = {Doe, Jane and John Smith},
    title = "A {Quoted} Title",
    year = 2024,
    journal = "Journal of " # {Things},
  }`;
  const [entry] = parseBibtex(src);
  assert.equal(entry.type, 'article');
  assert.equal(entry.key, 'key1');
  assert.equal(entry.fields.title, 'A Quoted Title');
  assert.equal(entry.fields.year, '2024');
  assert.equal(entry.fields.journal, 'Journal of Things');
  assert.equal(entry.raw.title, 'A {Quoted} Title');
});

test('skips @comment / @string / @preamble and text outside entries', () => {
  const src = `% a comment line with an e-mail @ sign
  @comment{ ignored { nested } }
  @string{ieee = "IEEE"}
  @preamble{"x"}
  @inproceedings(paren, title = {Paren Entry}, year = {2020})`;
  const entries = parseBibtex(src);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].key, 'paren');
  assert.equal(entries[0].fields.title, 'Paren Entry');
});

test('decodes LaTeX accents and symbols', () => {
  assert.equal(decodeValue("Jos{\\'e} Ex{\\'a}mple"), 'José Exámple');
  assert.equal(decodeValue('Zo{\\"e} M{\\"u}ller'), 'Zoë Müller');
  assert.equal(decodeValue('\\v{C}apek and \\c{c}a'), 'Čapek and ça');
  assert.equal(decodeValue('Stra{\\ss}e \\o{}l \\L{}ukasz'), 'Straße øl Łukasz');
  assert.equal(decodeValue('pages 1--6 --- 7'), 'pages 1–6 — 7');
  assert.equal(decodeValue('\\emph{Fast} \\& {\\textbf{Loud}} 100\\%'), 'Fast & Loud 100%');
  assert.equal(decodeValue('na{\\"\\i}ve'), 'naïve');
});

test('splits and reorders names', () => {
  assert.deepEqual(splitNames('Doe, Jane and John Smith and others'), ['Jane Doe', 'John Smith', 'et al.']);
  assert.equal(formatName('Wang, Wei 0001'), 'Wei Wang');
  assert.equal(formatName('  Fummi,   Franco  '), 'Franco Fummi');
  assert.deepEqual(splitNames("Nicola Dall'Ora AND Michele Lora"), ["Nicola Dall'Ora", 'Michele Lora']);
});

test('round-trips through serializeBibtex', () => {
  const src = `@inproceedings{DBLP:conf/date/X24,\n  author = {Ada Fixture},\n  title = {T},\n  year = {2024},\n}\n`;
  const out = serializeBibtex(parseBibtex(src));
  assert.match(out, /^@inproceedings\{DBLP:conf\/date\/X24,/);
  assert.match(out, /title = \{T\},/);
  assert.deepEqual(parseBibtex(out)[0].fields, parseBibtex(src)[0].fields);
});

test('reports malformed entries clearly', () => {
  assert.throws(() => parseBibtex('@article{bad, title {no equals}}'), /Expected "="/);
  assert.throws(() => parseBibtex('@article{bad, title = "unterminated}'), /Unterminated quoted value/);
});
