import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { AUTHORED_SOLIDS, EXHIBIT_PLACEMENTS, PROJECT_GALLERY } from "../src/game3d/authored-layout";
import { BUGGY_DIMENSIONS, BUGGY_EXIT_DISTANCE, SCOOTER_DIMENSIONS, SCOOTER_EXIT_DISTANCE } from "../src/game3d/travel-layout";
import { BUCKLER, QUALIA, isBlocked } from "../src/game3d/layout";

type BoxSolid = (typeof AUTHORED_SOLIDS)[number] & { half: number[] };

function boxSolid(prefix: string): BoxSolid {
  const match = AUTHORED_SOLIDS.find(solid => solid.id.startsWith(`${prefix}-`));
  assert.ok(match?.half, `missing authored ${prefix} box collider`);
  return match as BoxSolid;
}

async function main() {
  const loadAsset = async (name: string) => {
    const bytes = gunzipSync(readFileSync(`public/assets/game/${name}.glb.gz`));
    return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
    );
  };
  const [campus, vehicles] = await Promise.all([loadAsset("campus"), loadAsset("vehicles")]);
  campus.scene.updateMatrixWorld(true);
  const raycaster = new THREE.Raycaster();
  const facadeRay = (x: number, y: number, fromZ: number, facadeZ: number, label: string) => {
    raycaster.set(new THREE.Vector3(x, y, fromZ), new THREE.Vector3(0, 0, -1));
    raycaster.far = 10;
    const hit = raycaster.intersectObject(campus.scene, true)[0];
    assert.ok(hit, `${label} facade must exist in the shipped campus GLB`);
    assert.ok(Math.abs(hit.point.z - facadeZ) < .4, `${label} visible facade is not aligned with its authored position: ${hit.point.z}`);
  };
  facadeRay(16.6, 1.5, -18.5, -21.7, "Qualia glass");
  facadeRay(31, 1.5, -17, -19.1, "DSR door");
  facadeRay(25, 1.5, -32, -34.2, "Buckler door");
  facadeRay(-35, 1.5, 6, 3.9, "cafe glass");
  raycaster.set(new THREE.Vector3(30, 1.5, 2.2), new THREE.Vector3(1, 0, 0));
  raycaster.far = 5;
  const writingHit = raycaster.intersectObject(campus.scene, true)[0];
  assert.ok(writingHit && Math.abs(writingHit.point.x - 32.32) < .3, `writing pavilion side glass is not aligned in the shipped GLB: ${writingHit?.point.x}`);

  const buggy = vehicles.scene.getObjectByName("Buggy");
  assert.ok(buggy, "shipped vehicles GLB contains the golf cart");
  const buggyBounds = new THREE.Box3().setFromObject(buggy);
  const expectedBuggyBounds = { min: [-.972, .01, -1.345], max: [.972, 2.425, 1.355] };
  expectedBuggyBounds.min.forEach((value, axis) => assert.ok(Math.abs(buggyBounds.min.getComponent(axis) - value) < .002, `golf cart minimum axis ${axis} changed`));
  expectedBuggyBounds.max.forEach((value, axis) => assert.ok(Math.abs(buggyBounds.max.getComponent(axis) - value) < .002, `golf cart maximum axis ${axis} changed`));
  assert.ok(buggyBounds.max.y > 2.4, "actual cart bounds include its canopy");
  assert.ok(buggyBounds.min.x >= -BUGGY_DIMENSIONS.halfWidth && buggyBounds.max.x <= BUGGY_DIMENSIONS.halfWidth, "cart collider covers wheels across its width");
  assert.ok(buggyBounds.min.z >= -BUGGY_DIMENSIONS.halfLength && buggyBounds.max.z <= BUGGY_DIMENSIONS.halfLength, "cart collider covers front and rear bumpers");
  assert.ok(buggyBounds.min.y >= BUGGY_DIMENSIONS.bodyY-BUGGY_DIMENSIONS.halfHeight-.002 && buggyBounds.max.y <= BUGGY_DIMENSIONS.bodyY+BUGGY_DIMENSIONS.halfHeight+.002, "cart collider covers the floor and canopy with lean margin");

  const qualiaPlinth = boxSolid("StudioQualiaPlinth");
  const dsrPlinth = boxSolid("StudioDSRPlinth");
  assert.deepEqual(
    { center: qualiaPlinth.center, baseY: qualiaPlinth.baseY, height: qualiaPlinth.height, half: qualiaPlinth.half },
    { center: [18, -25], baseY: 0, height: .56, half: [5, 5] },
    "Qualia raised paving collider follows the visible slab",
  );
  assert.deepEqual(
    { center: dsrPlinth.center, baseY: dsrPlinth.baseY, height: dsrPlinth.height, half: dsrPlinth.half },
    { center: [31, -23], baseY: 0, height: .52, half: [4.5, 4.5] },
    "DSR raised paving collider follows the visible slab",
  );

  assert.equal(AUTHORED_SOLIDS.filter(solid => solid.id.startsWith("StudioQualiaFrontMullion-")).length, 4, "all Qualia front mullions are physical");
  assert.equal(AUTHORED_SOLIDS.filter(solid => solid.id.startsWith("StudioDSRDoorJamb-")).length, 2, "both DSR door jambs are physical");
  assert.equal(AUTHORED_SOLIDS.filter(solid => solid.id.startsWith("StudioBucklerGlass-")).length, 2, "both Buckler glass bays are physical");
  assert.equal(AUTHORED_SOLIDS.filter(solid => solid.id.startsWith("WritingSideGlass-")).length, 6, "all writing pavilion side panels are physical");
  const facades = [
    { solid: boxSolid("StudioQualiaGlass"), axis: "z" as const },
    { solid: boxSolid("StudioQualiaDoor"), axis: "z" as const },
    { solid: boxSolid("StudioDSRFrontGlass"), axis: "z" as const },
    { solid: boxSolid("StudioDSRDoor"), axis: "z" as const },
    { solid: boxSolid("StudioBucklerDoor"), axis: "z" as const },
    { solid: boxSolid("CafeGlass"), axis: "z" as const },
    { solid: boxSolid("WritingSideGlass"), axis: "x" as const },
  ];
  const runtimeUrl = pathToFileURL(resolve("node_modules/@react-three/rapier/node_modules/@dimforge/rapier3d-compat/rapier.mjs")).href;
  const RAPIER = (await import(runtimeUrl)).default;
  await RAPIER.init();
  const identity = { x: 0, y: 0, z: 0, w: 1 };
  const vehicleShapes = [
    { label: "player", shape: new RAPIER.Capsule(.54, .36), y: .95, halfWidth: .36, halfLength: .36 },
    { label: "scooter", shape: new RAPIER.Cuboid(SCOOTER_DIMENSIONS.halfWidth, SCOOTER_DIMENSIONS.halfHeight, SCOOTER_DIMENSIONS.halfLength), y: SCOOTER_DIMENSIONS.bodyY, halfWidth: SCOOTER_DIMENSIONS.halfWidth, halfLength: SCOOTER_DIMENSIONS.halfLength },
    { label: "golf cart", shape: new RAPIER.Cuboid(BUGGY_DIMENSIONS.halfWidth, BUGGY_DIMENSIONS.halfHeight, BUGGY_DIMENSIONS.halfLength), y: BUGGY_DIMENSIONS.bodyY, halfWidth: BUGGY_DIMENSIONS.halfWidth, halfLength: BUGGY_DIMENSIONS.halfLength },
  ];
  for (const { solid: facade, axis } of facades) {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    world.createCollider(RAPIER.ColliderDesc.cuboid(facade.half[0], facade.height / 2, facade.half[1])
      .setTranslation(facade.center[0], facade.baseY + facade.height / 2, facade.center[1]));
    world.step();
    for (const actor of vehicleShapes) {
      const origin = axis === "z"
        ? { x: facade.center[0], y: actor.y, z: facade.center[1] + facade.half[1] + actor.halfLength + 1 }
        : { x: facade.center[0] - facade.half[0] - actor.halfWidth - 1, y: actor.y, z: facade.center[1] };
      const incoming = axis === "z" ? { x: 0, y: 0, z: -2 } : { x: 2, y: 0, z: 0 };
      const hit = world.castShape(origin, identity, incoming, actor.shape, .025, 1, false);
      assert.ok(hit && hit.time_of_impact < 1, `${actor.label} sweep crosses ${facade.id}`);
      const contact = axis === "z"
        ? { ...origin, z: facade.center[1] + facade.half[1] + actor.halfLength - .01 }
        : { ...origin, x: facade.center[0] - facade.half[0] - actor.halfWidth + .01 };
      const away = axis === "z" ? { x: 0, y: 0, z: .3 } : { x: -.3, y: 0, z: 0 };
      const retreat = world.castShape(contact, identity, away, actor.shape, .025, 1, false);
      assert.ok(!retreat || retreat.time_of_impact > .9, `${actor.label} cannot retreat from ${facade.id}`);
    }
    world.free();
  }

  assert.equal(isBlocked(QUALIA.door.x, QUALIA.door.z), false, "Qualia interaction approach remains clear");
  assert.equal(isBlocked(BUCKLER.door.x, BUCKLER.door.z), false, "Buckler interaction approach remains clear");
  const aisle = { x: EXHIBIT_PLACEMENTS[2].x, z: EXHIBIT_PLACEMENTS[2].z - PROJECT_GALLERY.approachOffset };
  assert.equal(isBlocked(aisle.x, aisle.z), false, "project gallery public aisle remains open");
  const cloisterPiers = AUTHORED_SOLIDS.filter(solid => solid.id.startsWith("Cloister00Pier-"));
  assert.equal(cloisterPiers.length, 2, "first cloister opening retains its two supports");
  assert.equal(
    isBlocked((cloisterPiers[0].center[0] + cloisterPiers[1].center[0]) / 2, (cloisterPiers[0].center[1] + cloisterPiers[1].center[1]) / 2),
    false,
    "real cloister opening remains walkable",
  );
  const overhangWorld = new RAPIER.World({ x: 0, y: 0, z: 0 });
  overhangWorld.createCollider(RAPIER.ColliderDesc.cuboid(3, .1, .15).setTranslation(0, 2.35, 2));
  overhangWorld.step();
  const fullCart = new RAPIER.Cuboid(BUGGY_DIMENSIONS.halfWidth, BUGGY_DIMENSIONS.halfHeight, BUGGY_DIMENSIONS.halfLength);
  const roofHit = overhangWorld.castShape({ x: 0, y: BUGGY_DIMENSIONS.bodyY, z: 0 }, identity, { x: 0, y: 0, z: 1 }, fullCart, .025, 1, false);
  const oldLowerChassis = new RAPIER.Cuboid(.88, .58, 1.3);
  const missedRoof = overhangWorld.castShape({ x: 0, y: .65, z: 0 }, identity, { x: 0, y: 0, z: 1 }, oldLowerChassis, .025, 1, false);
  assert.ok(roofHit && roofHit.time_of_impact < 1, "full cart envelope stops before a low overhang reaches the canopy");
  assert.equal(missedRoof, null, "legacy lower-chassis shape demonstrates the former canopy clipping gap");
  overhangWorld.free();
  assert.ok(BUGGY_EXIT_DISTANCE > BUGGY_DIMENSIONS.halfWidth + .36, "golf cart exit clearance remains outside its wheel envelope");
  assert.ok(SCOOTER_EXIT_DISTANCE > SCOOTER_DIMENSIONS.halfWidth + .36 + .025, "scooter exit clearance remains outside its rider envelope");
  console.log(`✓ building collision: shipped GLB facades, ${facades.length} authored barriers, player/scooter/cart sweeps, contact retreat and real openings verified`);
}

void main();
