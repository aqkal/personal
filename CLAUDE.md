# CLAUDE.md

Guidance for AI coding sessions in this repo.

## What this is

A dual-interface personal portfolio: a 3D explorable Brisbane campus (three.js / React Three Fiber) plus a classic HTML site, with a terminal interface planned for v2. Read docs/CONTEXT.md and docs/ARCHITECTURE.md before structural changes.

## Hard rules

- **Never use em dashes** in any code, copy, content, or docs. Use commas, colons, or hyphens. (Owner preference, absolute.)
- **Dual-host compatibility is non-negotiable**: every change must build for both Vercel and Cloudflare Workers. No Vercel-only or Cloudflare-only APIs, no ISR, route handlers use fetch/Web APIs only. CI builds both targets.
- **No runtime third-party fetches** (CSP blocks them): no CDN scripts, no drei `Environment` presets, no remote fonts. Fonts via `next/font`; 3D assets procedural or self-hosted.
- **Content edits happen in `content/*.ts` only.** Rendering reads from `@content` (the validated barrel). Never import raw content files directly.
- **Keep the game smooth**: no per-frame React state, instancing for repeated meshes, respect the quality ladder in `src/game3d/world.tsx`.

## Commands

```bash
npm run dev              # dev server
npm run lint             # eslint (includes React Compiler rules; keep it clean)
npm run typecheck        # tsc --noEmit
npm run validate:content # Zod-validate content files
npm run build            # Vercel-target production build
npm run preview:cf       # Cloudflare Workers build + local preview
```

Run lint + typecheck + build before declaring work done.

## Layout cheat sheet

- `content/` - single source of truth (Zod schemas in `schemas.ts`, barrel in `index.ts`)
- `src/app/(classic)/` - server-rendered HTML pages
- `src/app/api/contact/` - the only server endpoint (see docs/SECURITY.md before touching)
- `src/game3d/` - the 3D world; `layout.ts` is pure data (positions, colliders, content mapping)
- `src/game/bus.ts` - typed mitt bridge between world and React overlays
- `src/components/game/` - HUD, dialogs, Snake, touch controls
- `src/terminal/` - reserved for the v2 terminal interface

## Known open items

- Terminal interface (v2): design with the owner, feed it from `@content`
- `content/profile.ts` has TODO placeholders for the owner's name and social URLs
