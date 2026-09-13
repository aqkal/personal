# Authored game assets

Every game model in this directory is original project work. The `.blend` files are the editable review sources. The GLBs under `public/assets/game` are runtime exports and should not be edited directly.

## Source catalogue

| Source | Purpose | Runtime export |
|---|---|---|
| `character.blend` | Rigged student and authored motion clips | `character.glb` |
| `campus.blend` | Complete UQ and Brisbane environment | `campus.glb` |
| `vehicles.blend` | Campus buggy and passenger ferry | `vehicles.glb` |
| `shore-rails.blend` | Editable sandstone kerb, bronze rails, posts and access openings | `shore-rails.glb` |
| `innovation-studios.blend` | Qualia, DSR, and BucklerX architecture review collection | Batched into `campus.glb` |
| `engineering-pavilion.blend` | Advanced Engineering pavilion review collection | Batched into `campus.glb` |
| `great-court.blend`, `forgan-smith-tower.blend`, `great-court-cloister.blend` | Heritage precinct review collections | Batched into `campus.glb` |
| `duhig-library.blend`, `duhig-lake.blend`, `lake-amphitheatre.blend` | Eastern campus review collections | Batched into `campus.glb` |
| `river-bridge.blend`, `vegetation-furniture.blend` | Riverside and campus-detail review collections | Batched into `campus.glb` |
| `exhibits/` | Individual exhibit review renders | `exhibits.glb` from `scripts/blender/exhibits.py` |

Open an individual `.blend` file to inspect its editable mesh collections, pivots, proportions, materials, and camera views. Runtime exports deliberately batch compatible geometry and materials for fewer draw calls, so the GLB hierarchy is a delivery format rather than the best authoring view.

Changes made in Blender or Python do not update a running site automatically. Save the source, run `npm run assets:build`, and reopen or reload the relevant review scene. The command runs the generators sequentially to avoid overlapping GPU and Blender work, verifies the character in a clean Blender process, and then runs the binary GLB validator. Set `BLENDER_PATH` when Blender 5.2 is not installed at `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`.

For the shoreline only, export its shared layout with
`node --import tsx scripts/blender/shore_rails_layout.ts`, then run Blender with
`--background --factory-startup --python scripts/blender/shore_rails.py`.
The generator retains individual editable components and exports three merged
material batches. It invokes the project's Node compressor so its gzip output
matches the rest of the asset pipeline. Run `npm run test:shore` after changes.

The generators are `scripts/blender/character.py`, `environment.py`, `vehicles.py`, and `exhibits.py`. Architecture for the innovation studios and engineering pavilion lives in `scripts/blender/studios.py` and is called by the environment generator. The architecture draws on UQ's descriptions of the Advanced Engineering Building as a sustainable learning facility with natural ventilation, recycled timber, and large timber supports for its glazing: [UQ opening overview](https://news.uq.edu.au/2014-09-10-unique-uq-building-offers-innovative-approaches-engineering), [UQ Green Star design notes](https://www.uq.edu.au/news/article/2012/03/green-star-approval-new-engineering-facility), and [UQ facade construction note](https://www.uq.edu.au/news/article/2012/06/crowning-glory-hoisted-new-engineering-facility).

`npm run validate:assets` checks GLB framing, embedded resources, supported compression declarations, finite transformed bounds, named roots and controls, animation contracts, materials, triangles, and raw and gzip sizes. It does not replace visual review in Blender or an authorized browser playtest. Personal content placeholders remain intentionally unchanged by the asset pipeline.
