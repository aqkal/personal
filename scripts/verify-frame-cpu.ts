import assert from "node:assert/strict";
import { COLLIDERS, WORLD_BOUNDS, isBlocked, isInsideWorld, type Collider } from "../src/game3d/layout";
import { createPointCollisionQuery } from "../src/game3d/point-collision";
import { createCameraBoom, resolveCameraBoom } from "../src/game3d/camera-boom";

// Preserve the former full scan as the independent broad-phase oracle.
function fullScan(x: number, z: number, colliders: readonly Collider[] = COLLIDERS) {
  for (const c of colliders) {
    if ("r" in c) {
      if ((c.x - x) ** 2 + (c.z - z) ** 2 < (c.r + .45) ** 2) return true;
    } else if ("rx" in c) {
      if (((x - c.x) / (c.rx + .45)) ** 2 + ((z - c.z) / (c.rz + .45)) ** 2 < 1) return true;
    } else {
      const dx = x - c.x, dz = z - c.z;
      const cos = Math.cos(c.ry ?? 0), sin = Math.sin(c.ry ?? 0);
      if (Math.abs(dx * cos - dz * sin) < c.hw + .45 && Math.abs(dx * sin + dz * cos) < c.hd + .45) return true;
    }
  }
  return false;
}

let comparisons = 0;
for (let x = WORLD_BOUNDS.minX - 1; x <= WORLD_BOUNDS.maxX + 1; x += .25) {
  for (let z = WORLD_BOUNDS.minZ - 1; z <= WORLD_BOUNDS.maxZ + 1; z += .25) {
    assert.equal(isBlocked(x, z), !isInsideWorld(x, z) || fullScan(x, z), `Campus collision at ${x}, ${z}`);
    comparisons++;
  }
}

// Test individual surfaces so another nearby collider cannot mask a missed edge.
for (const collider of COLLIDERS) {
  const query = createPointCollisionQuery([collider], .45);
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 32) {
    for (const offset of [-1e-7, 0, 1e-7]) {
      let dx: number, dz: number;
      if ("r" in collider) {
        dx = (collider.r + .45 + offset) * Math.cos(angle);
        dz = (collider.r + .45 + offset) * Math.sin(angle);
      } else if ("rx" in collider) {
        dx = (collider.rx + .45 + offset) * Math.cos(angle);
        dz = (collider.rz + .45 + offset) * Math.sin(angle);
      } else {
        const localX = (collider.hw + .45 + offset) * Math.cos(angle) / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
        const localZ = (collider.hd + .45 + offset) * Math.sin(angle) / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
        const cos = Math.cos(collider.ry ?? 0), sin = Math.sin(collider.ry ?? 0);
        dx = localX * cos + localZ * sin;
        dz = -localX * sin + localZ * cos;
      }
      const x = collider.x + dx, z = collider.z + dz;
      assert.equal(query(x, z), fullScan(x, z, [collider]), `Collider boundary at ${x}, ${z}`);
      comparisons++;
    }
  }
}

const pivot = { x: 0, y: 1.35, z: 8 }, direction = { x: 0, y: .6, z: .8 };
const boom = createCameraBoom(13);
let cameraQueries = 0;
for (let frame = 0; frame < 600; frame++) {
  assert.equal(resolveCameraBoom(boom, pivot, direction, 13, 1 / 60, () => { cameraQueries++; return false; }), 13);
}
assert.equal(cameraQueries, 600, "Steady clear camera needs exactly one occupancy query per frame");
const scanned: number[] = [];
resolveCameraBoom(createCameraBoom(10), { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, 10, 1 / 60,
  (_x, _y, z) => { scanned.push(z); return z > 8.4; });
assert.deepEqual(scanned.slice(0, 2), [10, 9.75], "Retraction starts after the already occupied endpoint");

const points = Array.from({ length: 6000 }, (_, i) => ({ x: -22 + i % 46, z: -38 + Math.floor(i / 46) % 64 }));
const legacy = (x: number, z: number) => !isInsideWorld(x, z) || fullScan(x, z);
function measure(query: typeof isBlocked) {
  const start = performance.now();
  let hits = 0;
  for (let pass = 0; pass < 10; pass++) for (const p of points) hits += Number(query(p.x, p.z));
  return { milliseconds: performance.now() - start, hits };
}
measure(legacy); measure(isBlocked);
const before = measure(legacy), after = measure(isBlocked);
assert.equal(after.hits, before.hits, "The benchmark compares identical collision results");
console.log(`Verified ${comparisons} full-scan collision comparisons and 600 unchanged camera frames. ${COLLIDERS.length} static colliders: 60,000 point queries ${before.milliseconds.toFixed(1)} ms full scan, ${after.milliseconds.toFixed(1)} ms indexed. Camera occupancy calls: 1,200 to ${cameraQueries}.`);
