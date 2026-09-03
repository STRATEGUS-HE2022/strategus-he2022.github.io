/**
 * Ordering of people. Pure functions (no Astro imports) — unit-tested in tests/people.test.mjs.
 */

export interface PersonLike {
  id: string;
  data: {
    name: string;
    order?: number | undefined;
  };
}

/** Family name = last token; used for alphabetical ordering. */
export function familyName(name: string): string {
  const tokens = name.trim().split(/\s+/);
  return tokens[tokens.length - 1] ?? name;
}

/** Sort by `order` (ascending, default 100), then family name, then full name. */
export function comparePeople(a: PersonLike, b: PersonLike): number {
  const orderA = a.data.order ?? 100;
  const orderB = b.data.order ?? 100;
  if (orderA !== orderB) return orderA - orderB;
  const fam = familyName(a.data.name).localeCompare(familyName(b.data.name));
  if (fam !== 0) return fam;
  return a.data.name.localeCompare(b.data.name);
}
