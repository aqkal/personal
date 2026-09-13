import { profile } from "@content";
import { getAllPosts } from "@/lib/blog";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-static";

function escapeXml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function GET() {
  const posts = getAllPosts().filter((p) => !p.meta.draft);

  const items = posts
    .map(
      (p) => {
        const url = `${siteUrl}/blog/${p.slug}`;
        const pubDate = new Date(`${p.meta.date}T00:00:00Z`);
        const published = Number.isNaN(pubDate.getTime())
          ? ""
          : `\n      <pubDate>${pubDate.toUTCString()}</pubDate>`;
        return `    <item>
      <title>${escapeXml(p.meta.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>${published}
      <description>${escapeXml(p.meta.description)}</description>
    </item>`;
      },
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(profile.name)} · Blog</title>
    <link>${escapeXml(`${siteUrl}/blog`)}</link>
    <description>${escapeXml("Build logs and software engineering write-ups")}</description>
    <language>en</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
