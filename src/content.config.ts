/**
 * Content collections — the single source of truth for what a team member, a news item
 * or a publication may contain. Every field is validated at build time; a typo or a
 * missing required field fails the build with a message naming the file and the field.
 *
 * Where the content lives (see the guides in docs/):
 *   src/content/people/<slug>.md (+ portrait next to it)
 *   src/content/news/YYYY-MM-DD-<slug>.md
 *   src/content/software/<slug>.md
 *   src/data/publications.bib (+ publications.overrides.yaml)
 */
import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { publicationsLoader } from './loaders/publications.ts';
import { site, type PartnerId } from './data/site.ts';

/** Markdown files; names starting with "_" (e.g. _README.md) are ignored. */
const MARKDOWN = '**/[^_]*.md';

/** The institutions of the fellowship, from site.ts — the only allowed values of `institution:`. */
const INSTITUTION_IDS = site.partners.map((p) => p.id) as unknown as [PartnerId, ...PartnerId[]];

/** Short labels for news items, shown in the margin of the list. */
export const NEWS_CATEGORIES = ['Project', 'Publication', 'Event', 'Release'] as const;

const people = defineCollection({
  loader: glob({ pattern: MARKDOWN, base: './src/content/people' }),
  schema: ({ image }) =>
    z.object({
      name: z.string().min(1),
      /** Free text shown next to the name, e.g. "Marie Skłodowska-Curie Fellow". */
      role: z.string().min(1),
      institution: z.enum(INSTITUTION_IDS),
      /** Department or unit within the institution. */
      affiliation: z.string().min(1),
      /** Sort key on the Team page; ties break on family name. */
      order: z.number().int().default(100),
      /** Portrait, relative to the Markdown file (e.g. ./photo.jpg). */
      photo: image().optional(),
      /** Public institutional e-mail — only when its publication has been approved. */
      email: z.email().optional(),
      website: z.url().optional(),
      orcid: z
        .string()
        .regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, 'ORCID iD must look like 0000-0002-1825-0097')
        .optional(),
      scholar: z.url().optional(),
      researchgate: z.url().optional(),
      /** GitHub user name or profile URL. */
      github: z.string().optional(),
      twitter: z.url().optional(),
      /** Other spellings under which this person appears as an author (e.g. "F. Fummi"). */
      aliases: z.array(z.string()).default([]),
    }),
});

const news = defineCollection({
  loader: glob({ pattern: MARKDOWN, base: './src/content/news' }),
  schema: z.object({
    title: z.string().min(1),
    date: z.coerce.date(),
    /** One or two sentences shown in the list and used as the meta description. */
    summary: z.string().min(1),
    category: z.enum(NEWS_CATEGORIES),
    /** The team member posting; their portrait appears in the byline. */
    author: reference('people').optional(),
    /** Team members the item is about. */
    people: z.array(reference('people')).default([]),
  }),
});

/**
 * Software produced by, or continuing, the project: an ecosystem, a platform, a library.
 * The page /software/ has one section per record, in `order`, with the record's slug as
 * its id (so /software/#frost works from news and from the home page).
 */
const software = defineCollection({
  loader: glob({ pattern: MARKDOWN, base: './src/content/software' }),
  schema: z.object({
    name: z.string().min(1),
    /** Short label shown in the margin: "Ecosystem", "Simulation platform", "C++ library". */
    kind: z.string().min(1),
    /** One sentence, shown in lists and used as the meta description of the section. */
    summary: z.string().min(1),
    /** The ecosystem this piece belongs to, if any (another software record). */
    partOf: reference('software').optional(),
    website: z.url().optional(),
    repository: z.url(),
    documentation: z.url().optional(),
    /** SPDX id or short name, e.g. "BSD-2-Clause". */
    licence: z.string().min(1),
    /** Main implementation languages, as shown. */
    languages: z.array(z.string().min(1)).default([]),
    /** BibTeX keys in src/data/publications.bib describing this software. */
    publications: z.array(z.string().min(1)).default([]),
    /** Team members involved. */
    people: z.array(reference('people')).default([]),
    order: z.number().int().default(100),
  }),
});

const publications = defineCollection({
  loader: publicationsLoader({
    bib: './src/data/publications.bib',
    overrides: './src/data/publications.overrides.yaml',
  }),
  schema: z.object({
    key: z.string(),
    type: z.string(),
    title: z.string(),
    authors: z.array(z.string()),
    year: z.number().int(),
    venue: z.string().optional(),
    venueKind: z.enum(['journal', 'conference', 'chapter', 'book', 'thesis', 'report', 'preprint', 'other']),
    volume: z.string().optional(),
    number: z.string().optional(),
    pages: z.string().optional(),
    publisher: z.string().optional(),
    doi: z.string().optional(),
    url: z.string().optional(),
    dblp: z.string().optional(),
    pdf: z.string().optional(),
    code: z.string().optional(),
    note: z.string().optional(),
    featured: z.boolean(),
    hidden: z.boolean(),
    people: z.array(reference('people')),
  }),
});

export const collections = { people, news, software, publications };
