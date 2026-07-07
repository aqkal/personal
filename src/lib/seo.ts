import { profile } from "@content";

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** JSON-LD structured data: who this site is about. */
export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    email: `mailto:${profile.email}`,
    url: siteUrl,
    sameAs: [profile.socials.github, profile.socials.linkedin],
    jobTitle: "Software Engineering Student",
    affiliation: {
      "@type": "CollegeOrUniversity",
      name: "University of Queensland",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Brisbane",
      addressRegion: "QLD",
      addressCountry: "AU",
    },
  };
}

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: `${profile.name} · Portfolio`,
    url: siteUrl,
    description:
      "An explorable 3D Brisbane campus that doubles as a software engineering portfolio.",
  };
}

/** Serialize JSON-LD safely for a <script> tag. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
