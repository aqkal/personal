# Architecture

## System overview

```
content/*.ts  (Zod-validated single source of truth)
   |
   |--> classic HTML pages   src/app/(classic)/*      SEO, recruiters, a11y
   |--> 3D world spawner     src/game3d/layout.ts     buildings from content
   |--> resume page          src/app/(classic)/resume print-friendly
   |--> spotlight one-pager  src/components/portfolio print-quality scroll page
   |--> case studies         (classic)/projects/[slug] problem/approach/outcome
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
- `world.tsx`: the R3F `<Canvas>`. The ENTIRE lighting rig is one hemisphere light + one directional sun: no shadow maps, no postprocessing passes (see the performance contract below). Quality ladder adjusts device pixel ratio only.
- `nature.tsx`: day sky dome with sun halo, drifting instanced clouds, ground, paved paths, river (custom shader with fresnel, sun sparkle, edge foam), Brisbane skyline (instanced), bridge (instanced steelwork), instanced multi-puff trees with jacaranda blossom carpets and blob shadows, instanced grass tufts, butterflies.
- `buildings.tsx`: the enclosed Great Court (sandstone brick textures, cloister colonnades, arched windows, south gate, clock tower), glass office towers, café, post office, arcade, crystals, fountain, street lamps, proximity-aware HTML labels, instanced structure blob shadows.
- `player.tsx`: character meshes, procedural walk cycle, collision-aware camera-relative movement, orbitable third-person camera with a cinematic fly-in.
- `camera-controls.tsx`: drag to orbit, wheel/pinch to zoom, any input skips the intro.
- `interactions.tsx` + `target-ring.tsx`: proximity detection -> hint chips + pulsing ground ring -> panel open.
- `state.ts`: mutable frame state (`playerPos`, `playerHeading`, `cameraOrbit`, `runtime.paused`, `joystick`, `activeTarget`). Dependency-free so HUD components can import it without pulling three.js.
- Map UI (`src/components/game/world-map.tsx`): a live corner minimap and an M-key full map overlay with legend, both drawn on 2D canvas straight from `layout.ts` data.

### 4. Spotlight One-Pager (`src/components/portfolio/`)

- `portfolio-shell.tsx`: interface 2. Split-identity hero, proof ticker,
  about + fun facts, experience rows, featured project tilt cards, count-up
  stats, hire trace, latest-post card (meta passed from the server page
  through `HomeShell`), say-hello CTA, living footer (Brisbane clock),
  scroll-spy anchor nav. Dynamically imported; ships nothing to other pages.
- `character-portrait.tsx`: the game's student character frozen mid-wave in
  a one-frame (`frameloop="demand"`) R3F canvas; software-GL visitors get an
  initials medallion instead.
- `hire-tracer.tsx`: the animated hiring-pipeline trace.

### 5. fx primitives (`src/components/fx/`)

`Reveal`, `SpotlightArea`, `Ticker`, `Counter`: the micro-interaction kit
used by the gate, the one-pager, and classic pages. Every primitive degrades
to static markup on coarse pointers and under `prefers-reduced-motion`.
(Cursor-follow effects like magnetic buttons and tilt cards were tried and
removed at the owner's request: hover states are plain CSS only.)

### 6. Hero diorama (`src/game3d/hero-diorama.tsx`)

The landing gate's game panel: the real toon Great Court on a slow
auto-orbit. Rules: lazy-mounts only when idle AND in view, dpr <= 1.5,
frame loop paused offscreen, static frame under reduced motion, and it never
mounts on software rasterizers (`src/game3d/detect.ts`), which keep the
gradient placeholder.

### 7. Game <-> React bridge (`src/game/bus.ts`)

A typed `mitt` emitter. The world emits `panel:open` / `hint:show`; React overlays (`DialogPanel`, HUD) listen. React emits `panel:close` and `input:interact` (mobile button). Only discrete UI events cross the bus, never per-frame data.

## Dual-host constraint set

The same repo deploys to Vercel (native) and Cloudflare Workers (`@opennextjs/cloudflare`). To keep that true:

- No Vercel-exclusive services (KV, Vercel Analytics, runtime `@vercel/og`).
- Route handlers use fetch + Web APIs only; no raw Node sockets.
- Everything is static (SSG) except `POST /api/contact`. No ISR.
- `images.unoptimized: true` (image optimizer behavior differs across hosts).
- Headers/redirects live in `next.config.ts` `headers()`, honored by both.
- No runtime fetches to third-party CDNs (also enforced by CSP): fonts are self-hosted via `next/font`, 3D assets are procedural.

## Performance contract (the reason it is a day scene)

The user-facing rule is "never lags". The scene is engineered like the fast
playful WebGL portfolios (bruno-simon.com school): brightness over
brute-force lighting.

- NO shadow maps (blob-shadow discs ground every object), NO postprocessing
  passes (native MSAA does the antialiasing), NO point lights. Two lights
  total: hemisphere sky bounce + directional sun.
- Landing and classic pages ship zero game code; three.js loads only after
  the visitor picks Game mode (dynamic import in `HomeShell` / `GameShell`).
- Everything repeated is instanced: trees, canopy puffs, blossom carpets,
  blob shadows, grass tufts, clouds, lamps, bridge steel, skyline towers,
  cloister columns. Single-digit draw calls for hundreds of objects.
- Cheap materials everywhere: Lambert/Basic, canvas textures, one custom
  shader (river) and one (sky dome).
- Per-frame data lives in refs/module state; React re-renders only on
  discrete events (panel open/close, hints, proximity labels).
- Quality ladder (`PerformanceMonitor`) adjusts dpr [1, 1.75] -> [0.75, 1].
  Software rasterizers (SwiftShader etc.) are detected at boot and pinned to
  a low-dpr floor with tufts/butterflies off.
- `prefers-reduced-motion` skips the intro fly-in, clouds, and butterflies.

Anything added to the world must respect this contract: no new lights, no
shadow maps, no fullscreen passes, instanced if repeated.

## Swapping in real 3D assets later

Procedural geometry keeps the repo asset-free, but `buildings.tsx` components are ordinary R3F components: replace any of them with a `useGLTF` model (self-hosted under `public/assets/`, keep CSP in mind) without touching layout, interactions, or content.
