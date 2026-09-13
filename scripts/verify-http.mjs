import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cpSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { setTimeout as delay } from "node:timers/promises";

// Run after a production build. An optional URL checks an already running
// Next or Cloudflare preview; otherwise start and stop our own server.
const root = fileURLToPath(new URL("..", import.meta.url));
const cloudflare = process.argv.includes("--cloudflare");
const externalUrl = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const port = process.env.AUDIT_PORT || (cloudflare ? "3102" : "3101");
const baseUrl = externalUrl || `http://127.0.0.1:${port}`;
let server;
let serverOutput = "";

async function request(path, options = {}) {
  return fetch(new URL(path, baseUrl), {
    signal: AbortSignal.timeout(15_000),
    ...options,
  });
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]*)"`, "i"))?.[1];
}

async function main() {
  if (!externalUrl) {
    const output = resolve(root, process.env.OPEN_NEXT_BUILD_OUTPUT_PATH || ".", ".open-next");
    if (cloudflare) {
      // Match OpenNext's static-assets cache population. Its preview CLI reads
      // compiled config from root .open-next, so copy from the selected output
      // explicitly to also support isolated local builds.
      cpSync(resolve(output, "cache"), resolve(output, "assets/cdn-cgi/_next_cache"), { recursive: true });
    }
    const args = cloudflare ? [
      resolve(root, "node_modules/wrangler/bin/wrangler.js"),
      "dev", resolve(output, "worker.js"),
      "--config", resolve(root, "wrangler.jsonc"),
      "--assets", resolve(output, "assets"),
      "--local", "--ip", "127.0.0.1", "--port", port,
      "--show-interactive-dev-session=false",
    ] : [
      resolve(root, "node_modules/next/dist/bin/next"),
      "start", "--hostname", "127.0.0.1", "--port", port,
    ];
    server = spawn(process.execPath, args, {
      cwd: root,
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.on("error", (error) => { serverOutput += error.message; });
    for (const stream of [server.stdout, server.stderr]) {
      stream.on("data", (chunk) => { serverOutput = (serverOutput + chunk).slice(-8000); });
    }
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (server.exitCode !== null) throw new Error(serverOutput);
      try {
        await fetch(new URL("/robots.txt", baseUrl), { signal: AbortSignal.timeout(2000) });
        ready = true;
        break;
      } catch { await delay(250); }
    }
    assert.ok(ready, `Production server did not start: ${serverOutput}`);
  }

  const home = await request("/");
  assert.equal(home.status, 200);
  assert.equal(home.headers.get("x-content-type-options"), "nosniff");
  assert.equal(home.headers.get("x-frame-options"), "DENY");
  assert.match(home.headers.get("content-security-policy") || "", /frame-ancestors 'none'/);
  const homeHtml = await home.text();
  const documentHtml = homeHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  assert.match(documentHtml, /<main\b/, "homepage must have a server-rendered main landmark");
  assert.match(documentHtml, /<h1\b[^>]*>[^<]+<\/h1>/, "homepage identity must be in HTML before JavaScript");
  assert.match(documentHtml, /href="\/resume"/, "resume must remain accessible before hydration");
  assert.match(documentHtml, /href="\/blog"/, "blog must remain accessible before hydration");
  assert.match(documentHtml, /<noscript>/, "interactive views must offer a no-JavaScript fallback");

  const sitemap = await request("/sitemap.xml");
  assert.equal(sitemap.status, 200);
  const paths = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => new URL(match[1]).pathname);
  assert.ok(paths.length >= 4, "sitemap must list the main pages");
  assert.equal(paths.length, new Set(paths).size, "sitemap URLs must be unique");
  for (const path of paths) {
    const response = await request(path);
    assert.equal(response.status, 200, `${path} should render`);
    const html = await response.text();
    const canonical = [...html.matchAll(/<link\b[^>]*>/g)]
      .map((match) => match[0]).find((tag) => attribute(tag, "rel") === "canonical");
    assert.ok(canonical, `${path} needs a canonical URL`);
    assert.equal(new URL(attribute(canonical, "href")).pathname, path, `${path} canonical should refer to itself`);
  }

  for (const [path, hash] of [["/about", "#about"], ["/experience", "#experience"], ["/projects", "#projects"]]) {
    const response = await request(path, { redirect: "manual" });
    assert.ok([307, 308].includes(response.status), `${path} should redirect`);
    const destination = new URL(response.headers.get("location"), baseUrl);
    assert.equal(destination.searchParams.get("view"), "portfolio");
    assert.equal(destination.hash, hash);
  }

  const rss = await request("/rss.xml");
  assert.equal(rss.status, 200);
  assert.match(rss.headers.get("content-type") || "", /application\/rss\+xml/);
  assert.match(await rss.text(), /<rss version="2.0">/);
  assert.equal((await request("/robots.txt")).status, 200);
  assert.equal((await request("/audit-missing-page")).status, 404);
  assert.equal((await request("/api/contact")).status, 405);

  for (const name of ["campus", "shore-rails"]) {
    const asset = await request(`/assets/game/${name}.glb.gz`);
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get("content-type") || "", /application\/gzip/);
    const compressed = Buffer.from(await asset.arrayBuffer());
    assert.equal(gunzipSync(compressed).toString("ascii", 0, 4), "glTF", `${name} must decode as GLB after HTTP transport decoding`);
  }
  console.log(`✓ HTTP checks passed: ${paths.length} pages, server HTML, canonicals, redirects, headers, feeds, 404 and compressed campus/shoreline assets.`);
}

try {
  await main();
} catch (error) {
  console.error(error);
  if (serverOutput) console.error(serverOutput);
  process.exitCode = 1;
} finally {
  server?.kill();
}
