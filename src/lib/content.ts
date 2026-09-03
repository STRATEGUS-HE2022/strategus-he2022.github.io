/**
 * Typed accessors over the content collections, with the ordering rules used
 * everywhere on the site. Pages import from here instead of calling getCollection()
 * with ad-hoc sorting.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { comparePeople } from './people.ts';
import { publicationsForPerson } from './publications.ts';

export type Person = CollectionEntry<'people'>;
export type NewsItem = CollectionEntry<'news'>;
export type PublicationEntry = CollectionEntry<'publications'>;
export type Software = CollectionEntry<'software'>;

/** Team members in display order (`order`, then family name). */
export async function getPeople(): Promise<Person[]> {
  return (await getCollection('people')).sort(comparePeople);
}

/** Newest first. */
export async function getNews(): Promise<NewsItem[]> {
  return (await getCollection('news')).sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/** Software records in display order (`order`, then name). */
export async function getSoftware(): Promise<Software[]> {
  return (await getCollection('software')).sort((a, b) => a.data.order - b.data.order || a.data.name.localeCompare(b.data.name));
}

/** Visible publications, newest first. Hidden entries are excluded everywhere. */
export async function getPublications(): Promise<PublicationEntry[]> {
  const all = await getCollection('publications', ({ data }) => !data.hidden);
  return all.sort((a, b) => b.data.year - a.data.year || a.data.title.localeCompare(b.data.title));
}

/** The publication objects (plain data) used by the list components. */
export function publicationData(entries: PublicationEntry[]) {
  return entries.map((e) => ({
    ...e.data,
    people: e.data.people.map((ref) => ref.id),
  }));
}

export async function getPublicationsForPerson(person: Person) {
  const pubs = publicationData(await getPublications());
  return publicationsForPerson(pubs, { id: person.id, name: person.data.name, aliases: person.data.aliases });
}

/** The publications a software record lists by BibTeX key, in bibliography order. */
export async function getPublicationsForSoftware(item: Software) {
  const keys = new Set(item.data.publications);
  return publicationData((await getPublications()).filter((e) => keys.has(e.data.key)));
}

/** News items that name the given person (as author or subject). */
export async function getNewsForPerson(person: Person): Promise<NewsItem[]> {
  return (await getNews()).filter((n) => n.data.author?.id === person.id || n.data.people.some((ref) => ref.id === person.id));
}
