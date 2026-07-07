# Adding Content

Everything below is a content-file edit only. The 3D world, the classic pages, and the resume update automatically. After any change, run:

```bash
npm run validate:content
```

## Fill in your identity (do this first)

Edit [content/profile.ts](../content/profile.ts): replace the TODO name and social URLs. This single file drives the hero, HUD, resume header, SEO metadata, JSON-LD, and the OG share image.

## Add a work experience

Append to the array in [content/experience.ts](../content/experience.ts) (newest first):

```ts
{
  id: "acme-corp",                       // kebab-case, unique
  company: "Acme Corp",
  role: "Software Engineer Intern",
  location: "Brisbane",                  // optional
  start: "2026-11",                      // YYYY-MM
  end: null,                             // null = present
  summary: "One-line summary for cards.",
  highlights: [
    "Did a concrete thing with a measurable outcome.",
    "Another bullet, same voice as the rest of the resume.",
  ],
  tech: ["TypeScript", "AWS"],
  world: {
    zone: "career",
    dialog: [
      "Acme Corp, where the anvils are artisanal.",
      "Step inside to see what I shipped.",
    ],
  },
},
```

Result: a new lit office tower appears in the Career District (up to 3 tower slots are pre-placed in `src/game3d/layout.ts` `OFFICE_SLOTS`; add a slot there if you outgrow them), plus a card on `/experience` and a resume section.

## Add a project

Append to [content/projects.ts](../content/projects.ts). Same shape idea; `world.zone` is `"arcade"` and the entry becomes a neon arcade cabinet. The cabinet row has 6 slots (`layout.ts`, `cabinetSlot`); the secret Snake cabinet always takes the slot after your last project.

```ts
{
  id: "cool-thing",
  name: "Cool Thing",
  tagline: "One punchy line for the card and marquee",
  context: "Personal project",           // or "University of Queensland - COURSE1234"
  year: 2026,
  description: "Two or three sentences on what it is and why it matters.",
  highlights: ["Built X.", "Deployed Y."],
  tech: ["Next.js", "Postgres"],
  links: { github: "https://github.com/you/cool-thing" },  // optional
  featured: true,                        // featured projects sort first
  world: {
    zone: "arcade",
    dialog: ["COOL THING - insert coin!"],
  },
},
```

## Add a skill category

Append to [content/skills.ts](../content/skills.ts) with `zone: "garden"`. It becomes a floating crystal (5 pedestal slots in `layout.ts` `CRYSTAL_SLOTS`).

## Add a blog post

Create `content/blog/my-post.mdx`:

```mdx
---
title: "My post title"
date: "2026-08-01"
description: "One-sentence summary shown on cards and in RSS."
tags: ["nextjs"]
draft: false
---

Write MDX here. Code blocks get shiki syntax highlighting:

​```ts
const hello = "world";
​```
```

`draft: true` posts render in dev but are excluded from production builds, the sitemap, and RSS. The URL becomes `/blog/my-post`.

## Update education or certifications

Edit [content/education.ts](../content/education.ts) (spawns on the campus) or [content/certifications.ts](../content/certifications.ts) (listed on `/about` and the resume; not in the world).

## Rules enforced by validation

- `id` must be kebab-case and unique per file
- dates are `YYYY-MM` (`end: null` = present)
- dialogs: 1 to 5 lines, each under 200 characters
- string length caps exist on every field; the validator error names the exact path when something is off
