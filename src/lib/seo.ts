import { education, profile } from "@content";

const FALLBACK_SITE_URL = "http://localhost:3000";

function normalizeSiteUrl(value: string | undefined): string {
  try {
    const url = new URL(value || FALLBACK_SITE_URL);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return FALLBACK_SITE_URL;
    }
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

/** JSON-LD structured data: who this site is about. */
export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    email: `mailto:${profile.email}`,
    url: siteUrl,
    sameAs: [profile.socials.github, profile.socials.linkedin],
    jobTitle: `${education[0].degree.split(":").pop()?.trim()} Student`,
    affiliation: {
      "@type": "CollegeOrUniversity",
      name: education[0].institution,
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
