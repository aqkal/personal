import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { blogFrontmatterSchema, type BlogFrontmatter } from "@content/schemas";

/**
 * Filesystem-backed blog: content/blog/*.mdx with Zod-validated frontmatter.
 * Everything here runs at build time only (SSG), so it works identically on
 * Vercel and Cloudflare.
 */

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export interface BlogPost {
  slug: string;
  meta: BlogFrontmatter;
  content: string;
  readingMinutes: number;
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const showDrafts = process.env.NODE_ENV === "development";
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf8");
      const { data, content } = matter(raw);
      const meta = blogFrontmatterSchema.parse(data);
      const words = content.split(/\s+/).length;
      return {
        slug,
        meta,
        content,
        readingMinutes: Math.max(1, Math.ceil(words / 220)),
      };
    })
    .filter((p) => showDrafts || !p.meta.draft)
    .sort((a, b) => b.meta.date.localeCompare(a.meta.date) || a.slug.localeCompare(b.slug));
}

export function getPost(slug: string): BlogPost | undefined {
  return getAllPosts().find((p) => p.slug === slug);
}
