# Third-party notices

Everything in this repository is the work of the STRATEGUS project, except the material
listed below. This file exists so that provenance is recorded where a reader will find it; it
is not a licence for this site's content (see the footer and `LICENSE`).

**Before adding an asset you did not make** — a font, an icon, a diagram, a photograph you did
not take — add its entry here first.

---

## The STRATEGUS mark

`src/assets/images/strategus-mark-light.png` and `strategus-mark-dark.png` are the project's
own mark. The dark-theme variant repaints the navy arcs so they stay visible on navy paper;
the flame is untouched. `public/favicon.ico` is derived from the same mark.

## The European Union emblem

`src/assets/images/eu-msca.png` combines the emblem of the European Union with the Marie
Skłodowska-Curie Actions identifier, as supplied to beneficiaries for the acknowledgement of
funding. The emblem is the property of the European Union and is used here as required by the
grant agreement; it is never recoloured, cropped or altered, and it sits on a white plate in
both themes. Rules of use: <https://commission.europa.eu/funding-tenders/managing-your-project/communicating-and-raising-eu-visibility_en>.

## Inter — the sans-serif typeface

`src/assets/fonts/inter-latin-wght-normal.woff2` is the Latin variable `wght` subset of Inter,
vendored so the site makes no third-party font request at runtime. `src/styles/fonts.css`
declares it.

- **Project** — Inter, <https://github.com/rsms/inter>
- **Copyright** — © 2016 The Inter Project Authors
- **Source** — Fontsource font files repository, `fonts/variable/inter`
- **Licence** — SIL Open Font License, Version 1.1, reproduced in full below

## IBM Plex — the serif and monospace typefaces

The build self-hosts IBM Plex Serif and IBM Plex Mono through the `@fontsource` packages named
in `package.json`, and ships their `woff2` subsets in `dist/`. `src/layouts/BaseLayout.astro`
is where they are imported.

- **Project** — IBM Plex, <https://github.com/IBM/plex>
- **Copyright** — © 2017 IBM Corp. (Mono), © 2020 IBM Corp. (Serif). All rights reserved.
  The per-file notices are in each package's `LICENSE`.
- **Licence** — SIL Open Font License, Version 1.1, reproduced in full below
- **Reserved Font Name** — none is declared, so the family name is used unchanged

### SIL Open Font License 1.1

```
This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
http://scripts.sil.org/OFL


-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.
```
