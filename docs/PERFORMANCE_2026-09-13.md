# Performance and startup follow-up

The rendering quality settings, model assets, shadow resolution and cadence,
movement rules, animation rates and sound mix remain unchanged.

## Measured reductions

The transport benchmark warms both implementations, alternates execution order
and reports the median of three trials. Each trial evaluates 262,144 cases on
this Windows host. The 4,096-point corpus spans the world, including bridge,
lake, gallery, road and shoreline boundaries. All compared results agree.

| Calculation | Before | After |
| --- | ---: | ---: |
| Scooter destination and resolved terrain | 302.6 ms | 157.5 ms |
| Cart terrain footprint validation | 262.9 ms | 119.1 ms |
| Ferry spline pose | 339.0 ms | 25.9 ms |

These are isolated CPU measurements, not whole-game frame-rate improvements.
The production browser baseline varied with scheduling and background work,
so it does not support a reliable before/after FPS percentage.

- A clear scooter sweep reuses seven footprint samples. Partial and rejected
  sweeps still sample their resolved position.
- The cart avoids allocating a footprint array, five point objects and a
  callback for every terrain test. The ferry reuses its spline route and
  evaluators instead of reconstructing them on each fixed tick.
- Dynamic skid data previously uploaded all 98,304 bytes after any mark changed.
  It now uploads 192 bytes for one scooter mark or 384 bytes for two cart marks.
  The real Three.js upload manager reproduces the complete reference buffer,
  including pool wraps and multiple updates before a render.
- An arrived route performs zero hidden marker writes or terrain queries over
  600 tested frames. Its active matrices, pulse and arrival events are preserved.
- The sun compares cached numeric frustum coordinates instead of formatting a
  string each frame. Its shadow update conditions are unchanged.

## Startup correction

World cleanup previously set `runtime.playing=false`, even though GameShell
owns that flag. A World hot reload could therefore reset the intro camera
after the loading card had disappeared, while leaving the shell's completed
boot state untouched. World cleanup now revokes only its own readiness.
Tests execute the actual World and GameShell effect callbacks through first
boot, boot completion, world replay and shell teardown. Local browser checks
reached the normal player camera after reload and a subsequent world refresh.

The Three.js Clock and Rapier initialization notices originate in installed
dependencies. The latest stable React Three Fiber still constructs Clock;
neither dependency was downgraded or patched to hide these notices.

## Dead code

Removed unused layout tables, labels, lamp data, the old camera-solid query,
legacy movement and shading helpers, an unused student anchor, and the empty
roof-collider list. Removed their orphaned imports and private helpers too.
The older procedural campus is retained because the landing preview uses it.

## Checks

Lint, TypeScript, startup lifecycle, drift and partial uploads, route idle work,
transport equivalence, physics, building clearance, scooter rendering and all
60 navigation routes passed. Native and Cloudflare builds and their ten-page
HTTP suites passed using isolated output directories. Production browser
inspection confirmed the same 1.5 DPR, 1536 shadow map and 134.6k main-pass
triangles at the starting view, with no console errors. Temporary profiling
servers were stopped; port 3000 remains the development server.
