# Project Context

## What this is

A personal portfolio website for a University of Queensland Computer Engineering student, built as an interactive experience rather than a static page. The site presents two interfaces on landing:

1. **Game world**: a stylized 3D scene of a sunny Brisbane day, inspired by UQ's St Lucia campus. The visitor walks a small student character between zones. Interacting with a building, arcade cabinet, or garden crystal opens an RPG-style dialog with real resume content.
2. **Spotlight One-Pager**: a single scrolling portfolio page with a split hero and frozen character portrait, proof ticker, about and experience sections, featured project cards, skills, the latest blog post, contact call to action, and a footer with a live Brisbane clock.

Deep pages for project case studies, blog posts, contact, and the resume share the one-pager's navigation and visual system. `/about`, `/experience`, and the `/projects` index redirect into the current portfolio surfaces.

## The world, briefly

- **UQ Campus** (north-west): a compact D-shaped Great Court with sandstone wings, curved cloisters, a flat Forgan Smith tower, jacarandas, and a scholarship plaque. The expanded precinct also includes Duhig Tower, UQ Lakes, and the Dr Mary Mahoney AO Amphitheatre as sourced landmark stops.
- **Work Experience** (north-east): distinct Qualia, DSR Branding, and BucklerX buildings. Their entrances open normal experience descriptions; Qualia remains under construction.
- **Projects** (south-east): five miniature project displays sit inside individual bays of an open Engineering gallery. An unobstructed front aisle connects their smaller interaction markers; each opens its normal description. A nearby bonus cabinet plays Snake with a persistent high score.
- **Skills Garden** (south-west): four sandstone stations with category symbols and skill descriptions.
- **Riverfront**: café and writing/contact stops, a passenger ferry terminal, and a raised pedestrian bridge to a furnished lookout island.
- **Playable island**: a continuous rounded campus with visible sandstone edges and surrounding water. No distant skyline buildings or unfinished far-bank lawn remain. The buggy has unlimited forward and reverse boost; ferries carry passengers between the two docks.

The compact Work index provides descriptions, routing, and safe travel immediately. Floating district labels and the map support navigation. Interactive portfolio demonstrations were superseded at the owner's request; actual work descriptions remain the primary presentation.

## Design principles

1. **One source of truth.** All resume content lives in `content/*.ts`, validated by Zod. The 3D world, the one-pager, the classic pages, and the resume page all render from the same objects. Editing content never requires touching rendering code.
2. **Protect frame time.** The world is a bright day scene with one directional shadow map, one hemisphere light, no postprocessing, and instancing for repeated geometry. The full playable world loads only when chosen, per-frame data avoids React state, and the two-tier quality ladder adjusts resolution and shadow-map size. Instrumentation is opt-in with `?perf`.
3. **Dual-host by construction.** The same codebase deploys to Vercel and Cloudflare Workers. Anything host-exclusive is banned (see ARCHITECTURE.md).
4. **Security and privacy by default.** Strict headers, a hardened contact endpoint, cookieless analytics, no database, no stored user data.
5. **No em dashes in any copy.** Owner's style rule; use commas, colons, or hyphens.

## Status

Built July 2026, both interfaces live. The owner's real name/social links (placeholders in `content/profile.ts`, marked TODO) are the known open item.
