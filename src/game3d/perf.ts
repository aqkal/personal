/**
 * Frame instrumentation, shared between the in-canvas probe and the DOM
 * overlay. Dependency-free (same rule as `state.ts`) so the overlay never
 * pulls three.js into its chunk.
 */

export const perfStats = {
  fps: 0,
  frameMs: 0,
  drawMs: 0,
  cbMs: 0,
  outsideMs: 0,
  gpuMs: 0,
  shadowMs: 0,
  calls: 0,
  shadowCalls: 0,
  triangles: 0,
  programs: 0,
  textures: 0,
  geometries: 0,
  tier: 0,
  dpr: 0,
  shadowSize: 0,
  gpuTimer: false,
};

let enabled: boolean | null = null;

/** Explicitly opt in with `?perf`; ordinary visits skip instrumentation. */
export function perfEnabled(): boolean {
  if (enabled !== null) return enabled;
  if (typeof window === "undefined") return false;
  enabled = new URLSearchParams(window.location.search).has("perf");
  return enabled;
}

/** `?perf=light` keeps CPU/FPS readings without issuing GPU timer queries. */
export function gpuTimingEnabled(): boolean {
  return perfEnabled() && new URLSearchParams(window.location.search).get("perf") !== "light";
}

/** `?tier=N` pins the quality ladder, so A/B measurements compare like with like. */
export function pinnedTier(): number | null {
  if (typeof window === "undefined" || !perfEnabled()) return null;
  const v = new URLSearchParams(window.location.search).get("tier");
  if (v === null) return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

if (typeof window !== "undefined" && perfEnabled()) {
  (window as unknown as Record<string, unknown>).__perf = perfStats;
}
