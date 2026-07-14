# Project Context

## What this is

A personal portfolio website for a University of Queensland Software Engineering student, built as an interactive experience rather than a static page. The site presents two interfaces on landing:

1. **Game world**: a stylized 3D scene of a sunny Brisbane day, inspired by UQ's St Lucia campus. The visitor walks a small student character between zones. Interacting with a building, arcade cabinet, or garden crystal opens an RPG-style dialog with real resume content.
2. **Spotlight One-Pager**: a single scrolling portfolio page assembled from the proven patterns of the best engineer portfolios (Brittany Chiang's spotlight cursor and experience-row anatomy, Adham Dannaway's split-identity hero, Tamal Sen's funnel order, Jhey Tompkins' living footer): split hero with the 3D character as a frozen-wave portrait, proof ticker, about + fun facts, experience rows, featured project cards linking to case studies, count-up stats, the "how hiring me works" trace, latest blog post, a say-hello bookend, and a footer with a live Brisbane clock. Zero learning curve; the CS flavor is garnish.

There is always a third path: the **classic site** (`/about`, `/experience`, `/projects`, `/blog`, `/contact`, `/resume`). This is what crawlers index, what reduced-motion users get offered, and what recruiters in a hurry click.

## The world, briefly

- **UQ Campus** (north-west): an enclosed sandstone Great Court (brick coursing, cloister colonnades, arched windows, a south entrance gate) with a clock tower, jacaranda trees dropping blossom carpets, and a scholarship plaque. Interacting at the gate opens the education panel.
- **Career District** (north-east): one lit office tower per work experience entry.
- **Project Arcade** (south-east): one neon arcade cabinet per project. One extra cabinet has no label; it plays Snake, with a persistent high score.
- **Skills Garden** (south-west): one floating crystal per skill category.
- **Blog Café** (west) and **Post Office** (east): portals to the blog and contact form.
- **Brisbane river** wraps the south and east, with the city skyline and a lit bridge you can walk to a lookout on.

## Design principles

1. **One source of truth.** All resume content lives in `content/*.ts`, validated by Zod. The 3D world, the one-pager, the classic pages, and the resume page all render from the same objects. Editing content never requires touching rendering code.
2. **Never lag.** Smoothness beats spectacle, which is why the world is a bright day scene: no shadow maps, no postprocessing, two lights, everything instanced (see the performance contract in ARCHITECTURE.md). The 3D bundle loads only when chosen, per-frame data avoids React state, and a quality ladder degrades resolution before frame rate.
3. **Dual-host by construction.** The same codebase deploys to Vercel and Cloudflare Workers. Anything host-exclusive is banned (see ARCHITECTURE.md).
4. **Security and privacy by default.** Strict headers, a hardened contact endpoint, cookieless analytics, no database, no stored user data.
5. **No em dashes in any copy.** Owner's style rule; use commas, colons, or hyphens.

## Status

Built July 2026, both interfaces live. The owner's real name/social links (placeholders in `content/profile.ts`, marked TODO) are the known open item.
