# Preview, build and deployment

## Requirements

- Node.js **24** (`.nvmrc`; anything from 22.12 works) and npm ≥ 9
- Git

```bash
git clone git@github.com:STRATEGUS-HE2022/strategus-he2022.github.io.git
cd strategus-he2022.github.io
npm ci
```

Use `npm ci`, not `npm install`: it installs exactly what `package-lock.json` records,
which is what CI does.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on <http://localhost:4321>, reloads on save |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run check` | Astro and TypeScript checks: templates, content schemas, types |
| `npm test` | Unit tests and content invariants (`node --test`) |
| `npm run verify` | Repository hygiene and built-site checks (`scripts/verify.mjs`) |
| `npm run format:bib` | Rewrite `publications.bib` in its canonical layout |
| `npm run strip-metadata <file…>` | Remove EXIF/GPS/IPTC/XMP from an image, losslessly |
| `npm run ci` | `check` → `test` → `build` → `verify`, in that order |

**`npm run ci` must pass before you push.** It is exactly what the CI workflow runs.

### Reading a failure

The build names the file and the field:

```
news/2026-10-02-x.md → summary: Required
```

`npm test` reports the record and the problem:

```
people/IMG_1234.jpg: no person record "IMG_1234.md" — a portrait must be named after the person's slug
```

`npm run verify` lists every problem it found and exits non-zero:

```
✗ dist/team/index.html: broken internal reference /news/typo/
✗ tracked file is too large (612 KB > 200 KB): src/assets/images/banner.jpg
```

## Workflow

1. Branch: `git switch -c news/date-2027`.
2. Edit the content files.
3. `npm run dev` and look at the pages you changed.
4. `npm run ci`.
5. Commit, push the branch, open a pull request. CI runs `.github/workflows/ci.yml`.
6. Merge. The push to `main` deploys.

## How the deployment works

`.github/workflows/deploy.yml` runs on every push to `main` (and on manual dispatch):

1. `npm ci`
2. `npm run check`, `npm test`, `npm run build`, `npm run verify`
3. upload `dist/` as a Pages artifact
4. deploy it with `actions/deploy-pages`

If any step fails, nothing is deployed and the previous version stays up. The build job only
needs `contents: read`; the `pages: write` and `id-token: write` permissions belong to the
deploy job alone.

### Repository settings this depends on

- **Settings → Pages → Build and deployment → Source: GitHub Actions.** Not "Deploy from a
  branch".
- The `github-pages` environment exists (GitHub creates it on the first deployment).

## URL

- The site is served at <https://strategus-he2022.github.io/>, an organisation Pages
  repository, so it lives at the domain root.
- `site: 'https://strategus-he2022.github.io'` in `astro.config.ts` is the canonical origin
  used by canonical links, the sitemap, Open Graph URLs and `robots.txt`. `scripts/verify.mjs`
  pins the same origin.
- `build.format: 'directory'` produces `news/index.html`, so every URL ends with a slash.
- `public/.nojekyll` is included in the deployed artifact.

The addresses of the previous Jekyll site (`/news/<year>/<slug>/`) are not preserved.

## What not to do

- Do not commit `dist/`. It is generated and git-ignored, and `npm run verify` rejects it.
- Do not make the build depend on a system binary. CI has Node and npm; anything else has to
  come from `package.json`.
- Do not bump dependency versions as part of a content change.
