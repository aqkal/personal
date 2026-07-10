# CLAUDE.md

Guidance for AI coding sessions in this repo.

## What this is

A dual-interface personal portfolio: a 3D explorable Brisbane campus (three.js / React Three Fiber) and a Spotlight One-Pager portfolio, plus a classic HTML site with project case studies. Everything renders the same typed content model. Read docs/CONTEXT.md and docs/ARCHITECTURE.md before structural changes.

## Hard rules

- **Never use em dashes** in any code, copy, content, or docs. Use commas, colons, or hyphens. (Owner preference, absolute.)
- **Dual-host compatibility is non-negotiable**: every change must build for both Vercel and Cloudflare Workers. No Vercel-only or Cloudflare-only APIs, no ISR, route handlers use fetch/Web APIs only. CI builds both targets.
- **No runtime third-party fetches** (CSP blocks them): no CDN scripts, no drei `Environment` presets, no remote fonts. Fonts via `next/font`; 3D assets procedural or self-hosted.
- **Content edits happen in `content/*.ts` only.** Rendering reads from `@content` (the validated barrel). Never import raw content files directly.
- **Keep the game smooth**: the world is DAY-ONLY by design. No shadow maps, no postprocessing passes, no point lights, no per-frame React state, instancing for repeated meshes. Read the performance contract in docs/ARCHITECTURE.md before adding anything to the scene.

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
- `src/game3d/` - the 3D world; `layout.ts` is pure data (positions, colliders, content mapping); `state.ts` is the dependency-free frame state (player, camera orbit, pause)
- `src/game/bus.ts` - typed mitt bridge between world and React overlays
- `src/components/game/` - HUD, dialogs, Snake, touch controls
- `src/components/portfolio/` - the Spotlight One-Pager (interface 2)
- `src/components/fx/` - micro-interaction primitives (Reveal, SpotlightArea, Ticker, Counter). No cursor-follow effects on buttons or cards (owner preference); hover feedback is plain CSS.

## Known open items

- `content/profile.ts` has TODO placeholders for the owner's name and social URLs
