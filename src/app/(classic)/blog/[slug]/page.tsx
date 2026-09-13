import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";
import { blogUi, profile } from "@content";
import { getAllPosts, getPost } from "@/lib/blog";
import { formatDate } from "@/lib/dates";
import { mdxComponents } from "@/components/mdx-components";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const canonical = `/blog/${post.slug}`;
  const author = profile.name === "Your Name" ? undefined : profile.name;
  return {
    title: post.meta.title,
    description: post.meta.description,
    authors: author ? [{ name: author }] : undefined,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: post.meta.title,
      description: post.meta.description,
      publishedTime: post.meta.date,
      modifiedTime: post.meta.updated,
      authors: author ? [author] : undefined,
      tags: post.meta.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.meta.title,
      description: post.meta.description,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <article className="blog-article mx-auto max-w-4xl">
      <header className="blog-article-header mx-auto max-w-3xl text-center">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-accent">
          <span aria-hidden>←</span> {blogUi.allPostsLabel}
        </Link>
        <h1 className="mt-7 text-balance font-display text-4xl font-semibold leading-[1.06] tracking-[-0.04em] sm:text-6xl">
          {post.meta.title}
        </h1>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
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
        {post.meta.tags.length > 0 && (
          <ul aria-label={blogUi.topicsLabel} className="mt-5 flex flex-wrap justify-center gap-2">
            {post.meta.tags.map((tag) => (
              <li key={tag} className="rounded-full border border-line bg-raised px-2.5 py-1 font-mono text-[11px] text-muted">
                {tag}
              </li>
            ))}
          </ul>
        )}
      </header>

      <div className="prose-blog mx-auto mt-12 max-w-[68ch] sm:mt-16">
        <MDXRemote
          source={post.content}
          components={mdxComponents}
          options={{
            mdxOptions: {
              rehypePlugins: [
                [rehypePrettyCode, { theme: "github-dark-default" }],
              ],
            },
          }}
        />
      </div>

      <nav aria-label={blogUi.continueLabel} className="blog-article-end mx-auto mt-16 grid max-w-3xl gap-3 border-t border-line pt-8 sm:grid-cols-2">
        <Link href="/blog" className="card-fx rounded-xl border border-line bg-surface p-5 hover:border-accent/40">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{blogUi.continueLabel}</span>
          <span className="mt-2 block font-display text-lg font-semibold text-ink">← {blogUi.allPostsLabel}</span>
        </Link>
        <Link href="/?view=portfolio" className="card-fx rounded-xl border border-line bg-surface p-5 text-right hover:border-accent/40">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{blogUi.portfolioEyebrow}</span>
          <span className="mt-2 block font-display text-lg font-semibold text-accent">{blogUi.portfolioLabel} →</span>
        </Link>
      </nav>
    </article>
  );
}
