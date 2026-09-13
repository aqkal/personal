# Deployment

One codebase, two supported hosts. Use either or both (e.g. Vercel as primary, Cloudflare as mirror, or the reverse).

## Environment variables (both hosts)

| Variable | Side | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | build | Canonical URL for SEO, sitemap, RSS (e.g. `https://yourdomain.com`) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | build | Turnstile widget site key (public) |
| `TURNSTILE_SECRET_KEY` | server secret | Turnstile server verification |
| `RESEND_API_KEY` | server secret | Resend email API key |
| `CONTACT_TO_EMAIL` | server secret | Where contact messages are delivered |
| `NEXT_PUBLIC_CF_BEACON_TOKEN` | build | Cloudflare Web Analytics token (optional; analytics off if empty) |

Local dev: copy `.env.example` to `.env.local`. The Turnstile test keys in the example always pass. Without `RESEND_API_KEY`, dev submissions log to the console and report success.

## Prerequisites (one-time accounts)

1. Push this repo to GitHub.
2. [Resend](https://resend.com): create an API key. The default `onboarding@resend.dev` sender works without a domain; add your own domain later and update `from:` in `src/app/api/contact/route.ts`.
3. [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile): create a widget for your domain, grab the site key + secret key.

## Deploy to Vercel

1. vercel.com -> Add New Project -> import the GitHub repo. Framework auto-detects as Next.js. No config changes needed.
2. Add the environment variables above (secrets as Sensitive).
3. Deploy. Every push to `main` deploys production; PRs get preview URLs.
4. Custom domain: Project -> Settings -> Domains.

## Deploy to Cloudflare Workers

Uses the official [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) adapter (Workers, not the deprecated next-on-pages). Config lives in `wrangler.jsonc` and `open-next.config.ts`.

The adapter is at least 1.20.6 to support the patched Next.js 16.3 release and
Windows Turbopack paths. Prerendered pages use the
[read-only static-assets cache](https://opennext.js.org/cloudflare/caching#ssg-site)
on the existing `ASSETS` binding. The normal preview/deploy commands populate
it automatically. No additional Cloudflare storage service is required.

```bash
npx wrangler login          # one-time
npm run preview:cf          # build + run the Workers build locally
npm run deploy:cf           # build + deploy
```

To verify the adapter beside a running Next development server, keep both the
Next and OpenNext outputs in one isolated directory. OpenNext's
`buildOutputPath` expects to find a `.next` directory beneath it, so the two
variables must be set together:

```powershell
$env:OPEN_NEXT_BUILD_OUTPUT_PATH='.cf-build'
$env:NEXT_DIST_DIR='.cf-build/.next'
$env:NEXT_PUBLIC_SITE_URL='https://example.com'
npm run build:cf
```

This writes `.cf-build/.next` and `.cf-build/.open-next` without touching the
development server's `.next`. With neither variable set, normal CI and deploy
commands retain the default root `.next` and `.open-next` paths used by
`wrangler.jsonc`.

With the same output variables set, `npm run test:http -- --cloudflare`
populates that output's static cache and checks a local Worker. This also
handles isolated outputs, which the adapter's preview CLI does not select
automatically from `wrangler.jsonc`.

On Windows, `npm run build:cf` loads the repository's scoped compatibility
helper. It retries only denied package-directory links inside the selected
OpenNext output as directory junctions, then normalizes the generated handler
for an isolated `NEXT_DIST_DIR`. No Developer Mode or WSL setup is required.
Linux runs the adapter normally without this helper. `preview:cf` and
`deploy:cf` both use the same build wrapper before starting Wrangler.

Set secrets once:

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put CONTACT_TO_EMAIL
```

`NEXT_PUBLIC_*` values are baked in at build time: set them in your shell (or CI env) before `npm run deploy:cf`.

Custom domain: Workers & Pages -> your worker -> Settings -> Domains & Routes.

### Continuous deploys to Cloudflare

`.github/workflows/ci.yml` builds the Workers target on every push to prove compatibility. To auto-deploy, add repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` and uncomment the deploy step at the bottom of the workflow.

## Analytics

[Cloudflare Web Analytics](https://dash.cloudflare.com/?to=/:account/web-analytics) is free, cookieless (no consent banner needed), and works on any host including Vercel. Create a site there, copy the beacon token into `NEXT_PUBLIC_CF_BEACON_TOKEN`, redeploy.

## Staying dual-host compatible

Before adding any new capability, check the constraint list in [ARCHITECTURE.md](ARCHITECTURE.md#dual-host-constraint-set). CI enforces it mechanically by building both targets on every push.
