#!/usr/bin/env node
/**
 * Repository and build verification (run after `npm run build`; no dependencies).
 *
 *   1. No forbidden files (databases, dumps, archives, env files, keys, logs) are tracked
 *      by Git or present in the working tree, and no tracked file is larger than 200 KB.
 *   2. The production build in dist/ contains the expected routes and files.
 *   3. Everything under public/ is copied into dist/ unchanged.
 *   4. Every built HTML page: one <h1>, no skipped heading levels, <html lang>, <title>,
 *      meta description, canonical link, a <main>, a skip link, no third-party scripts.
 *   5. Internal links and asset references resolve to files in the build.
 *   6. Every news item has its page, and the Team page has an anchor for every person.
 *
 * Exit code 1 on any failure; prints a summary otherwise.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ORIGIN = 'https://strategus-he2022.github.io/';
/** The repository stays small: no file above this size may be committed. */
const MAX_FILE_BYTES = 200 * 1024;

const root = process.cwd();
const failures = [];
const notes = [];
const fail = (msg) => failures.push(msg);

// --- 1. Forbidden and oversized files ----------------------------------------------
const FORBIDDEN = [
  /\.(sqlite3?|db|sql|dump|tar|tgz|zip|gz|bak|backup|log|pem|key|p12|pfx)$/i,
  /(^|\/)\.env(\..*)?$/,
  /^dist\//,
  /^node_modules\//,
];
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString().split('\0').filter(Boolean);
for (const file of tracked) {
  if (FORBIDDEN.some((re) => re.test(file))) fail(`forbidden file is tracked by Git: ${file}`);
  const full = path.join(root, file);
  if (existsSync(full)) {
    const size = statSync(full).size;
    if (size > MAX_FILE_BYTES) fail(`tracked file is too large (${Math.round(size / 1024)} KB > ${MAX_FILE_BYTES / 1024} KB): ${file}`);
  }
}
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', '.astro', '.venv']);
function walk(dir, visit) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, visit);
    else visit(full);
  }
}
walk(root, (file) => {
  const rel = path.relative(root, file).split(path.sep).join('/');
  if (FORBIDDEN.slice(0, 2).some((re) => re.test(rel))) fail(`forbidden file in working tree: ${rel}`);
});
notes.push(`${tracked.length} tracked files checked against forbidden patterns and the ${MAX_FILE_BYTES / 1024} KB limit`);

// --- Helpers -------------------------------------------------------------------
function listFiles(dir) {
  const out = [];
  const rec = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) rec(full);
      else out.push(full);
    }
  };
  if (existsSync(dir)) rec(dir);
  return out;
}
const rel = (base, file) => path.relative(base, file).split(path.sep).join('/');

function resolvesInDist(dist, href) {
  const clean = decodeURIComponent(href.split('#')[0].split('?')[0]);
  const candidates = [clean, `${clean}/index.html`, `${clean}index.html`, `${clean}.html`].map((p) => path.join(dist, p));
  return candidates.some((c) => existsSync(c) && statSync(c).isFile());
}

function checkHtml(dist, label) {
  const files = listFiles(dist).filter((f) => f.endsWith('.html'));
  if (files.length === 0) {
    fail(`${label}: no HTML files found`);
    return;
  }
  let links = 0;
  for (const file of files) {
    const page = rel(dist, file);
    const html = readFileSync(file, 'utf8');
    if (!/<html[^>]*\slang=/.test(html)) fail(`${label}/${page}: <html> has no lang attribute`);
    if (!/<title>[^<]+<\/title>/.test(html)) fail(`${label}/${page}: missing <title>`);
    if (!html.includes(`<link rel="canonical" href="${ORIGIN}`)) fail(`${label}/${page}: missing canonical link to ${ORIGIN}`);
    if (/https?:\/\/(fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr|cdnjs|unpkg|kit\.fontawesome|maxcdn)\./.test(html)) fail(`${label}/${page}: references a third-party CDN`);
    if (/<script[^>]+src="https?:\/\//.test(html)) fail(`${label}/${page}: loads an external script`);
    if (/<link[^>]+rel="stylesheet"[^>]+href="https?:\/\//.test(html)) fail(`${label}/${page}: loads an external stylesheet`);
    const h1s = html.match(/<h1[\s>]/g) ?? [];
    if (h1s.length !== 1) fail(`${label}/${page}: expected exactly one <h1>, found ${h1s.length}`);
    if (!/<meta name="description" content="[^"]+"/.test(html)) fail(`${label}/${page}: missing meta description`);
    if (!/<main[\s>]/.test(html)) fail(`${label}/${page}: missing <main>`);
    if (!/class="skip-link"/.test(html)) fail(`${label}/${page}: missing skip link`);
    let previous = 1;
    for (const m of html.matchAll(/<h([1-6])[\s>]/g)) {
      const level = Number(m[1]);
      if (level > previous + 1) fail(`${label}/${page}: heading level jumps from h${previous} to h${level}`);
      previous = level;
    }
    for (const m of html.matchAll(/(?:href|src)="(\/[^"/][^"]*|\/)"/g)) {
      const href = m[1];
      if (href.startsWith('//')) continue;
      links++;
      if (!resolvesInDist(dist, href)) fail(`${label}/${page}: broken internal reference ${href}`);
    }
  }
  notes.push(`${label}: ${files.length} HTML pages checked, ${links} internal references resolved`);
}

/** Frontmatter block of a Markdown file, as raw text. */
function frontmatterOf(file) {
  return /^---\n([\s\S]*?)\n---/.exec(readFileSync(file, 'utf8'))?.[1] ?? '';
}

/** Markdown records of one content directory: slug and raw frontmatter. */
function records(collection) {
  const dir = path.join(root, 'src/content', collection);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .map((f) => ({ slug: f.slice(0, -3), frontmatter: frontmatterOf(path.join(dir, f)) }));
}

// --- 2. Production build -----------------------------------------------------------
const dist = path.join(root, 'dist');
if (!existsSync(dist)) {
  fail('dist/ not found — run `npm run build` first');
} else {
  const required = [
    'index.html', '404.html', 'robots.txt', '.nojekyll', 'sitemap-index.xml', 'publications.bib', 'favicon.ico',
    'news/index.html', 'publications/index.html', 'software/index.html', 'team/index.html',
  ];
  for (const f of required) if (!existsSync(path.join(dist, f))) fail(`dist/${f} is missing`);

  // 3. Everything under public/ reaches the build unchanged.
  const publicDir = path.join(root, 'public');
  let copied = 0;
  for (const file of listFiles(publicDir)) {
    const target = path.join(dist, rel(publicDir, file));
    if (!existsSync(target) || statSync(target).size !== statSync(file).size) fail(`public/ file not copied unchanged: ${rel(root, file)}`);
    else copied++;
  }
  notes.push(`${copied} files from public/ copied unchanged into dist/`);

  // Accessibility rules that must survive bundling: reduced-motion media query and
  // visible keyboard focus styles in the shipped CSS.
  const css = listFiles(path.join(dist, '_astro')).filter((f) => f.endsWith('.css')).map((f) => readFileSync(f, 'utf8')).join('\n');
  if (!css.includes('prefers-reduced-motion')) fail('shipped CSS has no prefers-reduced-motion rule');
  if (!css.includes(':focus-visible')) fail('shipped CSS has no :focus-visible rule');
  // Without the !important, any component `display` silently cancels the `hidden`
  // attribute, and the publication filter stops working.
  if (!/\[hidden\]\{display:none!important\}/.test(css.replace(/\s+/g, ''))) {
    fail('shipped CSS has no `[hidden] { display: none !important }` rule — the publication filter would not hide rows');
  }
  const fontFiles = listFiles(path.join(dist, '_astro')).filter((f) => /\.woff2?$/.test(f));
  notes.push(`shipped CSS carries reduced-motion, focus-visible and [hidden] rules; ${fontFiles.length} self-hosted font files`);

  // 4–5. Page checks
  checkHtml(dist, 'dist');

  // --- 6. Content reaches the build ---------------------------------------------------
  const news = records('news');
  for (const { slug } of news) {
    if (!existsSync(path.join(dist, 'news', slug, 'index.html'))) fail(`missing page /news/${slug}/ for news/${slug}.md`);
  }
  const team = existsSync(path.join(dist, 'team/index.html')) ? readFileSync(path.join(dist, 'team/index.html'), 'utf8') : '';
  const people = records('people');
  for (const { slug } of people) {
    if (!team.includes(`id="${slug}"`)) fail(`dist/team/: no section with id="${slug}" for people/${slug}.md — author links would point nowhere`);
  }
  const softwarePage = existsSync(path.join(dist, 'software/index.html')) ? readFileSync(path.join(dist, 'software/index.html'), 'utf8') : '';
  const software = records('software');
  for (const { slug } of software) {
    if (!softwarePage.includes(`id="${slug}"`)) fail(`dist/software/: no section with id="${slug}" for software/${slug}.md — links from the home page would point nowhere`);
  }
  notes.push(`${news.length} news pages, ${people.length} team anchors and ${software.length} software anchors present in dist/`);
}

// --- Report ----------------------------------------------------------------------------
for (const note of notes) console.log(`✓ ${note}`);
if (failures.length > 0) {
  console.error(`\n${failures.length} problem(s):`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('\nverify: all checks passed');
