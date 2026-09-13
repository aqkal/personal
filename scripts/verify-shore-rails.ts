import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { isMainland, MAINLAND } from "../src/game3d/terrain";
import {
  SHORE_ACCESS_GAPS,
  SHORE_RAIL_PANELS,
  SHORE_RAIL_POSTS,
  SHORE_RAIL_SEGMENTS,
  SHORE_RAIL_STYLE,
} from "../src/game3d/shore-boundary";

const EPSILON = 0.0001;
const authored = JSON.parse(readFileSync("assets-source/shore-rails-layout.json", "utf8"));
assert.deepEqual(authored.segments, SHORE_RAIL_SEGMENTS, "Blender layout must be regenerated when the shoreline changes");
assert.deepEqual(authored.posts, SHORE_RAIL_POSTS);
assert.deepEqual(authored.gaps, SHORE_ACCESS_GAPS);
assert.deepEqual(authored.style, SHORE_RAIL_STYLE);
const metadata = JSON.parse(readFileSync("public/assets/game/shore-rails.metadata.json", "utf8"));
const asset = readFileSync("public/assets/game/shore-rails.glb");
assert.equal(metadata.revision, createHash("sha256").update(asset).digest("hex").slice(0, 12), "runtime revision matches the Blender export");
assert.equal(metadata.segments, SHORE_RAIL_SEGMENTS.length);
assert.equal(metadata.posts, SHORE_RAIL_POSTS.length);
assert.equal(metadata.assetBytes, asset.length);
assert.equal(metadata.gzipBytes, readFileSync("public/assets/game/shore-rails.glb.gz").length);
const top = MAINLAND.maxZ - SHORE_RAIL_STYLE.inset;
const byRun = new Map<string, typeof SHORE_RAIL_SEGMENTS>();

assert.equal(SHORE_RAIL_PANELS.length, SHORE_RAIL_SEGMENTS.length);
for (const segment of SHORE_RAIL_SEGMENTS) {
  const run = byRun.get(segment.runId) ?? [];
  byRun.set(segment.runId, [...run, segment]);
  assert.ok(segment.length <= SHORE_RAIL_STYLE.targetPanelLength + EPSILON);
  assert.ok(segment.length > 2.5, `${segment.id} is an accidental short panel`);
  assert.ok(isMainland(
    segment.centre.x,
    segment.centre.z,
    SHORE_RAIL_STYLE.inset - SHORE_RAIL_STYLE.curbWidth / 2 - EPSILON,
  ), `${segment.id} curb leaves the mainland`);
}

for (const segments of byRun.values()) {
  for (let index = 1; index < segments.length; index += 1) {
    assert.ok(Math.hypot(
      segments[index].start.x - segments[index - 1].end.x,
      segments[index].start.z - segments[index - 1].end.z,
    ) < EPSILON, `${segments[index].runId} is discontinuous`);
  }
}

for (const post of SHORE_RAIL_POSTS) {
  assert.ok(isMainland(post.x, post.z, SHORE_RAIL_STYLE.inset - EPSILON), `${post.id} leaves the mainland`);
}

for (const gap of SHORE_ACCESS_GAPS) {
  const crossing = SHORE_RAIL_SEGMENTS.find((segment) => {
    if (Math.abs(segment.start.z - top) > EPSILON || Math.abs(segment.end.z - top) > EPSILON) return false;
    const low = Math.min(segment.start.x, segment.end.x);
    const high = Math.max(segment.start.x, segment.end.x);
    return low < gap.to - EPSILON && high > gap.from + EPSILON;
  });
  assert.equal(crossing, undefined, `${gap.id} is blocked by a rail panel`);
  for (const x of [gap.from, gap.to]) {
    assert.ok(SHORE_RAIL_POSTS.some((post) =>
      post.endpoint && Math.abs(post.x - x) < EPSILON && Math.abs(post.z - top) < EPSILON,
    ), `${gap.id} lacks a deliberate end post at ${x}`);
  }
}

for (let index = 0; index < SHORE_RAIL_PANELS.length; index += 1) {
  const panel = SHORE_RAIL_PANELS[index];
  const segment = SHORE_RAIL_SEGMENTS[index];
  assert.equal(panel.id, `shore-rail-${segment.id}`);
  assert.ok(Math.abs(panel.hd * 2 - segment.length) < EPSILON);
  assert.ok(panel.hw >= SHORE_RAIL_STYLE.curbWidth / 2);
}

console.log(`shore rails: ${SHORE_RAIL_SEGMENTS.length} panels, ${SHORE_RAIL_POSTS.length} posts, ${SHORE_ACCESS_GAPS.length} open arrivals`);
