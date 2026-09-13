# Game asset review

Review date: 6 September 2026. The campus, character, vehicles, and bonus model are reviewed and mounted in the shared world and Physics provider.

## Campus

The campus establishes a coherent sunny UQ miniature through mixed Helidon sandstone, pale concrete, teal glazing, eucalyptus and jacaranda foliage, and restrained bronze detail. The Great Court has a readable D-shaped plan, stepped Forgan Smith tower, rhythmic recessed windows, a clear gate, and continuous open arches. Duhig, the career buildings, engineering pavilion, river café, writing pavilion, lake edge, amphitheatre, fountain, bridge, trees, and furniture retain distinct silhouettes.

The campus GLB has 10 material-batched meshes, 63,412 triangles, no textures or external buffers, and embedded vertex AO. Authored metadata supplies the collision solids, trees, entrances, and landmark footprints used by runtime layout and mapping. Independent review accepted integration, with optional later polish for engineering brace rhythm, bridge cable-plane spacing, and the café parapet.

Primary source and overview: [`assets-source/campus.blend`](../assets-source/campus.blend). The campus contact sheet and close-up review images are generated local previews under `assets-source/`; `npm run assets:build` recreates them. Individual `.blend` files sit beside them for Great Court, tower, cloister, Duhig, lake, studios, engineering, café, writing pavilion, bridge, and vegetation.

## Character

The shared skinned student model serves the player and nearby students. Its compact proportions, UQ-purple clothing, backpack, and readable limbs hold up at gameplay distance. Validation requires the rig and ten clips: Driver, Idle, Jump, Land, Run, Seated, TurnLeft, TurnRight, Walk, and Wave. Movement locks gait playback to travel speed and keeps camera motion separate from character animation.

## Vehicles

Editable sources: [`assets-source/buggy.blend`](../assets-source/buggy.blend) and [`assets-source/ferry.blend`](../assets-source/ferry.blend). The `buggy.png` and `ferry.png` files are generated local review previews from `npm run assets:build`. The buggy is a compact open campus vehicle with named wheels and seats. The twin-hull passenger ferry has forward glazing, side deck, rails, fenders, and bridge clearance. The export contains six meshes, one shared palette material, and 9,354 triangles.

## Portfolio stops and bonus

Career descriptions open directly at the Qualia, DSR, and BucklerX buildings. Five direct project description stops are grouped along the Engineering frontage, and four category stops occupy the Skills Garden. Five models from the authored exhibit GLB remain as static project displays; the interactive demonstrations and experience tables are retired. `BonusSnake` is isolated in `bonus.glb` with one mesh and one material.

## Validated transfer sizes

Current `npm run validate:assets` measurements:

| Asset | Raw | Precompressed gzip |
|---|---:|---:|
| Campus | 2027.5 KiB | 176.0 KiB |
| Character | 1023.3 KiB | 114.7 KiB |
| Vehicles | 393.7 KiB | 84.5 KiB |
| Exhibits | 693.5 KiB | 142.0 KiB |
| Bonus | 74.7 KiB | 17.5 KiB |
| **Total** | **4212.7 KiB** | **534.7 KiB** |

These are asset-file measurements, not a production JavaScript bundle measurement. Production payload figures are recorded only from a requested production build.

## Integrated correction pass

- The fountain has a continuous circular plaza above the road surfaces, two restrained paving rings, a connected upper bowl, and streams that meet the basin water.
- The Skills Garden has four category stations. Five project displays are evenly spaced at the Engineering frontage, and work descriptions open at building entrances.
- A rounded island replaces the open-ended grass plane. A continuous water surface surrounds the campus and furnished lookout; the distant skyline is removed.
- Shared terrain geometry replaces the old tiled ground collider. Route verification covers all 20 destinations through 60 route checks. Physics verification covers cadence, sampled terrain support, swept buggy impacts and reverse escape, ferry hull clearance, berths, and exits.
- Buggy boost is unlimited in both directions. Raising the canopy and pillar tops by 0.12 m gives the animated driver at least 85.1 mm clearance across the tested pitch/roll extremes. Seat, wheels, and character pose retain their original attachment positions.
- Explicit travel checks candidate camera views against static physics geometry during the fade. The final browser pass confirmed clear views for the previously occluded Digital Health display and DSR Branding entrance. Normal movement retains user-controlled orbit and stable occlusion behavior.
- CI now runs physics and authored-asset checks alongside route, content, lint, type, and both deployment builds.

The production browser pass checked the fountain, direct project details, safe travel to DSR Branding, its building interaction, and the four Skills map destinations. No browser errors were reported during that pass. Observed plaza readings varied from 65 to 87 fps in the 649 by 728 in-app viewport; these are spot readings, not a controlled desktop/mobile frame-rate benchmark. Held-input game feel, physical touch devices, and 200% browser zoom still require a broader manual acceptance pass.

The production output measured 1,986,364 gzip bytes of JavaScript, 16,099 of CSS, 303,855 of fonts, and approximately 547,408 of game GLBs: about 2.85 MB combined across all emitted client chunks and all game assets. This is a conservative file-size accounting for those categories, not an initial-route network capture. Optional server functions, HTML, and unrelated portfolio imagery are not included.
