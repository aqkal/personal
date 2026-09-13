"use client";

import Link from "next/link";
import { Reveal } from "@/components/fx/reveal";

export interface LatestPostMeta {
  slug: string;
  title: string;
  description: string;
  dateLabel: string;
  readingMinutes: number;
}

export function WritingSection({ post }: { post: LatestPostMeta }) {
  return (
    <section className="py-8">
      <Reveal>
        <Link
          href={`/blog/${post.slug}`}
          className="card-fx group relative block overflow-hidden rounded-lg border border-line bg-surface p-6 hover:border-accent/40"
        >
          <p className="microlabel font-mono text-muted">
            Latest writing · {post.dateLabel} · {post.readingMinutes} min
          </p>
          <h3 className="mt-2 font-display text-xl font-semibold transition-colors group-hover:text-accent">
            {post.title}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {post.description}
          </p>
        </Link>
        <Link
          href="/blog"
          className="mt-3 inline-block text-sm text-accent underline-offset-4 hover:underline"
        >
          All posts →
        </Link>
      </Reveal>
    </section>
  );
}
