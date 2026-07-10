import type { MetadataRoute } from "next";
import { projects } from "@content";
import { getAllPosts } from "@/lib/blog";
import { siteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/about",
    "/experience",
    "/projects",
    "/blog",
    "/contact",
    "/resume",
  ].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const projectPages = projects.map((p) => ({
    url: `${siteUrl}/projects/${p.id}`,
    changeFrequency: "yearly" as const,
    priority: 0.6,
  }));

  const posts = getAllPosts()
    .filter((p) => !p.meta.draft)
    .map((p) => ({
      url: `${siteUrl}/blog/${p.slug}`,
      lastModified: p.meta.date,
      changeFrequency: "yearly" as const,
      priority: 0.5,
    }));

  return [...staticRoutes, ...projectPages, ...posts];
}
