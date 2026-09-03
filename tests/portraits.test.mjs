/**
 * The portrait convention (docs/team.md § Portraits):
 *
 *   src/content/people/<slug>.md            the person
 *   src/content/people/<slug>.<ext>         their portrait, ext ∈ jpg jpeg png webp
 *   photo: ./<slug>.<ext>                   the reference in the frontmatter
 *
 * Exactly one portrait file per person, named after the slug, decodable, large enough
 * for the smallest place it is shown, and carrying no EXIF/GPS/IPTC/XMP metadata.
 * Decoding and metadata inspection use `sharp`, which Astro already depends on, so no
 * extra dependency and no system binary is involved.
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import YAML from 'yaml';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CONTENT = path.join(ROOT, 'src/content');
const PEOPLE = path.join(CONTENT, 'people');

/** Source formats allowed for a photographic portrait (lower case, no SVG). */
const PORTRAIT_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
/** `<ext>` → the format name sharp reports, so the bytes must match the name. */
const FORMAT_OF = { '.jpg': 'jpeg', '.jpeg': 'jpeg', '.png': 'png', '.webp': 'webp' };
/** The Team page renders portraits at 96 CSS px; a smaller source cannot fill it. */
const MIN_SHORT_SIDE = 96;
/** Portrait.astro crops to a 4:5 frame, so a very wide or very tall source loses its subject. */
const ASPECT_RANGE = [0.5, 2];

const isImage = (file) => PORTRAIT_EXTENSIONS.includes(path.extname(file).toLowerCase());

/** Every person: slug, frontmatter, and the image files that share its slug. */
const people = readdirSync(PEOPLE)
  .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
  .map((file) => {
    const source = readFileSync(path.join(PEOPLE, file), 'utf8');
    const frontmatter = /^---\n([\s\S]*?)\n---/.exec(source);
    assert.ok(frontmatter, `people/${file}: missing frontmatter`);
    const slug = file.slice(0, -3);
    return { file, slug, data: YAML.parse(frontmatter[1]) ?? {} };
  });

const imageFiles = readdirSync(PEOPLE).filter(isImage);
const withPhoto = people.filter((p) => p.data.photo !== undefined);

test('every portrait file belongs to a person and is named after their slug', () => {
  const slugs = new Set(people.map((p) => p.slug));
  for (const file of imageFiles) {
    const base = path.basename(file, path.extname(file));
    assert.ok(
      slugs.has(base),
      `people/${file}: no person record "${base}.md" — a portrait must be named after the person's slug`,
    );
    assert.equal(
      path.extname(file),
      path.extname(file).toLowerCase(),
      `people/${file}: use a lower-case extension`,
    );
  }
});

test('a person has at most one portrait file', () => {
  const bySlug = new Map();
  for (const file of imageFiles) {
    const base = path.basename(file, path.extname(file));
    bySlug.set(base, [...(bySlug.get(base) ?? []), file]);
  }
  for (const [slug, files] of bySlug) {
    assert.equal(files.length, 1, `${slug}: ${files.length} competing portraits (${files.join(', ')}) — keep one`);
  }
});

test('photo: points at ./<slug>.<ext> and the file exists', () => {
  for (const { file, slug, data } of withPhoto) {
    const photo = data.photo;
    assert.equal(typeof photo, 'string', `people/${file}: photo must be a path like ./${slug}.jpg`);
    assert.ok(photo.startsWith('./'), `people/${file}: photo must start with ./ (got "${photo}")`);
    const name = photo.slice(2);
    assert.equal(path.dirname(name), '.', `people/${file}: the portrait must sit next to the Markdown file`);
    const extension = path.extname(name);
    assert.ok(
      PORTRAIT_EXTENSIONS.includes(extension),
      `people/${file}: "${extension}" is not a portrait format (use ${PORTRAIT_EXTENSIONS.join(', ')})`,
    );
    assert.equal(
      path.basename(name, extension),
      slug,
      `people/${file}: the portrait must be called ${slug}${extension}, not ${name}`,
    );
    assert.ok(existsSync(path.join(PEOPLE, name)), `people/${file}: ${photo} does not exist`);
  }
});

test('no portrait file is left unreferenced', () => {
  const referenced = new Set(withPhoto.map((p) => p.data.photo.slice(2)));
  for (const file of imageFiles) {
    assert.ok(
      referenced.has(file),
      `people/${file}: no record references it — add "photo: ./${file}" or delete the file`,
    );
  }
});

test('portraits decode and are large enough to be shown', async () => {
  for (const { file, data } of withPhoto) {
    const name = data.photo.slice(2);
    const meta = await sharp(path.join(PEOPLE, name)).metadata();
    const expected = FORMAT_OF[path.extname(name)];
    assert.equal(meta.format, expected, `people/${name}: contains ${meta.format} data, not ${expected}`);
    assert.ok(meta.width > 0 && meta.height > 0, `people/${name}: has no dimensions`);
    const shortSide = Math.min(meta.width, meta.height);
    assert.ok(
      shortSide >= MIN_SHORT_SIDE,
      `people/${name}: ${meta.width}×${meta.height} is too small (need ${MIN_SHORT_SIDE} px on the short side)`,
    );
    const aspect = meta.width / meta.height;
    assert.ok(
      aspect >= ASPECT_RANGE[0] && aspect <= ASPECT_RANGE[1],
      `people/${name}: ${meta.width}×${meta.height} is too far from square to crop (referenced by ${file})`,
    );
  }
});

test('no image in the content carries EXIF, GPS, IPTC or XMP metadata', async () => {
  const collections = readdirSync(CONTENT, { withFileTypes: true }).filter((e) => e.isDirectory());
  const images = collections.flatMap(({ name }) =>
    readdirSync(path.join(CONTENT, name))
      .filter(isImage)
      .map((file) => path.join(name, file)),
  );
  for (const image of images) {
    const meta = await sharp(path.join(CONTENT, image)).metadata();
    const present = ['exif', 'iptc', 'xmp'].filter((key) => meta[key] !== undefined);
    assert.deepEqual(
      present,
      [],
      `${image}: carries ${present.join('/')} metadata — run \`npm run strip-metadata src/content/${image}\``,
    );
  }
});

// --- The tool the docs tell maintainers to use ----------------------------------
// A portrait may arrive in any of the four supported formats, so verify that
// `npm run strip-metadata` removes the metadata of each one without touching the
// pixels. sharp writes the fixtures and reads the result back, so the check does not
// share an implementation (or a bug) with the stripper.

test('strip-metadata removes EXIF and XMP from every supported format, losslessly', async () => {
  const { stripImageMetadata } = await import('../scripts/strip-image-metadata.mjs');
  const exif = { IFD0: { Artist: 'A Photographer', Copyright: 'A Photographer' } };
  const xmp = '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF/></x:xmpmeta>';

  for (const [format, extension] of [['jpeg', '.jpg'], ['png', '.png'], ['webp', '.webp']]) {
    const before = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#7a5a28' } })
      .withExif(exif)
      .withXmp(xmp)
      .toFormat(format)
      .toBuffer();
    const metaBefore = await sharp(before).metadata();
    assert.ok(metaBefore.exif && metaBefore.xmp, `${extension}: the fixture should carry metadata`);

    const { data } = stripImageMetadata(before, extension);
    const metaAfter = await sharp(data).metadata();
    assert.equal(metaAfter.exif, undefined, `${extension}: EXIF survived`);
    assert.equal(metaAfter.xmp, undefined, `${extension}: XMP survived`);
    assert.equal(metaAfter.iptc, undefined, `${extension}: IPTC survived`);
    assert.equal(metaAfter.width, 64, `${extension}: width changed`);
    assert.equal(metaAfter.height, 48, `${extension}: height changed`);
    assert.equal(
      Buffer.compare(await sharp(before).raw().toBuffer(), await sharp(data).raw().toBuffer()),
      0,
      `${extension}: the pixels were re-encoded, they must be copied verbatim`,
    );
  }
});
