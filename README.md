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

## Stack

Next.js 16 · TypeScript · Tailwind CSS v4 · Three.js via React Three Fiber · Zod · MDX · deployed to Vercel and Cloudflare Workers from one codebase.
