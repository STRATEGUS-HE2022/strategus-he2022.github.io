/**
 * Site-wide project metadata. Edit this file to change the project name, mission,
 * funding statement, partners or footer links. Nothing here is generated.
 */
export const site = {
  shortName: 'STRATEGUS',
  name: 'STRATEgic GUide to Smart manufacturing',
  /** Used for <title> on the home page and as the Open Graph site name. */
  title: 'STRATEGUS — STRATEgic GUide to Smart manufacturing',
  /** Default meta description (≤ 160 characters). */
  description:
    'STRATEGUS is a Marie Skłodowska-Curie Global Fellowship developing digital twins, simulation and scheduling to bring new technologies into existing manufacturing plants.',
  /** One line under the name in the home page hero. */
  tagline: 'Guiding the integration of new technologies into the next generation of smart manufacturing systems.',
  funding: {
    programme: 'Horizon Europe',
    action: 'Marie Skłodowska-Curie Actions · Postdoctoral Fellowship (Global Fellowship)',
    call: 'HORIZON-MSCA-2022-PF-01',
    grant: '101109243',
    cordisUrl: 'https://cordis.europa.eu/project/id/101109243',
    /** Project period as recorded by the European Commission. */
    start: '2023-10-01',
    end: '2026-09-30',
    /** Printed in the footer of every page and in the funding section of the home page. */
    acknowledgement:
      'This project has received funding from the European Union’s Horizon Europe research and innovation programme under the Marie Skłodowska-Curie grant agreement No 101109243.',
    disclaimer:
      'Views and opinions expressed are those of the authors only and do not necessarily reflect those of the European Union or the European Research Executive Agency. Neither the European Union nor the granting authority can be held responsible for them.',
  },
  /** The two institutions of the fellowship. `id` is the vocabulary of `institution:` in people records. */
  partners: [
    {
      id: 'univr',
      name: 'University of Verona',
      unit: 'Department of Engineering for Innovation Medicine',
      role: 'Coordinator',
      url: 'https://www.dimi.univr.it/',
    },
    {
      id: 'unc',
      name: 'University of North Carolina at Chapel Hill',
      unit: 'Department of Computer Science',
      role: 'Partner organisation',
      url: 'https://www.unc.edu/',
    },
  ],
  links: {
    github: 'https://github.com/STRATEGUS-HE2022',
    /** Public contact address of the fellow. */
    email: 'enrico.fraccaroli@univr.it',
  },
  /** Licence of the content published on the site. */
  licence: {
    name: 'Creative Commons Attribution 4.0 International',
    shortName: 'CC BY 4.0',
    url: 'https://creativecommons.org/licenses/by/4.0/',
  },
  /** Brand assets served from public/. The mark itself is imported by the components that show it. */
  brand: {
    favicon: '/favicon.ico',
    ogImage: undefined as string | undefined,
  },
  locale: 'en',
} as const;

export type Site = typeof site;
export type PartnerId = (typeof site.partners)[number]['id'];

/** Partner record for an `institution:` id. */
export function partnerOf(id: PartnerId) {
  const partner = site.partners.find((p) => p.id === id);
  if (!partner) throw new Error(`unknown institution "${id}"`);
  return partner;
}
