/**
 * Minimal BibTeX reader/writer.
 *
 * Scope: the well-formed BibTeX exported by DBLP, Google Scholar and reference
 * managers — `@type{key, field = {value}, field = "value", field = 2024}` — with
 * nested braces, `#` concatenation of literals and `@comment` blocks. `@string`
 * macros and `@preamble` are skipped on purpose to keep this small and predictable.
 * LaTeX accents and common commands inside values are decoded to Unicode.
 *
 * No dependencies; unit-tested in tests/bibtex.test.mjs.
 */

export interface BibEntry {
  /** Entry type, lower-cased (article, inproceedings, …). */
  type: string;
  /** Citation key exactly as written, e.g. DBLP:conf/date/Fummi24. */
  key: string;
  /** Field values decoded to plain Unicode text (LaTeX and braces removed); names lower-cased. */
  fields: Record<string, string>;
  /** Field values as written in the source, used when re-serialising. */
  raw: Record<string, string>;
}

const SKIPPED_TYPES = new Set(['comment', 'preamble', 'string']);

/** Parse a BibTeX document into entries. Throws with a readable message on malformed input. */
export function parseBibtex(source: string): BibEntry[] {
  const entries: BibEntry[] = [];
  const length = source.length;
  let i = 0;

  while (i < length) {
    const at = source.indexOf('@', i);
    if (at === -1) break;
    i = at + 1;

    const typeMatch = /^[A-Za-z]+/.exec(source.slice(i));
    if (!typeMatch) continue;
    const type = typeMatch[0].toLowerCase();
    i = skipWhitespace(source, i + typeMatch[0].length);

    const open = source[i];
    if (open !== '{' && open !== '(') continue; // an "@" inside prose, not an entry
    const close = open === '{' ? '}' : ')';

    if (SKIPPED_TYPES.has(type)) {
      i = skipBalanced(source, i);
      continue;
    }

    i = skipWhitespace(source, i + 1);
    let keyEnd = i;
    while (keyEnd < length && !/[,\s]/.test(source[keyEnd]!) && source[keyEnd] !== close) keyEnd++;
    const key = source.slice(i, keyEnd);
    if (!key) throw new Error(`BibTeX entry without a citation key near offset ${i}`);
    i = skipWhitespace(source, keyEnd);

    const fields: Record<string, string> = {};
    const raw: Record<string, string> = {};

    while (i < length) {
      const ch = source[i];
      if (ch === ',') {
        i = skipWhitespace(source, i + 1);
        continue;
      }
      if (ch === close) {
        i++;
        break;
      }
      const nameMatch = /^[A-Za-z0-9_:\-+./]+/.exec(source.slice(i));
      if (!nameMatch) throw new Error(`Unexpected character "${ch}" in BibTeX entry "${key}"`);
      const name = nameMatch[0].toLowerCase();
      i = skipWhitespace(source, i + nameMatch[0].length);
      if (source[i] !== '=') throw new Error(`Expected "=" after field "${name}" in BibTeX entry "${key}"`);
      i = skipWhitespace(source, i + 1);
      const [value, next] = readValue(source, i, key);
      raw[name] = value;
      fields[name] = decodeValue(value);
      i = skipWhitespace(source, next);
    }

    entries.push({ type, key, fields, raw });
  }

  return entries;
}

/** Serialise entries back to BibTeX (all values brace-delimited). */
export function serializeBibtex(entries: BibEntry[]): string {
  return entries
    .map((entry) => {
      const lines = Object.entries(entry.raw).map(([name, value]) => `  ${name} = {${value}},`);
      return `@${entry.type}{${entry.key},\n${lines.join('\n')}\n}`;
    })
    .join('\n\n')
    .concat('\n');
}

function skipWhitespace(source: string, i: number): number {
  while (i < source.length && /\s/.test(source[i]!)) i++;
  return i;
}

/** Given the index of an opening brace/paren, return the index just after its match. */
function skipBalanced(source: string, i: number): number {
  const open = source[i];
  const close = open === '{' ? '}' : ')';
  let depth = 0;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return source.length;
}

/** Read a field value (with `#` concatenation); returns [rawValue, nextIndex]. */
function readValue(source: string, i: number, key: string): [string, number] {
  const parts: string[] = [];
  for (;;) {
    const ch = source[i];
    if (ch === '{') {
      const end = skipBalanced(source, i);
      parts.push(source.slice(i + 1, end - 1));
      i = end;
    } else if (ch === '"') {
      let j = i + 1;
      let depth = 0;
      while (j < source.length) {
        const c = source[j];
        if (c === '{') depth++;
        else if (c === '}') depth--;
        else if (c === '"' && depth === 0) break;
        j++;
      }
      if (j >= source.length) throw new Error(`Unterminated quoted value in BibTeX entry "${key}"`);
      parts.push(source.slice(i + 1, j));
      i = j + 1;
    } else {
      const bare = /^[^,}#)\s]+/.exec(source.slice(i));
      if (!bare) throw new Error(`Missing field value in BibTeX entry "${key}"`);
      parts.push(bare[0]);
      i += bare[0].length;
    }
    i = skipWhitespace(source, i);
    if (source[i] === '#') {
      i = skipWhitespace(source, i + 1);
      continue;
    }
    return [parts.join(''), i];
  }
}

// --- LaTeX → Unicode -------------------------------------------------------------

const COMBINING: Record<string, string> = {
  "'": '\u0301', '`': '\u0300', '^': '\u0302', '"': '\u0308', '~': '\u0303', '=': '\u0304',
  '.': '\u0307', u: '\u0306', v: '\u030c', H: '\u030b', c: '\u0327', k: '\u0328', r: '\u030a',
  d: '\u0323', b: '\u0331',
};

const SYMBOLS: Record<string, string> = {
  ss: 'ß', ae: 'æ', AE: 'Æ', oe: 'œ', OE: 'Œ', aa: 'å', AA: 'Å', o: 'ø', O: 'Ø', l: 'ł', L: 'Ł',
  i: 'ı', j: 'ȷ', dh: 'ð', DH: 'Ð', th: 'þ', TH: 'Þ', ng: 'ŋ', NG: 'Ŋ',
  textendash: '–', textemdash: '—', textquoteleft: '‘', textquoteright: '’',
  textquotedblleft: '“', textquotedblright: '”', ldots: '…', dots: '…', textbackslash: '\\',
};

/** Decode LaTeX accents/commands, drop braces, collapse whitespace. */
export function decodeValue(value: string): string {
  return decodeLatex(value).replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
}

export function decodeLatex(input: string): string {
  let out = input;
  // Accents written with a symbol: \'e  \'{e}  {\'e}  \"{\i}
  out = out.replace(/\\([`'^"~=.])\s*\{?\\?([A-Za-z])\}?/g, (_m, cmd: string, ch: string) => ch + COMBINING[cmd]);
  // Accents written with a letter command: \v{c}  \c{c}  \H{o}  \u{g}  \v c
  out = out.replace(/\\([uvHckrdb])(?:\{\\?([A-Za-z])\}|\s+\\?([A-Za-z]))/g, (_m, cmd: string, a?: string, b?: string) => (a ?? b ?? '') + COMBINING[cmd]);
  // Symbol commands: \ss \o \l \ae \textendash …
  out = out.replace(/\\([A-Za-z]+)(?![A-Za-z])( ?)/g, (m, name: string) => (name in SYMBOLS ? SYMBOLS[name]! : m));
  // Formatting commands keep their argument: \emph{x} → {x}
  out = out.replace(/\\(?:emph|textit|textbf|textsc|texttt|textrm|mathrm|url)\s*\{/g, '{');
  // Escaped characters and dashes
  out = out.replace(/\\([&%$#_{}])/g, '$1').replace(/---/g, '—').replace(/--/g, '–').replace(/~/g, ' ');
  return out.normalize('NFC');
}

// --- Names -----------------------------------------------------------------------

/** Split a BibTeX author/editor field into display names ("Given Family"). */
export function splitNames(field: string): string[] {
  return field
    .split(/\s+and\s+/i)
    .map((name) => formatName(name))
    .filter((name) => name.length > 0);
}

/** "Family, Given" → "Given Family"; strips DBLP numeric disambiguators ("Wei Wang 0001"). */
export function formatName(name: string): string {
  let n = name.replace(/\s+/g, ' ').trim().replace(/\s\d{4}$/, '');
  if (n.toLowerCase() === 'others') return 'et al.';
  const comma = n.indexOf(',');
  if (comma !== -1) {
    const family = n.slice(0, comma).trim();
    const given = n.slice(comma + 1).replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    n = `${given} ${family}`.trim();
  }
  return n;
}
