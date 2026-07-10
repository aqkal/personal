import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import { formatDate } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Build logs and write-ups: how this 3D portfolio world was made, and other software engineering notes.",
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div className="max-w-3xl">
      <p className="font-mono text-xs tracking-[0.2em] text-neon">
        BLOG CAFÉ
      </p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">
        Blog
      </h1>
      <p className="mt-3 text-muted">
        Build logs, write-ups, and lessons learned. Freshly brewed.
      </p>

      {posts.length === 0 ? (
        <p className="mt-10 text-muted">First post brewing…</p>
      ) : (
        <ul className="mt-10 space-y-5">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/blog/${p.slug}`}
                className="block rounded-lg border border-line bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-cyan/50"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-xl font-semibold text-ink">
                    {p.meta.title}
                    {p.meta.draft && (
                      <span className="ml-2 rounded border border-amber/50 px-1.5 py-0.5 text-[10px] text-amber">
                        DRAFT
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-muted">
                    {formatDate(p.meta.date)} · {p.readingMinutes} min read
                  </p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {p.meta.description}
                </p>
                {p.meta.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.meta.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded border border-line bg-raised px-2 py-0.5 text-xs text-cyan"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
