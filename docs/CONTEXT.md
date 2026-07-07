# Project Context

## What this is

A personal portfolio website for a University of Queensland Software Engineering student, built as an interactive experience rather than a static page. The site presents two interfaces on landing:

1. **Game world (live)**: a stylized 3D night scene inspired by UQ's St Lucia campus and Brisbane. The visitor walks a small student character between zones. Interacting with a building, arcade cabinet, or garden crystal opens an RPG-style dialog with real resume content.
2. **Terminal (v2, planned)**: a command-line interface over the same content. The landing page shows it as a teaser; `src/terminal/` is reserved for it.

There is always a third path: the **classic site** (`/about`, `/experience`, `/projects`, `/blog`, `/contact`, `/resume`). This is what crawlers index, what reduced-motion users get offered, and what recruiters in a hurry click.

## The world, briefly

- **UQ Campus** (north-west): sandstone Great Court with cloister columns, a clock tower, warm lit windows, jacaranda trees, and a scholarship plaque. Interacting opens the education panel.
- **Career District** (north-east): one lit office tower per work experience entry.
- **Project Arcade** (south-east): one neon arcade cabinet per project. One extra cabinet has no label; it plays Snake, with a persistent high score.
- **Skills Garden** (south-west): one floating crystal per skill category.
- **Blog Café** (west) and **Post Office** (east): portals to the blog and contact form.
- **Brisbane river** wraps the south and east, with the city skyline and a lit bridge you can walk to a lookout on.

## Design principles

1. **One source of truth.** All resume content lives in `content/*.ts`, validated by Zod. The 3D world, the classic pages, the resume page, and (later) the terminal all render from the same objects. Editing content never requires touching rendering code.
2. **Never lag.** Smoothness beats spectacle. The 3D bundle loads only when chosen, heavy objects are instanced, per-frame data avoids React state, and a quality ladder degrades resolution and effects before frame rate.
3. **Dual-host by construction.** The same codebase deploys to Vercel and Cloudflare Workers. Anything host-exclusive is banned (see ARCHITECTURE.md).
4. **Security and privacy by default.** Strict headers, a hardened contact endpoint, cookieless analytics, no database, no stored user data.
5. **No em dashes in any copy.** Owner's style rule; use commas, colons, or hyphens.

## Status

Built July 2026. The terminal interface and the owner's real name/social links (placeholders in `content/profile.ts`, marked TODO) are the known open items.
