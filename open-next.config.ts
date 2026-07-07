import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default config: fully static site + one API route, no incremental cache
// needed (no ISR anywhere; see docs/ARCHITECTURE.md dual-host constraints).
export default defineCloudflareConfig({});
