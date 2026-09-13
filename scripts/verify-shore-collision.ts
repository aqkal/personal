import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { SOLIDS } from "../src/game3d/collision-manifest";
import { cameraBlocked, isBlocked } from "../src/game3d/layout";
import { SHORE_ACCESS_GAPS, SHORE_RAIL_PANELS } from "../src/game3d/shore-boundary";
import { isMainland, MAINLAND } from "../src/game3d/terrain";

async function main() {
  // Exercise the same Rapier runtime as the game, not Drei's older copy.
  const runtimeUrl = pathToFileURL(resolve("node_modules/@react-three/rapier/node_modules/@dimforge/rapier3d-compat/rapier.mjs")).href;
  const RAPIER = (await import(runtimeUrl)).default;
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const rails = SOLIDS.filter((solid) => solid.id.startsWith("shore-rail-"));
  assert.equal(rails.length, SHORE_RAIL_PANELS.length, "every visible panel has a physical barrier");
  assert.ok(rails.length > 100, "the border covers the mainland perimeter");

  for (const rail of rails) {
    world.createCollider(RAPIER.ColliderDesc.cuboid(rail.hw, rail.h / 2, rail.hd)
      .setTranslation(rail.x, rail.y + rail.h / 2, rail.z)
      .setRotation({ x: 0, y: Math.sin(rail.ry / 2), z: 0, w: Math.cos(rail.ry / 2) }));
    assert.equal(isBlocked(rail.x, rail.z), true, `${rail.id} blocks navigation`);
    assert.equal(cameraBlocked(rail.x, rail.y + 0.75, rail.z), true, `${rail.id} blocks the camera at railing height`);
  }
  world.step();

  const student = new RAPIER.Capsule(0.54, 0.36);
  const identity = { x: 0, y: 0, z: 0, w: 1 };
  for (const rail of rails) {
    let nx = Math.cos(rail.ry), nz = -Math.sin(rail.ry);
    if (!isMainland(rail.x + nx, rail.z + nz)) { nx = -nx; nz = -nz; }
    const hit = world.castShape(
      { x: rail.x + nx, y: rail.y + 0.9, z: rail.z + nz }, identity,
      { x: -nx * 2, y: 0, z: -nz * 2 }, student, 0.025, 1, false,
    );
    assert.ok(hit && hit.time_of_impact < 0.6, `${rail.id} stops a student approaching the water`);
  }

  for (const gap of SHORE_ACCESS_GAPS) {
    const x = (gap.from + gap.to) / 2;
    assert.equal(isBlocked(x, MAINLAND.maxZ - 0.6), false, `${gap.id} remains open for navigation`);
    const hit = world.castShape(
      { x, y: 0.9, z: MAINLAND.maxZ - 2 }, identity,
      { x: 0, y: 0, z: 3 }, student, 0.025, 1, false,
    );
    assert.equal(hit, null, `${gap.id} is not fenced across`);
  }
  world.free();
  console.log(`Verified ${rails.length} shoreline barriers against navigation, camera and Rapier movement, with both arrival gaps open.`);
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
