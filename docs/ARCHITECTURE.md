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
                        -> PortfolioShell (spotlight one-pager)
```

## Layers

### 1. Content (`content/`)

- `schemas.ts`: Zod schemas. Every entry carries resume data plus `world` metadata (zone, dialog lines).
- `profile.ts`, `experience.ts`, `projects.ts`, `education.ts`, `skills.ts`, `certifications.ts`: the data.
- `index.ts`: the ONLY import surface (`@content`). It runs `schema.parse()` on everything at module init, so invalid content fails the build with a precise error.
- `blog/*.mdx`: posts with Zod-validated frontmatter (`src/lib/blog.ts`).

### 2. App shell (`src/app/`)

- `/` renders `HomeShell`: reads `localStorage.interface` (via `useSyncExternalStore`), shows the mode chooser, the game, or the spotlight one-pager. Theme, Snake score, and campus passport progress use separate local-only keys.
- The initial server HTML includes the mode chooser's identity and deep-page links. A no-JavaScript fallback points to the resume and blog. A route error boundary offers retry and navigation after a rendering or chunk-loading failure.
- `/about`, `/experience`, and `/projects` redirect to the matching one-pager anchor with `view=portfolio`, so a saved game preference cannot divert those links into the campus.
- `(classic)/` route group: server-rendered pages with nav/footer. All static (SSG).
- `api/contact/route.ts`: the only server-side endpoint.
- `sitemap.ts`, `robots.ts`, `rss.xml/route.ts`, `opengraph-image.tsx`: all generated at build.
- Cloudflare serves prerendered entries from the read-only static-assets cache
  through the existing `ASSETS` binding. This is required for static dynamic
  routes such as project and blog slugs with `dynamicParams=false`, even without
  ISR. No R2, KV, revalidation queue or database is needed.

### 3. 3D world (`src/game3d/`)

- `layout.ts`: pure data. World bounds, the D-shaped Great Court, campus wings, curved cloisters, Duhig Tower, UQ Lakes, anchor slots, content mapping, colliders, camera volumes, terrain heights, and walkable areas live here. It has no Three.js import and is exercised by `scripts/verify-world.ts`. `point-collision.ts` compiles static collider bounds into a four-metre spatial grid and caches rectangle rotations. Queries retain the same circle, ellipse, rotated-rectangle and world-boundary tests, including player clearance.
- `world.tsx`: the R3F `<Canvas>`. The lighting rig is one hemisphere light plus one directional sun with the only shadow map. There are no postprocessing passes. The quality ladder adjusts device pixel ratio and shadow-map size.
- `materials.ts`: shared shading assets. The toon gradient map, `SUN_POSITION` (the one place the sun is defined), `SUN_GROUND` + `sunOffset` (which direction and how far shadows fall), the soft shadow alpha mask, and `tileTexture` (repeat + anisotropy + color space in one call).
- `authored-campus.tsx`, `authored-layout.ts`: the Blender campus GLB and its exported layout metadata, including the Great Court, landmarks, work buildings, bridge, furniture, and vegetation. Shared material batches keep submissions bounded. The old procedural campus/building modules are not mounted in the playable world.
- `nature.tsx`: sky, clouds, shared water shader, chooser ground and paths, and the shared instanced trees.
- `terrain.ts`, `campus-landscape.tsx`: one rounded mainland descriptor drives the visible extruded island, water boundary checks, and physics ground. A single surrounding water plane replaces separate overlapping reaches. The lake is a real hole with its own water surface.
- `shore-boundary.ts`, `shore-rails.tsx`: a Blender-authored kerb and railing follows the rounded mainland, inset 0.6 metres. The shared layout drives 147 rail panels and 149 posts, the Blender export, route and camera blockers, and Rapier solids. Ferry and bridge access gaps remain open. The runtime uses three static material batches, two shadow submissions, and no frame callbacks. The existing lookout rail is retained without duplication.
- `welcome-plaza.tsx`, `skills-garden.tsx`, `lookout-island.tsx`: merged finishing geometry for the connected fountain bowl and paving, four skill stations, and the furnished bridge landing. Lookout openings align with bridge and ferry dock.
- `world-details.tsx`: four readable wayfinding signs, placed at junctions and entrances. `area-labels.tsx` adds floating district labels. `campus-students.tsx` animates at most six nearby students on checked paths.
- `physics-world.tsx`, `collision-manifest.ts`, `travel-layout.ts`: one fixed 60 Hz Rapier simulation with interpolated rendering drives walking, buggy movement, passenger ferry rides, and bounded movable props. Static collision comes from exported architecture and shared ground descriptors. The buggy has unlimited forward and reverse boost; swept collision allows retreat from a slight initial overlap.
- The authored collision export includes raised studio plinths, closed doors,
  glass skins and facade mullions. Cart sweeps use its full canopy/wheel/bumper
  envelope, and the scooter envelope includes rider clearance. Rejected yaw
  falls back to the current orientation while still allowing a safe retreat.
  Shipped-GLB ray and low-overhang checks cover these boundaries.
- `travel-presentation.tsx`: publishes one shared interpolated pose for each vehicle. Rapier runs at frame priority `-50`, presentation reads its interpolated Object3D at `-40`, and the rider and camera consume that pose at `-1`, before vehicle mesh callbacks at `0`. Wheels, handlebars and rider lean use the same interpolation fraction and resolved travel distance. Large teleports snap the shared pose; pausing freezes its last presented fraction. This keeps the 60 Hz collision simulation independent of display refresh rate.
- Vehicle steering progressively widens turns at speed while retaining tight parking turns and gradual auto-centering. Braking and coasting reach an exact stop. The buggy retains its last valid heading when a terrain move is rejected. Scooter speed remains 8 metres per second on every permitted surface, with a forward boost to 14; its ground and headroom checks permit low raised floors and reject the pedestrian bridge approach.
- Both vehicles have a handbrake drift: turning with Space/brake at forward
  speed reduces lateral grip and adds yaw momentum. The brake always drains
  speed, even with throttle held, so a slide ends in a stop. The golf cart
  carries a broader slide than the scooter; releasing the brake restores grip.
  Fixed-step world velocity is swept against collision geometry and only drift
  start/end events cross the HUD bus.
- `drift-marks.tsx` and `skid-trails.ts` reuse a pool of 512 tyre-mark segments
  in one unlit, non-shadowing draw. Marks follow interpolated rear-wheel contacts,
  fade over 22 seconds, and break at teleports, pauses and discontinuities.
  `skid-uploads.ts` uploads only overwritten slots, preserving pending changes
  across deferred renders and splitting ranges when the pool wraps.
- `camera-boom.ts`, `player-visibility.tsx`: endpoint occupancy with hysteresis keeps follow distance stable when the player sightline is obstructed. An unchanged resolved endpoint reuses the requested endpoint's occupancy result, and retraction starts after the already tested blocked endpoint. Query reduction preserves camera positions, sampling intervals and hysteresis. A single depth-tested silhouette plane fades in through opaque geometry without extra lights or postprocessing.
- `signage.ts`: wayfinding atlas dimensions and positions shared by rendering and collision. Each 512 by 128 tile maps to a 4 by 1 face, with proportional gutters and outward-facing copies on both sides. Unlit sign faces retain contrast under foliage without extra lights.
- `authored-exhibits.tsx`: authored project-gallery displays and their lightweight bonus models.
- `player.tsx`, `student-avatar.tsx`: shared skinned Blender character and clips, gait matched to resolved travel distance, vehicle seating, and a stable orbitable follow camera. Physics is independent of animation.
- `electric-scooter.tsx`: five merged mesh batches share one material. Its standing rider uses the shared character rig. The surface and sweep checks live in `travel-layout.ts` and `physics-world.tsx`.
- Transport presentation rejects non-finite interpolated positions and rotations,
  and prevents a bad sample from permanently poisoning accumulated travel.
  Scooter wheel angles have a final finite guard and wrap within one revolution,
  so a recovered body cannot leave its two wheel meshes with invalid matrices.
- `campus-audio.tsx`, `audio-music.ts`, `audio-effects.ts`: one gesture-started Web Audio context mixes an original score, environmental sound and action cues. A 10 Hz scheduler handles audio without adding a frame callback. Muted music stops its voices and skips bar scheduling; unchanged music and master gains do not repeatedly schedule AudioParam ramps. Mix preferences live in `src/game/audio-settings.ts`; hidden tabs stop sound and exiting the world disposes the context.
- Drift audio combines a short chirp, rubber-tone resonances and low-level scrub
  noise in one reusable layer. Its gain follows actual slide strength and speed.
  The default music mix is 0.30; saved user mix settings retain precedence.
- `camera-controls.tsx`: drag to orbit, wheel/pinch to zoom, any input skips the intro.
- `interactions.tsx` + `target-ring.tsx`: proximity detection -> hint chips + pulsing ground ring -> panel open.
- `state.ts`: mutable frame state (`playerPos`, `playerHeading`, `cameraOrbit`, `runtime.paused`, `joystick`, `activeTarget`). Dependency-free so HUD components can import it without pulling three.js.
- Map UI (`src/components/game/world-map.tsx`): a live corner minimap and an M-key full map overlay with legend, both drawn on 2D canvas straight from `layout.ts` data.

### 4. Spotlight One-Pager (`src/components/portfolio/`)

- `portfolio-shell.tsx`: interface 2. It composes the split hero, proof ticker,
  about, experience, projects, skills, writing, contact, and footer sections,
  plus scroll-spy navigation. The latest post metadata arrives from the server
  through `HomeShell`.
- `character-portrait.tsx`: the game's student character frozen mid-wave in
  a one-frame (`frameloop="demand"`) R3F canvas; software-GL visitors get an
  initials medallion instead.

### 5. fx primitives (`src/components/fx/`)

`Reveal`, `Ticker`, `Counter`: the micro-interaction kit
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

- ONE shadow map: the sun's, PCF, 1536 or 1024 depending on tier.
  Its ortho frustum FOLLOWS THE CAMERA rather than covering the whole campus:
  the half-extent is `clamp(orbit distance * 2.6, 34, 62)`, quantised to 4
  units, centred slightly ahead of the player along the view direction, and
  snapped to whole texels in the light's own basis (`SUN_BASIS`). Quantising
  the size matters as much as snapping the centre: a continuously changing
  texel size defeats the snap and the edges crawl. `shadowMap.autoUpdate` is
  off, and the map re-renders when that snapped centre moves, whenever a mounted
  vehicle's presented pose changes, or every other frame otherwise. Moving
  vehicle shadows must not reuse a previous physics tick's pose.
- NO postprocessing passes (native MSAA does the antialiasing), NO point
  lights. Two lights total: hemisphere sky bounce + directional sun. Tone
  mapping is `Neutral`, not R3F's ACES default. The canvas context is opaque
  (`alpha: false`); the scene always paints a background, and an alpha canvas
  makes the browser composite it against the page every frame.
- The quality ladder is a single `TIERS` table in `world.tsx`, now TWO steps
  (dpr 1.35 / shadow 1024, and dpr 1.5 / shadow 1536), stepped by
  `PerformanceMonitor`. Both are shadowed. The three low tiers were deleted
  after review; see docs/DECISIONS.md.
- Shadow participation is decided in one place (`ShadowRig`) by material shape,
  not by tagging meshes: shader materials (sky, water), `BackSide` outline
  hulls and depth-write-less decals never take part, and `userData.noShadow`
  opts out far scenery and clouds.
- The full playable world loads only after the visitor picks Game mode. The
  lazy chooser diorama and demand-rendered portfolio portrait also use Three.js,
  so non-game interfaces are not universally Three.js-free.
- Everything repeated is instanced: trees, canopy puffs, blossom carpets,
  blob shadows, clouds, lamps, bridge steel,
  cloister columns, arcade cabinets, garden crystals. Hundreds of objects for
  a few dozen draw calls.
- Sixteen static instance batches use `frames={1}` so their transforms upload
  once. Animated foliage updates at 30 Hz, and software-renderer detection is
  cached across the world, chooser diorama, and character portrait.
- **Measure before changing anything.** `?perf` turns on a frame readout
  (`src/game3d/perf-probe.tsx` + `src/components/game/perf-overlay.tsx`) that
  wraps the renderer. The probe begins at priority `-100`, so `cbs` includes
  physics, presentation, player and other frame callbacks before rendering.
  `draw` is CPU time inside `gl.render`. `outside` is the interval from the
  previous render's end to the next frame's start, including VSync,
  compositor and scheduling waits; it does not attribute that interval to
  CPU work or GPU work. `gpu` uses `EXT_disjoint_timer_query_webgl2` when
  available, sampling every 31 frames and beginning and ending each query
  within the same render submission. The odd interval samples both phases
  of the alternating shadow cadence. Shadow submission time and calls are
  also reported separately. `?perf=light` retains CPU/FPS readings without
  GPU timer queries. Ordinary visits mount no probe or renderer wrappers.
  `?tier=N` pins the quality ladder for comparisons; `?perf` also exposes
  `window.__gl`, `__scene`, `__perf` and `__g3d`.
  Take baselines from a PRODUCTION build: `NEXT_DIST_DIR=.next-prof next build`
  builds beside a running dev server instead of fighting it for `.next`.
  Development tooling and instrumentation can distort timing, so compare
  equivalent routes, viewport sizes, tiers and profiling modes.
- **Measure draw calls with the current scene.** An earlier profiling pass
  reduced submissions from 289 to about 210 including shadows. Those are
  historical figures, not current scene counts or proof of an FPS gain.
  Two rules keep submissions bounded: repeated objects are instanced, and
  static geometry sharing a material is merged. The Great Court's eight
  sandstone volumes are a single mesh, with the tile repeat baked into the UVs
  so one texture serves surfaces of different sizes.
- The shadow pass roughly doubles whatever casts, so `ShadowRig` drops any
  mesh whose world-space bounding radius is under 0.3: a shadow smaller than a
  shadow-map texel costs a draw call to render nothing.
- Cheap materials everywhere: Lambert/Basic/Toon, canvas textures, one custom
  shader shared by the river and fountain, and one for the sky dome.
- The sky writes background clip depth and renders after opaque geometry, so
  depth testing rejects pixels already covered by the campus while preserving
  the sky direction and colours. Water surfaces with shore effects disabled
  compile out the unused shoreline calculations. Persistent HUD glass uses
  its tinted background without backdrop blur over the moving canvas;
  temporary modal and travel overlays can still blur their backdrop.
- Per-frame data lives in refs/module state; React re-renders only on
  discrete events (panel open/close, hints, proximity labels).
- `prefers-reduced-motion` skips the intro fly-in and cloud drift.

- **Post-processing was measured and rejected**, not assumed. See
  docs/DECISIONS.md for the numbers.

Anything added to the world must respect this contract: no new lights, one
shadow map, no fullscreen passes, instanced if repeated, merged if static.

### Performance and transport regression checks

Game `.glb.gz` files are compressed file content with `application/gzip`, not
an HTTP Content-Encoding override. The shared GLTF loader decompresses them
using the browser's DecompressionStream before parsing, and accepts plain GLB
buffers too. This avoids double HTTP encoding by Cloudflare Static Assets and
keeps small, self-hosted transfers on both hosts. Next's hashed JS/CSS files use
immutable caching on Cloudflare via `public/_headers`.

```bash
node --import tsx scripts/verify-frame-cpu.ts
node scripts/verify-travel-presentation.mjs
node --import tsx scripts/verify-physics.ts
node --import tsx scripts/verify-world.ts
```

The frame CPU check compares more than 363,000 positions against the original
full collider scan, including individual collider boundaries, and verifies
unchanged camera endpoints with fewer occupancy queries. A 60,000-query CPU
microbenchmark measured about 387 ms for the full scan and 2.1 ms for the grid
in one run. This is an isolated query measurement, not a browser FPS result.
Transport checks cover shared pose interpolation and fixed physics outcomes
across render cadences, alongside braking, reverse, boost, safe exits and
raised-floor collision checks.

## Swapping in real 3D assets later

The authored Blender scenes are loaded as ordinary R3F components. Replacement models stay self-hosted under `public/assets/` so layout, interactions, and content can keep using the same local asset contract.
