import { z } from "zod";

/**
 * Single source of truth schemas.
 *
 * Every content entry carries BOTH resume data (rendered on the classic HTML
 * pages and /resume) AND game-world metadata (`world`) used by the spawner to
 * place an interactable building/cabinet/signpost in the pixel world.
 * The future terminal interface reads the same data.
 *
 * See docs/ADDING_CONTENT.md for copy-paste recipes.
 */

/** Zones of the game world. Content entries are spawned at zone anchors. */
export const zoneIdSchema = z.enum([
  "campus", // education entries
  "career", // experience entries (one office building each)
  "arcade", // project entries (one arcade cabinet each)
  "garden", // skill categories (signposts/crystals)
  "cafe", // blog café (fixed landmark)
  "post", // contact post office (fixed landmark)
]);
export type ZoneId = z.infer<typeof zoneIdSchema>;

/** How an entry appears in the game world. */
export const worldMetaSchema = z.object({
  zone: zoneIdSchema,
  /**
   * Sprite variant hint for the spawner (e.g. "office", "cabinet",
   * "signpost", "plaque"). The spawner falls back to the zone default.
   */
  sprite: z.string().max(40).optional(),
  /** RPG dialog lines shown when the player interacts, before the detail panel. */
  dialog: z.array(z.string().min(1).max(200)).min(1).max(5),
});
export type WorldMeta = z.infer<typeof worldMetaSchema>;

const slug = z
  .string()
  .regex(/^[a-z0-9-]+$/, "id must be a kebab-case slug (a-z, 0-9, -)");

/** "YYYY-MM" - formatted for display by src/lib/dates.ts */
const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "use YYYY-MM");

export const experienceSchema = z.object({
  id: slug,
  company: z.string().min(1).max(80),
  role: z.string().min(1).max(80),
  team: z.string().max(80).optional(),
  location: z.string().max(80).optional(),
  start: yearMonth,
  /** null = present */
  end: yearMonth.nullable(),
  summary: z.string().min(1).max(300),
  highlights: z.array(z.string().min(1).max(300)).min(1).max(8),
  tech: z.array(z.string().min(1).max(40)).max(16),
  world: worldMetaSchema,
});
export type Experience = z.infer<typeof experienceSchema>;

export const projectSchema = z.object({
  id: slug,
  name: z.string().min(1).max(80),
  /** Short punchy line shown on cards and the arcade cabinet marquee. */
  tagline: z.string().min(1).max(120),
  /** e.g. "University of Queensland - DECO3801" or "Personal project" */
  context: z.string().min(1).max(120),
  year: z.number().int().min(2000).max(2100),
  description: z.string().min(1).max(600),
  highlights: z.array(z.string().min(1).max(300)).min(1).max(8),
  tech: z.array(z.string().min(1).max(40)).min(1).max(16),
  links: z
    .object({
      github: z.url().optional(),
      live: z.url().optional(),
    })
    .optional(),
  featured: z.boolean().default(false),
  /** Optional story for the /projects/[slug] case page. */
  caseStudy: z
    .object({
      problem: z.string().min(1).max(600),
      approach: z.string().min(1).max(600),
      outcome: z.string().min(1).max(600),
    })
    .optional(),
  world: worldMetaSchema,
});
export type Project = z.infer<typeof projectSchema>;

export const educationSchema = z.object({
  id: slug,
  institution: z.string().min(1).max(120),
  degree: z.string().min(1).max(120),
  location: z.string().max(80).optional(),
  start: yearMonth,
  end: yearMonth.nullable(),
  highlights: z.array(z.string().min(1).max(300)).min(1).max(8),
  world: worldMetaSchema,
});
export type Education = z.infer<typeof educationSchema>;

export const skillCategorySchema = z.object({
  id: slug,
  title: z.string().min(1).max(60),
  skills: z.array(z.string().min(1).max(60)).min(1).max(24),
  world: worldMetaSchema,
});
export type SkillCategory = z.infer<typeof skillCategorySchema>;

export const certificationSchema = z.object({
  id: slug,
  name: z.string().min(1).max(120),
  description: z.string().max(300).optional(),
});
export type Certification = z.infer<typeof certificationSchema>;

export const profileSchema = z.object({
  /** Display name used across the site, resume, and SEO. */
  name: z.string().min(1).max(80),
  tagline: z.string().min(1).max(160),
  location: z.string().max(80),
  /** Shown publicly on the site (it is on the resume anyway). */
  email: z.email(),
  socials: z.object({
    github: z.url(),
    linkedin: z.url(),
  }),
  /** One-liner describing current availability, shown on /contact. */
  availability: z.string().max(160).optional(),
  softSkills: z.array(z.string().min(1).max(60)).max(12),
  /** Short personality facts for tickers and the about page. */
  funFacts: z.array(z.string().min(1).max(90)).max(8).default([]),
});
export type Profile = z.infer<typeof profileSchema>;

/** Blog post frontmatter (content/blog/*.mdx). */
export const blogFrontmatterSchema = z.object({
  title: z.string().min(1).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD"),
  description: z.string().min(1).max(240),
  tags: z.array(z.string().min(1).max(30)).max(8).default([]),
  draft: z.boolean().default(false),
});
export type BlogFrontmatter = z.infer<typeof blogFrontmatterSchema>;
