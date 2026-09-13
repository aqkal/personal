# Pixel Portfolio

A personal portfolio that is also a place: an explorable, stylized 3D scene of a sunny Brisbane university campus. Visitors choose an interface on landing (the 3D game world or a spotlight one-page portfolio), or skip straight to a classic HTML site with project case studies that search engines and busy recruiters see.

## Quickstart

```bash
npm install
cp .env.example .env.local   # optional: contact form + analytics keys
npm run dev                  # http://localhost:3000
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build (Vercel target) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run validate:content` | Zod-validates every content file |
| `npm run validate:assets` | Validate exported game GLB structure, bounds, controls, and budgets |
| `npm run test:contact` | Mocked contact validation, captcha, size-limit and email-provider checks |
| `npm run test:scooter-render` | Verify tyre visibility and recovery from invalid animation samples |
| `npm run test:startup` | Verify startup and world reload preserve the shell session |
| `npm run test:frame-cpu` | Check collision/transport equivalence and idle route work |
| `npm run test:drift` | Verify finite drift momentum, collision safety and partial trail uploads |
| `npm run test:buildings` | Check authored facade barriers and player/vehicle clearance |
| `npm run test:shore` | Verify Blender shoreline layout, barriers and bridge/ferry access |
| `npm run test:http` | Start the production build locally and verify pages, redirects, headers, feeds and compressed assets |
| `npm run assets:build` | Rebuild all Blender game assets sequentially, then validate them |
| `npm run assets:compress` | Regenerate deterministic `.glb.gz` runtime assets from raw GLBs |
| `npm run preview:cf` | Build + run the Cloudflare Workers build locally |
| `npm run deploy:cf` | Build + deploy to Cloudflare Workers |

## Make it yours

Everything personal lives in [content/profile.ts](content/profile.ts) (name, tagline, socials). Resume data lives in the other `content/*.ts` files. See [docs/ADDING_CONTENT.md](docs/ADDING_CONTENT.md) for copy-paste recipes; adding an experience entry automatically adds its building to the 3D world.

## Documentation

- [docs/CONTEXT.md](docs/CONTEXT.md): what this project is and why
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): system design, data flow, performance budget
- [docs/ADDING_CONTENT.md](docs/ADDING_CONTENT.md): add experience, projects, skills, blog posts
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): deploy to Vercel and/or Cloudflare
- [docs/SECURITY.md](docs/SECURITY.md): headers, contact form protections, secrets
- [assets-source/README.md](assets-source/README.md): editable Blender sources, exports, and review workflow
- [docs/ASSET_COVERAGE.md](docs/ASSET_COVERAGE.md): content-to-world coverage and accepted asset status
- [docs/GAME_ASSET_REVIEW.md](docs/GAME_ASSET_REVIEW.md): reviewed models, contracts, and transfer sizes

Editable `.blend` files and review renders stay under `assets-source/`; they are outside the Next and Cloudflare public asset output. Raw validation GLBs and their precompressed runtime counterparts live under `public/assets/game/`.

Run `npm run build` before `npm run test:http`. To check an existing local
preview, pass its URL: `npm run test:http -- http://localhost:3010`.
The HTTP check sends no contact messages and stops the server it starts.
After `npm run build:cf`, run `npm run test:http -- --cloudflare` to run the
same checks against a local Worker. CI verifies both runtimes.

## Stack

Next.js 16 · TypeScript · Tailwind CSS v4 · Three.js via React Three Fiber · Zod · MDX · deployed to Vercel and Cloudflare Workers from one codebase.
