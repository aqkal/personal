# Architecture

## System overview

```
content/*.ts  (Zod-validated single source of truth)
   |
   |--> classic HTML pages   src/app/(classic)/*      SEO, recruiters, a11y
   |--> 3D world spawner     src/game3d/layout.ts     buildings from content
   |--> resume page          src/app/(classic)/resume print-friendly
   |--> [v2] terminal        src/terminal/            same data, new shell
   |
src/app/page.tsx -> HomeShell (client)
   boot -> mode chooser -> GameShell (dynamic import) -> World3D (three.js)
                        -> TerminalTeaser
```

## Layers

### 1. Content (`content/`)

- `schemas.ts`: Zod schemas. Every entry carries resume data plus `world` metadata (zone, dialog lines).
- `profile.ts`, `experience.ts`, `projects.ts`, `education.ts`, `skills.ts`, `certifications.ts`: the data.
- `index.ts`: the ONLY import surface (`@content`). It runs `schema.parse()` on everything at module init, so invalid content fails the build with a precise error.
- `blog/*.mdx`: posts with Zod-validated frontmatter (`src/lib/blog.ts`).

### 2. App shell (`src/app/`)

- `/` renders `HomeShell`: reads `localStorage.interface` (via `useSyncExternalStore`), shows the mode chooser, the game, or the terminal teaser.
- `(classic)/` route group: server-rendered pages with nav/footer. All static (SSG).
- `api/contact/route.ts`: the only server-side endpoint.
- `sitemap.ts`, `robots.ts`, `rss.xml/route.ts`, `opengraph-image.tsx`: all generated at build.

### 3. 3D world (`src/game3d/`)

- `layout.ts`: pure data. Zone rectangles, anchor slots, the content -> structure mapping (`OFFICES`, `CABINETS`, `CRYSTALS`, `INTERACTABLES`), colliders, and the walkable-area function. No three.js imports, unit-testable.
- `world.tsx`: the R3F `<Canvas>`: lighting rig (ambient + hemisphere + shadow-casting moon directional + 7 accent point lights), fog, postprocessing (N8AO ambient occlusion + Bloom + Vignette + SMAA), quality ladder.
- `nature.tsx`: gradient sky dome, ground, paved paths, river (custom shader with fresnel, moon glint, edge foam), Brisbane skyline, bridge, instanced multi-puff trees with blossom carpets, instanced grass tufts, fireflies.
- `buildings.tsx`: the enclosed Great Court (sandstone brick textures, cloister colonnades, arched lit windows, south gate, clock tower), office towers, café, post office, arcade, crystals, fountain, street lamps, proximity-aware HTML labels.
- `player.tsx`: character meshes, procedural walk cycle, collision-aware camera-relative movement, orbitable third-person camera with a cinematic fly-in.
- `camera-controls.tsx`: drag to orbit, wheel/pinch to zoom, any input skips the intro.
- `interactions.tsx` + `target-ring.tsx`: proximity detection -> hint chips + pulsing ground ring -> panel open.
- `state.ts`: mutable frame state (`playerPos`, `playerHeading`, `cameraOrbit`, `runtime.paused`, `joystick`, `activeTarget`). Dependency-free so HUD components can import it without pulling three.js.
- Map UI (`src/components/game/world-map.tsx`): a live corner minimap and an M-key full map overlay with legend, both drawn on 2D canvas straight from `layout.ts` data.

### 4. Game <-> React bridge (`src/game/bus.ts`)

A typed `mitt` emitter. The world emits `panel:open` / `hint:show`; React overlays (`DialogPanel`, HUD) listen. React emits `panel:close` and `input:interact` (mobile button). Only discrete UI events cross the bus, never per-frame data.

## Dual-host constraint set

The same repo deploys to Vercel (native) and Cloudflare Workers (`@opennextjs/cloudflare`). To keep that true:

- No Vercel-exclusive services (KV, Vercel Analytics, runtime `@vercel/og`).
- Route handlers use fetch + Web APIs only; no raw Node sockets.
- Everything is static (SSG) except `POST /api/contact`. No ISR.
- `images.unoptimized: true` (image optimizer behavior differs across hosts).
- Headers/redirects live in `next.config.ts` `headers()`, honored by both.
- No runtime fetches to third-party CDNs (also enforced by CSP): fonts are self-hosted via `next/font`, 3D assets are procedural.

## Performance budget

- Landing and classic pages ship zero game code; three.js loads only after the visitor picks Game mode (dynamic import in `HomeShell` / `GameShell`).
- Trees, lamps, light pools, and skyline towers are instanced (single-digit draw calls for hundreds of objects).
- Per-frame data lives in refs/module state; React re-renders only on discrete events (panel open/close, hints).
- Bloom uses a single camera-level pass; emissive materials (`toneMapped={false}`, intensity > 1) are the only bloom sources.
- Quality ladder (`PerformanceMonitor`): full (dpr 2 + effects) -> reduced (dpr 1.25) -> minimal (no postprocessing). Software rasterizers (SwiftShader etc.) are detected at boot and pinned to the floor tier with shadows off.
- `prefers-reduced-motion` disables fireflies and effects and is respected by the landing chooser.

## Swapping in real 3D assets later

Procedural geometry keeps the repo asset-free, but `buildings.tsx` components are ordinary R3F components: replace any of them with a `useGLTF` model (self-hosted under `public/assets/`, keep CSP in mind) without touching layout, interactions, or content.
