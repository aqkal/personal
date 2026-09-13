# Design decisions

Taste calls and their reasoning, kept out of code comments on purpose.
Newest entries first within each section. Dates are 2026-08-01 unless noted.

## Audit and campus layout, 2026-09-13

- The owner requested drifting with finite momentum, skid marks and tyre sound.
  Space plus steering at speed starts the slide, but holding the brake must
  bring either vehicle to rest even with the accelerator held. The cart has a
  broader slide, the scooter a shorter one. One bounded trail mesh and one
  reusable audio layer provide feedback without particle systems or new lights.
  Music starts at 30% by default, reduced from 65%.
- The owner requested visible land-edge barriers made in Blender. A beveled
  sandstone kerb, graphite-bronze twin rails, bronze caps and substantial end
  posts mark the mainland edge. A 4.6-metre ferry opening and 6.4-metre bridge
  opening preserve access. The border stays low enough to keep river views
  open and uses three merged material batches for predictable rendering cost.
- At the owner's request, BucklerX sits behind the south-facing Qualia and DSR
  row, with a narrow approach lane between the front studios. Model, map,
  colliders and entrance derive from the updated layout and Blender metadata.
- Identity and deep-page links are visible before JavaScript loads. Initial
  entrance effects must not hide readable server HTML. The mobile two-row
  navigation has matching hero and sticky-heading clearance.
- Profile name and social URL placeholders are intentionally deferred by the
  owner. They were not inferred from local account or contact details.

## Waterfront and signage, 2026-09-06

- The owner requested a modern raised bridge with ferry traffic beneath it. A slim cable-stayed crossing now spans 48 world units with smooth approaches and a 4.8-unit-high central deck. A furnished lookout sits on the far bank; shared height and collision data keep movement, camera, navigation and map aligned. The skyline moves beyond the new lookout rather than intersecting it.
- Rounded river reaches, two CityCat-inspired twin-hull ferries, and a tapered sailboat provide a coherent Brisbane waterfront. These are stylized interpretations. Ferries travel in opposite directions under the clear span at z=52 and z=57; no support piers obstruct those lanes. Wakes face upward, heading matches travel, and active-time animation pauses with gameplay and reduced-motion preferences.
- A supplied screenshot exposed compressed lettering on campus boards. The previous 16:1 atlas rows were stretched onto roughly 4:1 faces. Tiles now match physical proportions, use high-contrast unlit type, and face both directions. Four retained boards use a 1024 by 256 atlas, with all faces still in one merged draw call.
- Adjacent architectural signs use front-facing plaques, proportional text and stable contrast. Context labels use a fixed readable screen size. No browser rendering or frame-rate benchmark has been performed during this pass.
- The owner retained only Great Court, Career District, UQ Lakes and Duhig Tower wayfinding boards. They sit beside the actual entrances and paths with tested reading positions. Removed boards also lose their posts, mounting pads and colliders, and the atlas drops to four tiles. Identical front/back faces omit left/right arrows, which would point the wrong way from one side.
- The UQ Lakes ground plaque shares space with the promenade ring. Its surface now sits slightly above the paving with a depth bias and no depth writes, avoiding the coplanar flicker visible in the owner's screenshot.
- The owner found automatic sightline zoom distracting. The follow camera now tests only its own occupancy, holds a recovered distance briefly, and eases back without reacting to intervening scenery. A single depth-tested, fading player marker preserves orientation through obstructions. Direct orbit and zoom controls remain available.
- The passport arrow points at the selected location, while the gold trail supplies the route around obstacles. Its clockwise bearing uses the camera's right/up axes, pitch and terrain elevation. This fixes reversed left/right guidance and keeps the arrow consistent with its displayed destination distance. Bearings update every animation frame and unwrap across the angle boundary.

## Brand and theme

- **Single accent color.** The palette collapsed from four accents
  (jacaranda, gold, teal, coral) to one champagne-gold accent after owner
  feedback that multiple colors read as non-premium. Values: light
  `#8a6110` (deep bronze, AA on the paper background), dark `#e6b761`.
  Everything else is neutral; hierarchy comes from type, spacing, and
  opacity, not hue.
- **Light mode is the default.** Owner call. Dark stays available via the
  toggle; the choice persists in `localStorage.theme`. Base neutrals are
  warm paper in light (`#faf7f0`) and neutral charcoal in dark (`#141515`).
  On 2026-09-06 the owner rejected the purple tint; text, borders, surfaces
  and shadows now use neutral or warm tones with the retained bronze accent.
- **Theme scoping.** Tokens live on `:root` (light) and `[data-theme="dark"]`
  (dark). The game shell scopes its own warm ivory HUD with espresso text
  and bronze controls. The owner explicitly accepted this palette on
  2026-09-06, replacing the earlier dark teal glass.
- **Rounded navigation and restrained motion, 2026-09-06.** Portfolio and
  deep-page navigation use full pills, including active links. Scroll
  entrances, card feedback and theme transitions respect reduced motion.
  Resume content stays fully rendered and all print styling is static.
- **Flight metaphor is loading-screen-only.** The boarding pass loader keeps
  the "flying into Brisbane" story (it narrates a real journey into the 3D
  campus). Everywhere else the owner found it out of place, so section
  labels are plain ("02 / CAREER", "03 / SELECTED WORK"), the "gate codes"
  became company monograms, and "now boarding" became "current".
- **Typography.** Bricolage Grotesque is the display face (expressive,
  distinctive, on Google Fonts so `next/font` self-hosts it under the CSP).
  Inter remains body. Press Start 2P is reserved for game-surface
  micro-labels; it is the arcade DNA, not the site voice.
- **Texture.** A pure-CSS SVG grain overlay (`.grain`, ~4-5% opacity) breaks
  up flat fills without any network fetch. Card shadows and 1px hairlines
  do the depth work; no glows except the single contact-section halo.

## Layout and structure

- **Two modes, not three.** The classic site no longer exists as an
  identity. `/about`, `/experience`, and the `/projects` index are
  permanent redirects (kept as 5-line stubs rather than config redirects so
  each carries its reasoning and survives both hosts identically). Deep
  pages that need URLs (case studies, blog, contact, resume) share the
  portfolio chrome: same nav, footer, tokens.
- **Nav mode links.** "← Portfolio" and "▶ 3D campus" on deep pages write
  `localStorage.interface` before navigating to `/`, so the home shell
  opens the intended interface instead of whatever was last used.
- **One-pager is composed of section files** under
  `src/components/portfolio/sections/`; the shell keeps only scroll-spy,
  chrome, and composition. Shared bits (PulseDot, SectionHeading, monogram)
  live in `src/components/portfolio/ticket.tsx`.
- **Horizontal overflow guard.** `body { overflow-x: clip }`: decorative
  bleeds (hero rings) must never produce a horizontal scrollbar on phones,
  and `clip` (unlike `hidden`) does not break `position: sticky`.

- **Deep-page eyebrows are plain** ("Contact", "Build logs & notes") rather
  than 3D-world zone names ("POST OFFICE", "BLOG CAFÉ"): same reasoning as
  dropping the flight metaphor; in-world naming belongs in the world.

## 3D world

- **Human scale comes from one merged dressing layer.** `WorldDetails` places
  19 static students, 9 consistent wayfinding signs, 5 picnic tables, and
  framed planted beds around the campus. The reflecting fountain, redesigned
  Post Office, and skills pergola give the plaza and outer districts distinct
  silhouettes without adding lights or runtime asset fetches.
- **Static instances upload once.** Sixteen batches use `frames={1}` because
  their transforms never change. Foliage animation updates at 30 Hz, and the
  software-renderer result is cached so the world, chooser, and portrait do
  not create separate WebGL probes.
- **The UQ precinct is a compact interpretation, not a literal campus plan.**
  The expanded north-west area uses a D-shaped Great Court, curved cloisters,
  a flat Forgan Smith tower, Duhig Tower, UQ Lakes, and the Dr Mary Mahoney AO
  Amphitheatre. Landmark copy and outbound links live in `content/campus.ts`;
  `layout.ts` owns their positions, collision volumes, and map destinations.
- **The quality ladder lost its three low tiers.** Owner call, made after
  screenshotting all five at a fixed view. Below dpr 1.0 the image is visibly
  soft, and the shadowless floor is not a quieter version of the scene, it is a
  different art direction: it flips seven things at once (shadow map off, fill
  up, key down, painted blob decals on, trees and set dressing to
  `fakeLighting`). What remains is dpr 1.35 / shadow 1024 and dpr 1.5 / shadow
  1536. The trade is accepted and deliberate: a machine that cannot hold these
  now runs slower rather than switching to a cheaper look, so "never lags" is
  weaker than it was. The painted-shadow code is left in place, unreachable,
  so the floor can be put back without rewriting it.

- **Post-processing was tried and reverted, on measurement.** A single merged
  pmndrs composite (grade, vignette, tone mapping, optional bloom) was built
  and measured against a pinned tier 4 on the reference machine (Intel UHD,
  1080p, dpr 1.5). No composer: 6.8ms GPU. Grade and vignette alone, no
  antialiasing and no bloom: 10.7ms. Plus bloom: 15.3ms. Plus 2x
  multisampling: 20.9ms. Even the cheapest variant cost +3.9ms against a 1ms
  budget, because the cost is not the shader, it is the offscreen round trip:
  the scene is written to a target, read back by the effect pass, and written
  again to the canvas, and integrated GPUs are bandwidth-bound. Reverted, the
  dependency removed. The thing that made the call possible was pinning the
  quality ladder, without which every run measured a different machine.
- **Depth comes from vertex colours, not from lighting.** With a fullscreen
  pass off the table, the look budget went where it costs nothing:
  `contactShade` bakes contact darkening and a warm ground bounce into a
  colour attribute at build time. Same idea as the baked lighting that carries
  bruno-simon.com, minus the asset pipeline, which keeps the zero-fetch
  contract. It is what stops a building reading as an object placed on top of
  a plane.
- **The shadow frustum follows the camera.** A static +/-62 box spent most of
  its texels on ground nobody was looking at: 6cm per texel at 2048. Sized
  from the orbit distance instead (+/-34 at the default zoom) it is a smaller
  texel at 1536 than the old 2048 was, so the map got both sharper and 44%
  cheaper to raster, and casters outside the box drop out of the shadow pass
  entirely. Measured at the plaza, tier 4: GPU 15.8ms to 9.8ms, draw calls 224
  every frame to 113 with 87 more only on the frames the map actually
  re-renders. Two details are load-bearing: the box size is quantised to 4
  units, because a continuously changing texel size defeats snapping, and the
  centre is snapped to whole texels, without which the sharper edges just
  crawl.
- **Camera motion stays minimal.** Look-ahead, a sprint FOV kick and roll into
  turns were tried and removed at the owner's request: rotating the horizon
  reads as shake rather than as weight. The only camera change kept is easing
  the dolly when a panel opens, which replaces a snap and so adds no motion.
- **The canvas is opaque.** `alpha: false`: the scene always paints a
  background, so the alpha channel only bought the browser a per-frame
  composite of a 1080p canvas against the page.
- **Dev frame times are not evidence.** A label experiment measured 37 to 58
  fps in dev and then failed to reproduce; the variance in a dev build is
  wider than most changes worth making. Frame-time work is now decided on a
  production build (`NEXT_DIST_DIR=.next-prof`), with the ladder pinned via
  `?tier`. GPU numbers were reliable in dev throughout, because they scale
  cleanly with dpr squared and do not care about React.
- **The scene is GPU-bound, not CPU-bound**, which was the opposite of the
  working assumption. With the frame split into its parts (`?perf`), every
  useFrame callback in the world adds up to 2.8ms while the GPU takes 12ms and
  the rest of the frame is spent waiting for it. That is why the label and
  draw-call work in the original plan was deprioritised: it was optimising the
  half of the frame that was already idle.

- **The game shell re-declares `color`, not just the theme token.** `body` sets
  `color: var(--ink)` and that resolves once; flipping `data-theme="dark"` on a
  subtree changes the variable but nothing re-applies `color`, so descendants
  kept inheriting the light theme's near-black. On the dark dialog panel that
  made every bullet list almost invisible. Any surface that forces a theme has
  to restate the colour.
- **The Qualia sign uses Qualia's own brand**, read off qualia-ai.net rather
  than guessed: `#0d1812` ground, `#0d3320` band, `#e6f1e9` text, `#cdbcec`
  accent, Inter semibold with tight tracking, and the wordmark in sentence case
  because that is how they set it. The tagline on the board is theirs.
- **Qualia is a content entry, not a bespoke landmark.** It lives in
  `content/experience.ts` like any other role, so it drives the dialog panel,
  the one-pager and the resume from one place. What makes it different is
  `world.sprite: "construction"`, which routes it out of the Career District
  tower slots and into a hand-placed build site north of the plaza. Adding the
  real details later means editing content only.
- **The site is deliberately unfinished**: concrete shell, rebar left standing,
  only the lower floors glazed, scaffolding, hoarding and a crew. Every other
  place on the campus is complete, so the one that is visibly still being made
  reads as current work rather than another building.
- **Its copy is stub-flagged.** `validate:content` now warns on Qualia's
  placeholder summary, highlights, start date and empty tech list, the same way
  it already warns about the profile placeholders, so invented scaffolding
  cannot quietly ship.
- **Zone labels test for occlusion.** `Html` has no depth test, so a label
  showed through hills and trees and read as floating over unrelated scenery.
  They now walk the line from the camera through `cameraBlocked` and hide when
  the view is obstructed, and they cull past 68 units.
- **The ladder was right; the scene was too expensive.** After all the tuning
  below, the top tier still would not hold, so the scene got measured instead
  of adjusted: 289 draw calls a frame, against a doc that claimed single
  digits. 186 of them were individual meshes. Instancing the arcade cabinets
  and garden crystals, merging the Great Court's sandstone into one mesh via
  UV-baked tile repeats, and skipping shadow casters smaller than a shadow
  texel took it to ~210. Frame rate went from 47-60 to 68-74 and the top tier
  holds. The lesson worth keeping: when a quality ladder keeps firing, measure
  the frame before touching the ladder.
- **Lamps and flowers are placed, not generated.** The lamp loops stepped every
  12 units and produced a picket line down both avenues, one lamp standing in
  the fountain, and a whole row on the same side because the alternating test
  never fired. Flowers had a third scatter ringing the plaza, which put them on
  paving and open lawn like dropped confetti. Both are now explicit lists
  covering the places a gardener would actually plant.
- **The quality ladder stopped fighting the scene.** Reported as "it suddenly
  drops from the highest tier". Four separate causes, all real:
  1. drei's `PerformanceMonitor` declines below 50fps by default, and the heavy
     views sit right on that line, so it fired constantly while the scene still
     felt smooth. Bounds are now 38-58 on a 60Hz panel: below 38 is genuinely
     choppy, and the band in between is left alone.
  2. `flipflops={3}` with a fallback to tier 1 meant ordinary hovering around
     that bound slammed quality down several steps at once. That was the sudden
     drop. Now 6, and the fallback lands on a shadowed tier.
  3. Turning shadows off is self-reinforcing: the toggle recompiles every
     material, the recompile stalls a frame, and the stall reads as another
     decline. Shadows now stay on at every tier except the floor, and the
     ladder turns shadow *resolution* instead.
  4. `shadow.mapSize` did nothing. three allocates a light's shadow map once
     and reuses it, so every resolution step in the ladder was silently a no-op
     until the old render target got disposed.
  Top-tier dpr also came down from 1.75 to 1.5; with MSAA the difference is
  close to invisible and it was most of the headroom problem.
- **Quality declines are ignored for the first 6 seconds.** The load spike
  (shader compile, texture upload, the intro fly-in) is the most expensive part
  of a session, and counting it dropped the shadow map moments after loading:
  the scene visibly fell back to painted shadows right when it makes its first
  impression. Two extra shadowed tiers were added below the top as well, so dpr
  gives way twice before shadows do.
- **Office windows are sized in world units**, not a fixed 8x14 grid stretched
  across every tower, which gave the short ones metre-wide panes. Two panes per
  metre on all three.
- **Café and post office roofs are ribbed steel**, the standard Brisbane roof.
  They were the last flat single-colour slabs in the world, and both sit right
  under the orbit camera's default angle. Ribbed rather than tiled, since tiles
  already lost once on the Great Court parapets.
- **Weatherboard lap grooves are soft.** At full strength the café read as
  corrugated cardboard instead of timber.
- **Birds got a body, size and a bank.** Two crossed slabs at 0.8 scale and 25
  up read as dirt on the lens; they are half again as large, lower, and roll as
  they glide.
- **The orbit camera has its own collision volumes** (`cameraBlocked`), kept
  separate from the player's. The player walks under canopies and past awnings;
  the camera sitting inside one fills the screen with flat green. It steps the
  orbit distance in until it is clear, and the existing position lerp smooths
  the result.
- **Bridge and lookout no longer intersect.** The deck ran two units into the
  lookout disc, so the platform appeared to slice through it. The bridge now
  stops where the disc starts and lands on it, and the railing carries a gap at
  the landing. `isInsideWorld` tests the lookout as a disc too, matching what
  is drawn.
- **Boats keep to the north-south reaches.** They used to run the full width of
  the south reach, which put them through the bridge once a lap. The bridge
  sits at water level and cannot be raised without giving the player a height
  system, so the boats moved instead.
- **River glints are noise, not a thresholded sine.** The sine ran as
  continuous bands across the surface: thick white worms crawling over the
  water. Two noise octaves at different scales break it into scattered points.
- **Zone labels are constant screen size and vanish up close.** With
  `distanceFactor` they scaled with proximity, so walking to the café filled a
  third of the screen with the word CAFÉ. Being told which zone you are in is
  only useful from outside it.
- **The skyline is textured glass, not tinted boxes.** Flat pale towers were
  bright enough for the sun to clip them to white, so the CBD read as blank
  cardboard. They carry a window map now; the instance colour is a tint, since
  the map multiplies it.
- **Flowers have stems.** Spheres floating at knee height read as confetti.
- **The quality ladder samples over 400ms, not 250.** At the default a single
  stalled frame (tab refocus, GC, a texture upload) tanked the average and
  dropped the shadow map, which then took several inclines to earn back. Found
  by watching the tier sit at 1 while the scene ran at 73fps.
- **The sun casts a real shadow map.** This reverses the original "no shadow
  maps" rule, with the owner's sign-off, because nothing else moved the scene
  as far: painted blobs can sit under an object but they cannot put a tower's
  shadow across a lawn or a lamp's across a path, and their absence was what
  read as "engine default". One directional map, PCF-soft, static +/-62 ortho,
  2048 at the top tier. Measured 100 fps before, 58-67 after, on the same
  machine. Below tier 2 the map is off and the blobs come back, so the "never
  lags" promise survives on weak hardware.
- **Sky fill dropped when shadows arrived** (hemisphere 0.95 -> 0.7, sun
  1.75 -> 2.1). With no shadows, fill light was free brightness. With shadows,
  fill is precisely what decides whether a shadow reads at all.
- **Painted lighting is the fallback, not a companion.** Two tricks fake
  directional light when there is no shadow map: blob shadows, and a lighter
  "sunlit crown" lobe on canopies and bushes. Both fight the real thing once it
  exists: a tree's blob sits exactly where its cast shadow lands, and from
  above the crown reads as a pale cap stuck on the canopy. One `fakeLighting`
  prop (`blobShadow` on the player) turns the whole set off together.
- **Canopies are seven lumps, not four.** Four puffs made a smooth ball; the
  three extra small outer lobes break the silhouette, which is what stops a
  tree reading as one flat blob. Costs instances, not draw calls.
- **Roofs are sandstone, not tile.** Terracotta pantiles were tried on the
  Great Court parapets and read as a different building bolted on top. They are
  the same masonry as the walls, laid in bigger, more weathered slabs.
- **Foliage cards point their normals up.** Vertical grass tufts face away from
  the sun, which dropped them into the darkest toon band: they were rendering
  as black scribbles on the lawn. Lit as though they were the ground they grow
  from, they read as grass.
- **Turf is olive, not pure green.** Fully saturated green across the largest
  surface in the scene was the loudest remaining "default" tell.
- **The sun is one constant** (`SUN_POSITION` in `materials.ts`). The
  directional light, the sky shader's halo, and every blob shadow's direction
  now derive from it. Shadows previously offset toward +x, which was the wrong
  side: the sun sits at +x, so they fall toward -x. `SUN_GROUND.angle` lays an
  elongated quad along that direction, so every shadow in the scene agrees
  about where the light is. That agreement, more than any single asset, is
  what makes a scene read as lit.
- **Blob shadows are soft-masked, not flat discs.** A radial alpha ramp for
  round things, a rounded-rect one for buildings and benches. A flat-opacity
  circle has a hard edge, which is the cheapest tell that a scene has no real
  shadowing. Buildings also offset by height, so towers throw further than the
  café. Lamps, benches, crystals and the fountain got shadows they never had.
- **Neutral tone mapping, not ACES.** R3F defaults to ACESFilmic, which
  desaturates and darkens midtones. That is the correct default for
  photographic PBR and the wrong one for a palette built on jacaranda purple
  and sandstone. `NeutralToneMapping` keeps the hues and still rolls off the
  sun. Exposure came back to 1.0 to compensate. One line in `world.tsx`,
  mirrored in the hero diorama and the portfolio portrait so all three
  canvases grade identically.
- **Anisotropy on every tiled surface** (`tileTexture`). Ground and paving are
  seen almost edge-on, where isotropic filtering shimmers. The ground texture
  also doubled to 512 with an added macro-blotch layer, halving the visible
  repeat frequency at the same texel density.
- **Textures are cloned, never rebuilt, per repeat.** `Paths` and `GreatCourt`
  used to call `.clone()` during render, leaking a texture on every
  quality-ladder re-render. They now build once in `useMemo`. Clone rather
  than construct: three.js shares one GPU upload across clones of a source, so
  the eight paving variants cost one texture in video memory.
- **Grass tufts left the transparent pass.** `alphaTest` without `transparent`
  keeps them opaque, so hundreds of crossed planes never sort against each
  other or against the blossom carpets.
- **One water shader, two uses.** `uShore` switches off the bank shallows and
  foam, which let the plaza fountain reuse the river's fresnel and sparkle
  instead of a flat blue disc. `uScale` sets ripple frequency per surface.
- **The ground plane is 500, not 220.** The old plane ended at x 110, which
  from the eastern edge of the playable area is 66 units: inside the fog's
  70-unit start, so the literal edge of the world was visible against the sky.
  Every edge now sits past fog-far and reads as haze. Costs nothing: same
  draw call, and the repeat scales with the size to hold texel density.
- **Zones stand on something.** The arcade got a paved pavilion floor and the
  skills garden a soft-edged bed; both previously sat straight on lawn. The
  bed deliberately renders *below* the path strips so the walkway into the
  garden stays on top of the soil.
- **5-band toon gradient** (`materials.ts`): one texture change re-bands
  every surface. The gradient map stays single-channel because three.js
  reads only the red channel; warm/cool grading lives in the two lights and
  exposure instead.
- **Sky sun direction is a uniform** matching the directional light, fixing
  a silent desync between the shader's halo and the actual key light.
  Fog and clear color equal the sky's horizon color `#d6ebf7` so distance
  fade has no seam.
- **Wind is CPU per-instance wobble** (same idiom as the clouds), not a
  shader patch: ~420 sines per frame is free, and it avoids maintaining
  onBeforeCompile injections across three.js upgrades. No-ops under
  reduced motion and software GL.
- **Character V2 stays procedural primitives** (no GLTF): keeps the
  zero-fetch CSP contract and the toy-like art direction. Two-segment limbs,
  head look-at, blinks, turn lean, sprint dust (one recycled 8-instance
  pool). The portfolio portrait duplicates the design statically; if the
  character changes again, change `character-portrait.tsx` too.
- **Boot progress is real**: dynamic-import resolution, GL context,
  `compileAsync` (which also removes the first-frame shader hitch), then an
  actual rendered frame. The pass never regresses (monotonic stage order)
  and a 7s safety timer prevents a stuck loader.

## Process

### 13 September 2026 performance and startup cleanup

- Preserve the current model detail, lighting, quality tiers, animation cadence,
  collision behavior and audio. Optimize repeated work rather than reducing
  those settings.
- Each new scooter skid slot uploads 192 bytes and a pair of cart slots uploads
  384 bytes, instead of re-uploading the 98,304-byte dynamic trail buffer. The
  real Three.js upload manager is tested against full-buffer contents after
  wrapping and delayed uploads; this is transfer reduction, not an FPS claim.
- Reuse scooter terrain samples after a complete collision sweep. Partial or
  rejected sweeps still sample the resolved endpoint. Cart terrain checks avoid
  temporary footprint objects; ferry spline points and evaluators are reused.
- Stop marker matrix updates once a route is hidden after arrival. New route
  selection resumes the same marker animation. Cache sun-frustum coordinates
  as numbers instead of formatting a key each frame; shadow cadence is unchanged.
- GameShell owns whether a session is playing. World cleanup only revokes its
  readiness. Clearing the shell's playing flag during World hot reload could
  leave a completed loading screen followed by a frozen introduction camera.
- Remove unused legacy layout tables, movement and shading helpers. Keep the
  procedural campus modules reached by the landing preview.

### September 2026 campus asset refinement

- Keep the startup boarding pass and its actual loading milestones. Remove the automatic Orientation card after loading and the repeated bordered summary from discovery panels.
- The active Blender Qualia site restores forest green, lavender and cyan accents, a yellow lattice crane, visible operator, four construction workers and scaffold detail. A freestanding "Building Qualia" board sits beside its entrance.
- DSR uses its official monochrome agency direction and distinct folios for Cubo, MBR Health and Polar LNG. Cubo uses the owner's supplied poster artwork at its original aspect ratio. References: https://dsrb.com.au/ and https://dsrb.com.au/work/cubo-constructions/.
- The project building is an open gallery with five recessed bays and a continuous front aisle. Keep the large building sign on the rear roofline so it does not obscure the models from the follow camera. Uniform exhibit scale and matching collision footprints keep the end bays clear of walls.
- The fountain has one authored hollow sandstone basin and supported upper bowl. Runtime geometry supplies water, jets and flush paving only. The rectangular court replaces the circular road-like apron; the buggy spur runs east at x=10.
- Version campus model URLs by content hash. Export compressed model bytes before publishing their revision to prevent hot reload from caching an old model under a new URL.

- CI on Linux remains the deployment source of truth. Local Windows
  `npm run build:cf` uses a narrowly scoped preload that converts denied
  package-directory symlinks to junctions inside the selected OpenNext output.
  The wrapper also normalizes the adapter's generated handler when an isolated
  `NEXT_DIST_DIR` is used. A Wrangler dry run verifies the resulting worker.

### September 2026 sound, transport and cleanup

- Optional audio uses one gesture-started Web Audio context. An original 16-bar instrumental, environmental layers and movement cues share three adjustable mixes. The mix is saved locally; enabling sound is always an explicit action. Hidden tabs and campus exits stop and release the audio.
- The graphite electric scooter uses one material and five moving mesh batches. Normal speed is 8 metres per second on every permitted surface, with 14-metre-per-second boost, braking and safe dismounting. It follows low raised floors; vehicles stop before the pedestrian bridge ramp.
- Keep the corner map compact: the map image and a single north/Map footer. Routes, destinations and transport appear as map symbols.
- Widen the gallery end clearances and lower the end returns below the project headings. Skill interaction rings sit beside their matching pedestals.
- Release component-owned geometry, textures and cloned character skeletons on exit. Avoid writing unchanged area-label opacity to the DOM every frame. Keep the campus in its original daytime presentation.

- Remove unreachable UI/scenery modules and the superseded interactive exhibit content/schema chain. Keep active asset generators, shared Three.js helpers and regression checks. Both current quality tiers use sun shadows, so obsolete player blob-shadow and effect-quality state branches are removed.
- For audio verification, run `node scripts/verify-audio-browser.mjs`, open the generated `/__audio-review.html` on the local server, and run its offline render checks. Finish with `node scripts/verify-audio-browser.mjs --clean` to remove the temporary public harness. This validates all 16 music bars, cues, surface steps, ambience, finite samples, peak levels and master mute without playing sound.

### 8 September 2026 performance and transport refinement

- Keep collision simulation at 60 Hz and publish one shared Rapier-interpolated vehicle pose for rendering. Frame order is Rapier at `-50`, transport presentation at `-40`, rider and camera at `-1`, then vehicle meshes at `0`. Wheels use resolved travel distance; steering and lean share the presented fraction. Teleports snap all consumers together, and pausing preserves the last presented pose. This removes disagreement between fixed-tick vehicle state and the displayed rider or camera without changing simulation speed.
- Suspend both rendering and Rapier when the game document loses focus, including when its window remains visible. Resuming must not reveal ferry travel or vehicle movement that happened behind a frozen picture.
- Carry the follow camera with the presented vehicle displacement, then ease only the remaining offset from mounting or changing modes. Chasing a moving world-space target caused follow lag to fluctuate by 2.57 cm with uneven 7-31 ms frames, and 10.69 cm with 80 ms hitches at boost speed. Manual orbit masked this judder. Keep walking follow and user orbit smoothing unchanged. Anchor the occlusion silhouette to the rendered player, and refresh the sun shadow for moving mounted poses between physics ticks.
- `npm run test:camera-follow` checks projected rider framing at boost speed with irregular frames, turns and hitches, plus boarding and stationary settling. It compares against a camera carried at the exact target, with the former follow behavior as a negative control.
- The portfolio portrait uses the shipped campus character with a frozen Wave pose and bounds-based full-body framing. It renders on demand without the game's runtime or animation loop; owned materials and cloned skeletons are released on unmount. Keep the software-renderer and loading-failure initials fallback.
- Progressively reduce steering angle at speed while retaining tight low-speed turns and gradual auto-centering. Braking and coasting settle to exactly zero, and rejected buggy terrain movement retains the same heading in state and Rapier. Keep the scooter's uniform 8-metre-per-second normal speed and 14-metre-per-second forward boost, its raised-floor checks and its pedestrian bridge restriction.
- Compile static point colliders into a four-metre spatial grid with conservative bounds and cached rectangle rotations. Preserve exact collision boundaries and player clearance. More than 363,000 comparisons against the former full scan pass, including individual boundary samples. One 60,000-query CPU microbenchmark measured about 387 ms before and 2.1 ms after. These timings describe the query alone and do not establish a browser FPS gain.
- Reuse identical camera endpoint occupancy results and skip the already tested blocked endpoint when retracting. The steady clear-camera test keeps the same positions with 600 queries across 600 frames, down from 1,200. Camera hysteresis and animation cadence remain unchanged.
- Render the sky at background clip depth after opaque geometry so hidden sky pixels fail depth testing. Compile shoreline calculations out of water shaders when the surface has shore effects disabled. Keep the visual palette and water effects that are actually enabled.
- Remove backdrop blur from persistent HUD glass over the moving canvas while retaining its tinted surface and borders. Temporary modal overlays keep their blur. Stop muted music voices and skip scheduling their next bar; only schedule master and music gain ramps when the effective gain changes.
- Profiling is opt-in. Ordinary visits mount no probe. The `-100` probe starts before physics so `cbs` includes physics and presentation callbacks. `draw` measures CPU render submission; `outside` includes VSync, compositor and scheduling wait and cannot identify a CPU or GPU bottleneck by itself. GPU timing begins and ends in one render submission and samples every 31 frames; `?perf=light` makes no GPU timer queries. Historical draw-call counts in earlier notes are not current performance evidence.
- Verify with `node --import tsx scripts/verify-frame-cpu.ts`, `node scripts/verify-travel-presentation.mjs`, `node --import tsx scripts/verify-physics.ts` and `node --import tsx scripts/verify-world.ts`. Compare production browser measurements at matching viewport, route, tier and profiling mode before claiming a frame-rate improvement.

### 9 September 2026 skills and journal presentation

- Present technical skills as one ungrouped, deduplicated list in the resume and portfolio. The four campus skill stations retain their internal content mapping.
- Rewrite the campus build article against the current implementation. Preserve its original publication date and record substantial revisions in an optional `updated` frontmatter field, also used for sitemap modification dates. Content validation includes blog frontmatter.
- Use a readable article column, clear heading hierarchy and horizontally scrollable code. Keep the article description in listings and metadata; do not repeat it above the opening paragraph.
