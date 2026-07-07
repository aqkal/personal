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

```bash
npx wrangler login          # one-time
npm run preview:cf          # build + run the Workers build locally
npm run deploy:cf           # build + deploy
```

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
