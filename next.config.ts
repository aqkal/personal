import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy notes (see docs/SECURITY.md):
 * - 'unsafe-inline' script is the pragmatic tradeoff for a fully static Next.js
 *   site without per-request nonces. Everything else is locked down.
 * - challenges.cloudflare.com: Cloudflare Turnstile (contact form captcha).
 * - static.cloudflareinsights.com / cloudflareinsights.com: privacy-friendly,
 *   cookieless Cloudflare Web Analytics beacon.
 * - data:/blob: img + worker sources are required by the Phaser game engine
 *   for runtime-generated textures.
 * - CSP is production-only: dev needs 'unsafe-eval' for HMR/react-refresh.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
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
  // Pixel art must never be resampled, and skipping the optimizer keeps
  // Vercel/Cloudflare behavior identical (see docs/ARCHITECTURE.md).
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
