# Security

## Threat model, honestly

A personal portfolio with no accounts, no database, and one write endpoint (contact form). The realistic threats: contact form spam/abuse, header/content injection attempts, clickjacking, dependency compromise, and leaked secrets. Everything below maps to one of those.

## Security headers

Defined once in [next.config.ts](../next.config.ts), applied on every route on both hosts:

- **Content-Security-Policy** (production only; dev needs eval for HMR)
  - `default-src 'self'`: nothing loads from third parties by default
  - `script-src` allows only self, Turnstile (`challenges.cloudflare.com`), and the analytics beacon (`static.cloudflareinsights.com`). `'unsafe-inline'` is the one deliberate tradeoff: a fully static Next.js site has no per-request nonces; the alternative (dynamic rendering everywhere) costs more than it buys here.
  - `img-src 'self' data: blob:` and `worker-src 'self' blob:`: required by the three.js renderer for generated textures
  - `frame-ancestors 'none'` + `X-Frame-Options: DENY`: no clickjacking
  - `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`
- **Strict-Transport-Security**: 2 years, includeSubDomains, preload
- **X-Content-Type-Options**: nosniff
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Permissions-Policy**: camera, microphone, geolocation, payment all denied

Consequence of the CSP: the site can never fetch from a CDN at runtime. Fonts are self-hosted through `next/font`; 3D assets are procedural. Keep it that way.

## Contact form (`POST /api/contact`)

Layered defenses, in order:

1. **Size guard**: bodies over 32KB rejected before parsing.
2. **Zod validation**: strict types and length caps (name 100, email 200, message 5000).
3. **Honeypot**: a visually hidden `website` field. If filled, the API returns a fake success and discards the message, teaching bots nothing.
4. **Cloudflare Turnstile**: token verified server-side (`siteverify`) with the visitor IP. Fails closed when a secret is configured.
5. **Header injection**: impossible by construction. From/to/subject are fixed server values; user text is newline-stripped and only appears in the body and `reply_to` (validated as an email by Zod).
6. **Generic errors**: responses never reveal which layer rejected a submission or whether email delivery is configured.

There is no database; messages exist only in transit and in the destination inbox.

## Secrets

- Server-only: `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `CONTACT_TO_EMAIL`. Never prefixed with `NEXT_PUBLIC_`, never imported into client components.
- `.env*` is gitignored; `.env.example` carries no real values.
- On Cloudflare use `wrangler secret put`; on Vercel mark them Sensitive.

## Supply chain

- `package-lock.json` is committed; CI installs with `npm ci`.
- Dependabot (`.github/dependabot.yml`) opens weekly update PRs.
- `npm audit` runs in CI (non-blocking report; act on high/critical).
- No postinstall-heavy or unmaintained packages; dependency count is kept deliberately small.

## Privacy

- Cloudflare Web Analytics is cookieless and anonymous: no consent banner required.
- No tracking pixels, no fingerprinting, no third-party embeds.
- The game stores exactly two localStorage keys: `interface` (chosen mode) and `snake-best` (high score). Both are cosmetic and never leave the browser.
