import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy notes (see docs/SECURITY.md):
 * - 'unsafe-inline' script is the pragmatic tradeoff for a fully static Next.js
 *   site without per-request nonces. Everything else is locked down.
 * - challenges.cloudflare.com: Cloudflare Turnstile (contact form captcha).
 * - static.cloudflareinsights.com / cloudflareinsights.com: privacy-friendly,
 *   cookieless Cloudflare Web Analytics beacon.
 * - data:/blob: img sources are required by the three.js world, which builds
 *   every texture at runtime on a canvas rather than fetching image files.
 *   (This said "Phaser" until the engine changed underneath it.)
 * - CSP is production-only: dev needs 'unsafe-eval' for HMR/react-refresh.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://cloudflareinsights.com https://challenges.cloudflare.com",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  ...(isProd ? [{ key: "Content-Security-Policy", value: csp }] : []),
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  // Unset everywhere except local profiling, where it lets a production build
  // run beside a live dev server instead of fighting it for `.next`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Pixel art must never be resampled, and skipping the optimizer keeps
  // Vercel/Cloudflare behavior identical (see docs/ARCHITECTURE.md).
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/assets/game/:asset*.glb.gz",
        headers: [
          { key: "Content-Type", value: "application/gzip" },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
