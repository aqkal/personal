import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";
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
  return {
    title: post.meta.title,
    description: post.meta.description,
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
    <article className="max-w-3xl">
      <Link href="/blog" className="text-sm text-muted hover:text-ink">
        ← All posts
      </Link>
      <h1 className="mt-4 text-4xl font-bold tracking-tight">
        {post.meta.title}
      </h1>
      <p className="mt-3 text-sm text-muted">
        {formatDate(post.meta.date)} · {post.readingMinutes} min read
      </p>

      <div className="prose-blog mt-10">
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
    </article>
  );
}
