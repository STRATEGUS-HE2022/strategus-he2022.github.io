# Team

`/team/` comes from one directory:

```
src/content/people/
  enrico-fraccaroli.md
  enrico-fraccaroli.jpg
  franco-fummi.md
  franco-fummi.jpg
```

**One Markdown file per person, and their portrait next to it with the same name.** The file
name is the person's slug: `/team/#enrico-fraccaroli` is where author names in the
publication list and news bylines point.

## Fields

Required: `name`, `role`, `institution`, `affiliation`.

| Field | Type | What it is |
| --- | --- | --- |
| `name` | text | Full name, as it should be printed. |
| `role` | text | Shown above the name, e.g. `Marie Skłodowska-Curie Fellow`, `Supervisor · Full Professor`. |
| `institution` | `univr` \| `unc` | One of the partner ids in `src/data/site.ts`. Prints the institution and links it. |
| `affiliation` | text | Department or unit within the institution. |
| `order` | integer | Sort key on the page (default 100); ties break on family name. |
| `photo` | path | `./<slug>.jpg` — see Portraits. |
| `email` | e-mail | Only when its publication has been approved. The one field where an address is allowed. |
| `website`, `orcid`, `scholar`, `researchgate`, `github`, `twitter` | link | Profile links. `orcid` is the bare iD; `github` may be a user name. |
| `aliases` | list | Other spellings under which the person appears as an author, e.g. `["E. Fraccaroli"]`. |

The text after the closing `---` is the biography, in Markdown.

## Portraits

- Formats: `.jpg`, `.jpeg`, `.png` or `.webp`, lower-case extension.
- Named after the slug: `franco-fummi.jpg` for `franco-fummi.md`. Exactly one per person.
- At least 96 px on the short side; roughly square (it is cropped to a square).
- **No EXIF, GPS, IPTC or XMP metadata.** Run `npm run strip-metadata src/content/people/<slug>.jpg`
  before committing. A test fails otherwise.
- Only publish a photograph with the person's agreement.

## Add a person

```markdown
---
name: Mario Rossi
role: PhD Student
institution: univr
affiliation: Department of Engineering for Innovation Medicine
order: 40
photo: ./mario-rossi.jpg
orcid: "0000-0002-1825-0097"
---

Two or three sentences of biography.
```

Then `npm run ci`. Publications whose author list contains the person are linked to the new
section automatically.

## What not to do

- Do not put an e-mail address or a telephone number anywhere but `email`.
- Do not invent a role, a title or an affiliation. Omit what you do not know.
- Do not upload a portrait you have not been given permission to publish.

## Validate

```bash
npm run dev    # http://localhost:4321/team/
npm run ci
```
