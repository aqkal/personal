import { profile } from "@content";
import { getAllPosts } from "@/lib/blog";

export const dynamic = "force-static";

function escapeXml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function GET() {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const posts = getAllPosts().filter((p) => !p.meta.draft);

  const items = posts
    .map(
      (p) => `    <item>
      <title>${escapeXml(p.meta.title)}</title>
      <link>${site}/blog/${p.slug}</link>
      <guid>${site}/blog/${p.slug}</guid>
      <pubDate>${new Date(p.meta.date).toUTCString()}</pubDate>
      <description>${escapeXml(p.meta.description)}</description>
    </item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(profile.name)} · Blog</title>
    <link>${site}/blog</link>
    <description>Build logs and software engineering write-ups</description>
    <language>en</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
