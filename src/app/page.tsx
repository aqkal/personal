import { HomeShell } from "@/components/landing/home-shell";
import { getAllPosts } from "@/lib/blog";
import { formatDate } from "@/lib/dates";

export default function Home() {
  const latest = getAllPosts().find((p) => !p.meta.draft) ?? null;
  const latestPost = latest
    ? {
        slug: latest.slug,
        title: latest.meta.title,
        description: latest.meta.description,
        dateLabel: formatDate(latest.meta.date),
        readingMinutes: latest.readingMinutes,
      }
    : null;

  return <HomeShell latestPost={latestPost} />;
}
