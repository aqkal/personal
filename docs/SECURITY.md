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

1. **Size guard**: bodies over 32,000 bytes rejected before parsing, including chunked requests without a trustworthy Content-Length. Reading stops at the limit.
2. **Zod validation**: strict types and length caps (name 100, email 200, message 5000).
3. **Honeypot**: a visually hidden `website` field. If filled, the API returns a fake success and discards the message, teaching bots nothing.
4. **Cloudflare Turnstile**: token verified server-side (`siteverify`) with the visitor IP. Fails closed in production whether or not a secret is configured: a missing `TURNSTILE_SECRET_KEY` used to skip verification entirely, so a deploy that lost the variable silently dropped the captcha while still sending real mail. Only local development treats the captcha as optional.
5. **Header injection**: sender and recipient are server-controlled; the recipient and reply-to address are validated as emails. The name included in the subject is newline-stripped and length-limited.
6. **Controlled errors**: responses explain validation, captcha, or delivery failure without revealing secrets, stack traces, or upstream provider responses.

Upstream verification and delivery each have a 10-second deadline. Verification
includes consuming the response JSON, and rejects non-success HTTP statuses.
The browser allows 30 seconds for the two sequential calls and keeps the
visitor's message on failure. Production builds without a public captcha key
offer a direct email link instead of a form that cannot submit successfully.

There is no database; messages exist only in transit and in the destination inbox.

## Links in content

Every URL in `content/*.ts` is rendered straight into an `href`. Zod's `z.url()`
accepts anything the URL constructor parses, which includes `javascript:`,
`data:` and `vbscript:`, so the schemas use an `httpUrl` type that additionally
requires an http(s) scheme. Content is repo-authored, so this is defense in
depth rather than a live hole, but the schema is the cheapest place to keep the
guarantee. Outbound `target="_blank"` links all carry `rel="noreferrer
noopener"`.

## Secrets

- Server-only: `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `CONTACT_TO_EMAIL`. Never prefixed with `NEXT_PUBLIC_`, never imported into client components.
- `.env*` is gitignored; `.env.example` carries no real values.
- On Cloudflare use `wrangler secret put`; on Vercel mark them Sensitive.

## Supply chain

- `package-lock.json` is committed; CI installs with `npm ci`.
- Dependabot (`.github/dependabot.yml`) opens weekly update PRs.
- `npm audit --audit-level=high` runs in CI and blocks high/critical findings.
- No postinstall-heavy or unmaintained packages; dependency count is kept deliberately small.

## Privacy

- Cloudflare Web Analytics is cookieless and anonymous: no consent banner required.
- No tracking pixels, no fingerprinting, no third-party embeds.
- The site stores five localStorage keys: `interface` (chosen mode), `theme`, `snake-best` (high score), `campus-passport-v1` (visited map stops), and `campus-audio-mix-v1` (audio levels). They are local preferences and progress only, and never leave the browser.
