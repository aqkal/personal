import type { Metadata } from "next";
import Link from "next/link";
import { blogUi } from "@content";
import { getAllPosts } from "@/lib/blog";
import { formatDate } from "@/lib/dates";

export const metadata: Metadata = {
  title: blogUi.metadataTitle,
  description: blogUi.metadataDescription,
  alternates: { canonical: "/blog" },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div className="blog-index mx-auto max-w-4xl">
      <header className="blog-index-header mx-auto max-w-2xl text-center">
        <p className="microlabel font-mono text-accent">{blogUi.indexEyebrow}</p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.035em] sm:text-6xl">
          {blogUi.indexTitle}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted">
          {blogUi.indexIntroduction}
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="blog-empty mx-auto mt-12 max-w-xl rounded-xl border border-line bg-surface p-8 text-center text-muted">
          {blogUi.emptyState}
        </p>
      ) : (
        <ol className="mt-12 space-y-5">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="blog-index-card card-fx group block rounded-2xl border border-line bg-surface p-6 hover:border-accent/50 sm:p-8"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                  <span>
                    {blogUi.publishedLabel}{" "}
                    <time dateTime={post.meta.date}>{formatDate(post.meta.date)}</time>
                  </span>
                  {post.meta.updated && (
                    <>
                      <span aria-hidden>·</span>
                      <span>
                        {blogUi.updatedLabel}{" "}
                        <time dateTime={post.meta.updated}>{formatDate(post.meta.updated)}</time>
                      </span>
                    </>
                  )}
                  <span aria-hidden>·</span>
                  <span>{post.readingMinutes} {blogUi.minuteReadLabel}</span>
                </div>
                <div className="mt-4 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div>
                    <h2 className="font-display text-2xl font-semibold tracking-tight text-ink transition-colors group-hover:text-accent sm:text-3xl">
                      {post.meta.title}
                      {post.meta.draft && (
                        <span className="ml-2 rounded border border-accent/50 px-1.5 py-0.5 font-mono text-[10px] text-accent">
                          {blogUi.draftLabel}
                        </span>
                      )}
                    </h2>
                    <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
                      {post.meta.description}
                    </p>
                    {post.meta.tags.length > 0 && (
                      <ul aria-label={blogUi.topicsLabel} className="mt-5 flex flex-wrap gap-2">
                        {post.meta.tags.map((tag) => (
                          <li key={tag} className="rounded-full border border-line bg-raised px-2.5 py-1 font-mono text-[11px] text-muted">
                            {tag}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <span className="font-mono text-xs font-medium text-accent">
                    {blogUi.readArticleLabel} <span aria-hidden>→</span>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
