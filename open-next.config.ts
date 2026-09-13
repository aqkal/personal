import { defineCloudflareConfig, type OpenNextConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Serve build-time pages from the existing asset binding. Static dynamic routes
// with dynamicParams=false need their prerendered entries even without ISR.
// This read-only cache needs no R2, KV, database or revalidation queue.
export default {
  ...defineCloudflareConfig({
    incrementalCache: staticAssetsIncrementalCache,
    enableCacheInterception: true,
  }),
  // Keep verification output away from a running dev server when explicitly set.
  buildOutputPath: process.env.OPEN_NEXT_BUILD_OUTPUT_PATH || undefined,
} satisfies OpenNextConfig;
