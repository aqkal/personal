import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SKID_CAPACITY, SkidTrailBuffer } from "../src/game3d/skid-trails";

const ink = [0.12, 0.18, 0.2] as const;

function stampSegment(buffer: SkidTrailBuffer, track: number, x: number, time: number, y = 0, z = 0) {
  buffer.stamp(track, x, y, z, 0.2, time, 1, ink);
}

// The first sample seeds a lane. Each following sample is far enough away to
// produce exactly one ribbon segment.
function seededBuffer(capacity = 8) {
  const buffer = new SkidTrailBuffer(capacity);
  stampSegment(buffer, 0, 0, 0);
  stampSegment(buffer, 0, 0.1, 0.1);
  return buffer;
}

// A full pool wraps in place and never grows.
const pool = new SkidTrailBuffer(3);
const arrays = [pool.positions, pool.born, pool.strengths, pool.colors, pool.uv];
stampSegment(pool, 0, 0, 0);
for (let i = 1; i <= 5; i++) stampSegment(pool, 0, i * 0.1, i * 0.1);
assert.equal(pool.count, 3, "skid pool count is capped at capacity");
assert.equal(pool.cursor, 2, "skid cursor wraps at capacity");
assert.equal(pool.version, 5, "every moving sample writes one segment");
assert.equal(pool.lastWrite, 0.5, "last write tracks the newest segment");
assert.deepEqual(arrays.map((array) => array.length), [54, 18, 18, 54, 36], "pool array lengths stay fixed");
assert.ok(arrays.every((array, index) => array === [pool.positions, pool.born, pool.strengths, pool.colors, pool.uv][index]), "pool arrays are reused");

// Tyre lanes retain separate contacts and do not bridge between tyres.
const lanes = new SkidTrailBuffer(8);
stampSegment(lanes, 0, 0, 0);
stampSegment(lanes, 1, 100, 0);
stampSegment(lanes, 0, 0.1, 0.1);
stampSegment(lanes, 1, 100.1, 0.1);
assert.equal(lanes.count, 2, "each moving tyre writes one independent segment");
assert.equal(lanes.contacts[0].x, 0.1, "left tyre contact advances independently");
assert.equal(lanes.contacts[1].x, 100.1, "right tyre contact advances independently");
assert.ok(Math.abs(lanes.positions[0]) < 1, "left ribbon starts at the left tyre");
assert.ok(Math.abs(lanes.positions[18] - 100) < 1, "right ribbon starts at the right tyre");

// Stationary contacts do not create marks, including tiny sub-threshold drift.
const stationary = new SkidTrailBuffer(4);
stampSegment(stationary, 0, 0, 0);
stampSegment(stationary, 0, 0, 0.1);
stampSegment(stationary, 0, 0.04, 0.2);
assert.equal(stationary.version, 0, "stationary tyre produces no marks");
assert.equal(stationary.count, 0, "stationary tyre leaves draw count empty");

function assertBreak(name: string, breakSample: (buffer: SkidTrailBuffer) => void) {
  const buffer = seededBuffer();
  const before = buffer.version;
  breakSample(buffer);
  assert.equal(buffer.version, before, `${name} does not bridge a broken contact`);
  const breakX = buffer.contacts[0].x;
  const breakTime = buffer.contacts[0].time, breakY = buffer.contacts[0].y, breakZ = buffer.contacts[0].z;
  // An inactive lane needs one sample to seed its new contact before the
  // following sample can create a segment.
  stampSegment(buffer, 0, breakX, breakTime, breakY, breakZ);
  stampSegment(buffer, 0, breakX + 0.1, breakTime + 0.1, breakY, breakZ);
  assert.equal(buffer.version, before + 1, `${name} resumes on the next continuous sample`);
  assert.ok(Math.abs(buffer.positions[before * 18] - breakX) < 1e-6, `${name} starts after the break point`);
}

assertBreak("teleport", (buffer) => stampSegment(buffer, 0, 10, 0.2));
assertBreak("invalid sample", (buffer) => buffer.stamp(0, Number.NaN, 0, 0, 0.2, 0.2, 1, ink));
assertBreak("end", (buffer) => buffer.end(0));
assertBreak("pause gap", (buffer) => stampSegment(buffer, 0, 0.2, 0.5));
assertBreak("vertical jump", (buffer) => stampSegment(buffer, 0, 0.2, 0.2, 0.4));

// Every physical ribbon slot has finite vertices and upward-facing triangles.
const winding = new SkidTrailBuffer(4);
stampSegment(winding, 0, 0, 0);
stampSegment(winding, 0, 0.4, 0.1, 0, 0.1);
stampSegment(winding, 0, 0.8, 0.2, 0, 0.2);
stampSegment(winding, 0, 1.2, 0.3, 0, 0.3);
stampSegment(winding, 0, 1.6, 0.4, 0, 0.4);
for (let i = 0; i < winding.positions.length; i++) assert.ok(Number.isFinite(winding.positions[i]), `vertex ${i} is finite`);
for (let segment = 0; segment < winding.capacity; segment++) {
  const base = segment * 18;
  for (const triangle of [[0, 1, 2], [3, 4, 5]]) {
    const a = triangle[0] * 3 + base, b = triangle[1] * 3 + base, c = triangle[2] * 3 + base;
    const ab = [winding.positions[b] - winding.positions[a], winding.positions[b + 1] - winding.positions[a + 1], winding.positions[b + 2] - winding.positions[a + 2]];
    const ac = [winding.positions[c] - winding.positions[a], winding.positions[c + 1] - winding.positions[a + 1], winding.positions[c + 2] - winding.positions[a + 2]];
    const normalY = ab[2] * ac[0] - ab[0] * ac[2];
    assert.ok(Number.isFinite(normalY) && normalY > 0, `segment ${segment} has upward ribbon winding`);
  }
}

// The renderer remains one bounded ShaderMaterial mesh, flagged out of the
// shadow pass and driven by mutable frame data rather than React state.
const renderer = readFileSync(new URL("../src/game3d/drift-marks.tsx", import.meta.url), "utf8");
assert.equal((renderer.match(/new THREE\.ShaderMaterial/g) ?? []).length, 1, "drift marks use one shader material");
assert.match(renderer, /userData=\{\{ noShadow: true \}\}/, "drift marks opt out of shadows");
assert.doesNotMatch(renderer, /lights:\s*true/, "drift shader remains unlit");
assert.doesNotMatch(renderer, /useState|useReducer|setState/, "drift marks do not use per-frame React state");
assert.match(renderer, /geometry\.setDrawRange\(0, tracks\.count \* 6\)/, "draw range follows the bounded pool");

console.log(`Verified skid trails: pool capacity ${pool.capacity}/${SKID_CAPACITY}, independent tyre lanes, stationary suppression, five continuity breaks, finite vertices, upward ribbon winding, and one unlit no-shadow draw.`);
