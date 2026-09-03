/**
 * /publications.bib — the visible bibliography as a downloadable BibTeX file.
 * Hidden entries are removed; everything else is emitted as written in the source.
 */
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { parseBibtex, serializeBibtex } from '../lib/bibtex.ts';
import { site } from '../data/site.ts';

export const GET: APIRoute = async () => {
  const bibPath = './src/data/publications.bib';
  const hidden = new Set((await getCollection('publications', ({ data }) => data.hidden)).map((e) => e.id));
  const entries = existsSync(bibPath) ? parseBibtex(await readFile(bibPath, 'utf8')).filter((e) => !hidden.has(e.key)) : [];
  const header = `% ${site.shortName} — ${site.name} — publications\n% Generated from the site bibliography; ${entries.length} entries.\n\n`;
  return new Response(header + serializeBibtex(entries), {
    headers: { 'Content-Type': 'application/x-bibtex; charset=utf-8' },
  });
};
