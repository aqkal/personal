# Portfolio asset coverage

Audit date: 6 September 2026. `Reviewed` means the authored source, exported model, runtime placement, interaction, and fallback content have been checked. The HTML pages remain authoritative for portfolio claims.

## Work and project evidence

| Content ID | World anchor | Authored representation | HTML fallback | Status |
|---|---:|---|---|---|
| `qualia` | construction door `(18, -18.8)` | Active construction site with a direct description panel | `/experience`, `/resume` | Reviewed; preserves the “Still going up” story |
| `dsr-branding` | atelier entrance | DSR atelier with a direct description panel | `/experience`, `/resume` | Reviewed |
| `bucklerx` | lab entrance | BucklerX split lab with a direct description panel | `/experience`, `/resume` | Reviewed |
| `hull-ship-inspector` | Engineering frontage | Direct project description station | `/projects/hull-ship-inspector`, `/resume` | Reviewed |
| `microservices-architecture` | Engineering frontage | Direct project description station | `/projects/microservices-architecture`, `/resume` | Reviewed |
| `rentixe` | Engineering frontage | Direct project description station | `/projects/rentixe`, `/resume` | Reviewed |
| `team-game-project` | Engineering frontage | Direct project description station | `/projects/team-game-project`, `/resume` | Reviewed |
| `digital-health-fhir` | Engineering frontage | Direct project description station | `/projects/digital-health-fhir`, `/resume` | Reviewed |
| `snake` | `(20, 24)` | `BonusSnake` from `bonus.glb` | Work overlays | Reviewed |

Career descriptions now open at their corresponding buildings. The five projects sit together along the Engineering frontage. The former interactive exhibit models and experience tables are no longer part of the world interaction path.

## Campus and travel coverage

| Destination | Authored representation | Status |
|---|---|---|
| UQ Software Engineering | Great Court, Forgan Smith tower, gate, and continuous open cloisters | Reviewed and mounted |
| Duhig Tower | Authored library with recessed glazing and facade fins | Reviewed and mounted |
| UQ Lakes and amphitheatre | Authored banks, reeds, boardwalk, seating, and runtime water | Reviewed and mounted |
| Blog | River café and supported terrace | Reviewed and mounted |
| Contact | Screened writing pavilion | Reviewed and mounted |
| Skills | Four Skills Garden stations use the shared `CRYSTALS` layout contract and direct description panels | Reviewed |
| Buggy | Playable `Buggy`, three validated bays, and road-constrained physics | Reviewed and mounted |
| Ferry | Boardable passenger ferry, campus anchor `(-14, 40)` and lookout anchor `(-6, 84)` | Reviewed and mounted |
| Bridge and lookout | Raised cable-stayed pedestrian bridge and lookout connection | Reviewed and mounted |
| Fountain | Authored stone and bronze surround with runtime water | Reviewed and mounted |
| Student and NPCs | Shared skinned character with ten validated clips | Reviewed and mounted |

The map derives project and Skills Garden markers from the same layout data used by navigation and interactions.

## Intentional content placeholders

`profile.name`, GitHub, LinkedIn, and the existing Qualia content warnings remain intentional owner-supplied content placeholders. Validators report them without inventing personal details. They do not indicate missing 3D assets.

## Runtime asset contract

- Editable Blender sources and review renders live under `assets-source/`, outside the Next and OpenNext public asset roots.
- Raw author-validation GLBs and metadata live in `public/assets/game/`.
- Runtime loaders request matching `.glb.gz` files as `application/gzip` and decompress their file content before GLTF parsing. HTTP Content-Encoding is left to the host to avoid double encoding by Cloudflare Static Assets. Both hosts use revalidation because these filenames are not content-hashed.
- `npm run assets:build` rebuilds, precompresses, and validates every asset. `npm run validate:assets` rejects stale gzip files, external buffers, unsupported compression, missing roots, invalid bounds, and broken animation contracts.
