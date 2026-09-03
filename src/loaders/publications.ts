/**
 * Content Layer loader for the `publications` collection.
 *
 * Reads src/data/publications.bib (+ optional publications.overrides.yaml), turns
 * every entry into a Publication object and stores it under its BibTeX key. In
 * `astro dev` both files are watched, so edits show up without a restart.
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Loader } from 'astro/loaders';
import { z } from 'astro/zod';
import YAML from 'yaml';
import { parseBibtex } from '../lib/bibtex.ts';
import { applyOverrides, entryToPublication, type PublicationOverrides } from '../lib/publications.ts';

const overrideSchema = z.record(
  z.string(),
  z
    .object({
      featured: z.boolean().optional(),
      hidden: z.boolean().optional(),
      pdf: z.string().optional(),
      code: z.url().optional(),
      note: z.string().optional(),
      people: z.array(z.string()).optional(),
    })
    .strict(),
);

export interface PublicationsLoaderOptions {
  /** Path to the .bib file, relative to the project root. */
  bib: string;
  /** Path to the overrides YAML file, relative to the project root (optional file). */
  overrides: string;
}

export function publicationsLoader(options: PublicationsLoaderOptions): Loader {
  return {
    name: 'strategus-publications-loader',
    async load({ store, parseData, generateDigest, logger, watcher, config }) {
      const root = fileURLToPath(config.root);
      const bibPath = path.resolve(root, options.bib);
      const overridesPath = path.resolve(root, options.overrides);

      const run = async () => {
        store.clear();
        if (!existsSync(bibPath)) {
          logger.warn(`No bibliography found at ${options.bib}; the publications collection is empty.`);
          return;
        }
        const entries = parseBibtex(await readFile(bibPath, 'utf8'));
        let overrides: PublicationOverrides = {};
        if (existsSync(overridesPath)) {
          const parsed: unknown = YAML.parse(await readFile(overridesPath, 'utf8'));
          overrides = parsed == null ? {} : overrideSchema.parse(parsed);
        }
        const publications = applyOverrides(entries.map(entryToPublication), overrides, (message) => logger.warn(message));
        for (const publication of publications) {
          const data = await parseData({ id: publication.key, data: { ...publication }, filePath: options.bib });
          store.set({ id: publication.key, data, digest: generateDigest(data) });
        }
        logger.info(`Loaded ${publications.length} publications from ${options.bib}`);
      };

      await run();

      if (watcher) {
        watcher.add(bibPath);
        watcher.add(overridesPath);
        watcher.on('change', async (changed) => {
          if (changed === bibPath || changed === overridesPath) await run();
        });
      }
    },
  };
}
