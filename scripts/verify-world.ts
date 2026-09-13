import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import * as THREE from "three";
import { campus } from "../content";
import { AUTHORED_SOLIDS, EXHIBIT_PLACEMENTS, GALLERY_EXHIBIT_SCALE, PROJECT_GALLERY } from "../src/game3d/authored-layout";
import { mergeSceneGeometry } from "../src/game3d/geometry";
import { SIGN_ATLAS, SIGN_FACE, WAYFINDING_SIGNS, signAtlasUV, signReadingPosition } from "../src/game3d/signage";
import { BRIDGE, BUCKLER, CAMPUS_LIBRARY, CAMPUS_STOPS, CAMPUS_WINGS, CRYSTALS, GREAT_COURT, INTERACTABLES, LOOKOUT, LOOKOUT_TOP, OFFICES, QUALIA, QUALIA_BOARD, WORLD_BOUNDS, WORLD_PATHS, bridgeDeckHeight, cameraBlocked, groundHeight, isBlocked, isInsideWorld, PLAYER_START } from "../src/game3d/layout";
import { clearSegment, DESTINATIONS, destinationId, findRoute } from "../src/game3d/navigation";
import { createCameraBoom, resolveCameraBoom } from "../src/game3d/camera-boom";
import { destinationBearing, unwrapBearing } from "../src/game/navigation-bearing";
import { createSnake, placeFood, steerSnake, stepSnake, type SnakeState } from "../src/game/snake-engine";

const started = performance.now();
const bearingOrigin = { x: 0, y: 0, z: 0 };
const nearAngle = (actual: number | null, expected: number, message: string) => {
  assert.notEqual(actual, null, message);
  assert.ok(Math.abs(Math.atan2(Math.sin(actual! - expected), Math.cos(actual! - expected))) < 1e-9, message);
};
for (const [x, z, angle] of [[0, -1, 0], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2], [0, 1, Math.PI]]) {
  nearAngle(destinationBearing(bearingOrigin, { x, y: 0, z }, 0, 0.62), angle, "Navigation arrow preserves screen-space cardinal directions");
}
nearAngle(destinationBearing(bearingOrigin, { x: -1, y: 0, z: 0 }, Math.PI / 2, 0.62), 0, "Rotating the camera east makes west the forward bearing");
nearAngle(destinationBearing(bearingOrigin, { x: 0, y: 0, z: -1 }, Math.PI / 2, 0.62), Math.PI / 2, "Rotated camera preserves left/right orientation");
assert.equal(destinationBearing(bearingOrigin, bearingOrigin, 2, 0.62), null, "An already reached position has no arbitrary bearing");
assert.ok(Math.abs(unwrapBearing(Math.PI - 0.05, -Math.PI + 0.05) - (Math.PI + 0.05)) < 1e-9, "Arrow rotation crosses the angle boundary without a full spin");
// Three's camera projection is an independent oracle for diagonal, elevated targets.
for (const yaw of [-1.2, 0, 1.6]) for (const pitch of [0.35, 0.8, 1.2]) {
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(Math.sin(yaw) * Math.cos(pitch) * 13, Math.sin(pitch) * 13, Math.cos(yaw) * Math.cos(pitch) * 13);
  camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  const target = new THREE.Vector3(2, 1.2, -3);
  const projected = target.clone().project(camera);
  nearAngle(destinationBearing(bearingOrigin, target, yaw, pitch), Math.atan2(projected.x, projected.y), "Navigation bearing agrees with the rendered camera projection");
}
for (const [i, sign] of WAYFINDING_SIGNS.entries()) {
  const bottom = signAtlasUV(i, 0, 0), top = signAtlasUV(i, 1, 1);
  const pixelWidth = (top.u - bottom.u) * SIGN_ATLAS.columns * SIGN_ATLAS.tileWidth;
  const pixelHeight = (top.v - bottom.v) * SIGN_ATLAS.rows * SIGN_ATLAS.tileHeight;
  assert.ok(Math.abs(pixelWidth / pixelHeight - SIGN_FACE.width / SIGN_FACE.height) < 0.0001, `${sign.title} keeps the texture's natural text proportions`);
  assert.ok(bottom.u >= 0 && bottom.v >= 0 && top.u <= 1 && top.v <= 1, "Sign UVs stay inside their atlas");
  const reading = signReadingPosition(sign);
  const hw = Math.abs(Math.cos(sign.ry)) * 2.25 + Math.abs(Math.sin(sign.ry)) * 0.275;
  const hd = Math.abs(Math.sin(sign.ry)) * 2.25 + Math.abs(Math.cos(sign.ry)) * 0.275;
  for (const path of WORLD_PATHS) {
    assert.ok(Math.abs(sign.x - path.x) >= hw + path.w / 2 || Math.abs(sign.z - path.z) >= hd + path.d / 2, `${sign.title} mounting pad stays outside the walking path`);
  }
  assert.ok(!isBlocked(reading.x, reading.z), `${sign.title} has a walkable reading position`);
  assert.ok(sign.ry === 0 || Math.abs(sign.ry) === Math.PI / 2, `${sign.title} aligns with a campus path`);
}
const archShape = new THREE.Shape();
archShape.moveTo(-1, 0); archShape.lineTo(-1, 2); archShape.absarc(0, 2, 1, Math.PI, 0, true); archShape.lineTo(1, 0); archShape.closePath();
const mixedParts = [
  new THREE.BoxGeometry(2, 1, 1),
  new THREE.ExtrudeGeometry(archShape, { depth: 0.4, bevelEnabled: false }),
  new THREE.IcosahedronGeometry(0.5, 0),
];
const expectedMixedPositions = mixedParts.reduce((total, part) => total + (part.index?.count ?? part.attributes.position.count), 0);
const mixedGeometry = mergeSceneGeometry(mixedParts);
mixedGeometry.computeBoundingBox();
assert.equal(mixedGeometry.index, null, "Mixed indexed and non-indexed scene parts normalize before merging");
assert.equal(mixedGeometry.attributes.position.count, expectedMixedPositions, "Geometry normalization preserves every source triangle");
assert.ok(mixedGeometry.boundingBox && [...mixedGeometry.boundingBox.min.toArray(), ...mixedGeometry.boundingBox.max.toArray()].every(Number.isFinite), "Merged scene geometry has finite bounds");
mixedGeometry.dispose();
const indexedGeometry = mergeSceneGeometry([new THREE.BoxGeometry(1, 1, 1), new THREE.BoxGeometry(1, 1, 1).translate(2, 0, 0)]);
assert.ok(indexedGeometry.index, "Homogeneous indexed scene parts retain their index buffer");
indexedGeometry.dispose();
assert.equal(new Set(DESTINATIONS.map(destinationId)).size, DESTINATIONS.length, "Every stop has a unique passport ID");
assert.ok(DESTINATIONS.length > 0, "The authored campus exposes navigable destinations");
assert.deepEqual(
  CAMPUS_STOPS.map((stop) => stop.id).sort(),
  campus.map((entry) => entry.id).sort(),
  "Every sourced campus landmark has exactly one placed map stop",
);
assert.equal(new Set(campus.map((entry) => entry.title)).size, campus.length, "Campus landmark titles are unique");
assert.equal(new Set(campus.map((entry) => entry.source)).size, 2, "Landmarks retain their two primary UQ sources");
for (const stop of CAMPUS_STOPS) {
  const destination = DESTINATIONS.find((item) => destinationId(item) === `landmark:${stop.id}`);
  assert.ok(destination, `Landmark ${stop.id} appears in map navigation`);
  assert.deepEqual({ x: destination.x, z: destination.z }, { x: stop.x, z: stop.z }, `Landmark ${stop.id} keeps its authored map position`);
}
assert.deepEqual(WORLD_BOUNDS, { minX: -72, maxX: 44, minZ: -78, maxZ: 92 }, "Navigation grid covers the expanded St Lucia precinct");
for (const from of [PLAYER_START, { x: 0, z: LOOKOUT.z }, GREAT_COURT.center]) {
  assert.equal(isBlocked(from.x, from.z), false, "Route origin must be walkable");
  for (const destination of DESTINATIONS) {
    const route = findRoute(from, destination);
    assert.ok(route.length > 0, `Unreachable from ${JSON.stringify(from)}: ${destinationId(destination)}`);
    const end = route.at(-1)!;
    assert.ok(Math.hypot(end.x - destination.x, end.z - destination.z) < destination.radius, "Route ends in interaction range");
    for (let i = 1; i < route.length; i++) assert.ok(clearSegment(route[i - 1], route[i]), "Route cannot cut through a wall or tree");
  }
}
assert.ok(INTERACTABLES.length >= DESTINATIONS.length, "Every navigable destination comes from an interactable");
for (const item of INTERACTABLES) {
  assert.equal(isBlocked(item.x, item.z), false, `Interaction anchor is blocked: ${item.hint}`);
}
assert.equal(isBlocked(QUALIA_BOARD.x, QUALIA_BOARD.z), true, "The Qualia information board blocks movement");
assert.equal(isBlocked(QUALIA.door.x, QUALIA.door.z), false, "The Qualia interaction ring keeps a clear approach beside the board");
const bucklerOffice = OFFICES.find((office) => office.x === BUCKLER.x && office.z === BUCKLER.z);
assert.ok(bucklerOffice, "BucklerX has a runtime office placement");
assert.deepEqual(bucklerOffice.door, BUCKLER.door, "BucklerX interaction uses the authored entrance");
assert.ok(BUCKLER.z < Math.min(QUALIA.z, ...OFFICES.filter((office) => office !== bucklerOffice).map((office) => office.z)), "BucklerX stays behind the south-facing Qualia and DSR buildings");
const bucklerSolids = AUTHORED_SOLIDS.filter((solid) => solid.id.startsWith("StudioBuckler"));
assert.ok(bucklerSolids.length > 0 && bucklerSolids.every((solid) => solid.center[1] < QUALIA.z), "BucklerX render colliders stay behind the front studio row");
assert.ok(WORLD_PATHS.some((path) => Math.abs(BUCKLER.door.x - path.x) <= path.w / 2 && Math.abs(BUCKLER.door.z - path.z) <= path.d / 2), "BucklerX entrance connects to a visible walking path");
const snakeDestination = DESTINATIONS.find((item) => item.payload?.kind === "snake")!;
assert.deepEqual({ x: snakeDestination.x, z: snakeDestination.z, yaw: snakeDestination.arrivalYaw }, { x: 19, z: 8.3, yaw: Math.PI }, "The north-facing Snake cabinet uses its clear front approach");
const projectDestinations = DESTINATIONS.filter((item) => item.payload?.kind === "project");
assert.equal(projectDestinations.length, EXHIBIT_PLACEMENTS.length, "Every gallery exhibit has one project destination");
for (const exhibit of EXHIBIT_PLACEMENTS) {
  const destination = projectDestinations.find((item) => item.payload?.id === exhibit.id)!;
  assert.equal(destination.x, exhibit.x, `${exhibit.id} approach stays centred on its bay`);
  assert.ok(Math.abs(destination.z - (exhibit.z - PROJECT_GALLERY.approachOffset)) < 1e-9, `${exhibit.id} approach stays in the public aisle`);
  assert.equal(groundHeight(exhibit.x, exhibit.z), PROJECT_GALLERY.floorY, `${exhibit.id} stands on the gallery floor`);
  assert.equal(groundHeight(destination.x, destination.z), PROJECT_GALLERY.floorY, `${exhibit.id} ring follows the gallery floor`);
}
const exhibitHalfWidth = 1.95 * GALLERY_EXHIBIT_SCALE;
const gallerySides = AUTHORED_SOLIDS.filter(solid => solid.id.startsWith("EngineeringGallerySide-")).sort((a, b) => a.center[0] - b.center[0]);
assert.equal(gallerySides.length, 2);
const galleryInnerMinX = gallerySides[0].center[0] + gallerySides[0].half![0];
const galleryInnerMaxX = gallerySides[1].center[0] - gallerySides[1].half![0];
assert.ok(gallerySides.every(side => side.baseY + side.height < 3.42 - 1.4 / 2), "End walls stay below the project titles for oblique views");
assert.ok(EXHIBIT_PLACEMENTS[0].x - 3.55 / 2 > galleryInnerMinX && EXHIBIT_PLACEMENTS.at(-1)!.x + 3.55 / 2 < galleryInnerMaxX, "Both end headings fit completely between the gallery walls");
assert.ok(EXHIBIT_PLACEMENTS[0].x - exhibitHalfWidth > galleryInnerMinX, "First exhibit clears the west end wall");
assert.ok(EXHIBIT_PLACEMENTS.at(-1)!.x + exhibitHalfWidth < galleryInnerMaxX, "Last exhibit clears the east end wall");
const galleryDividers = [20.7, 24.9, 29.1, 33.3];
for (const divider of galleryDividers) {
  assert.ok(EXHIBIT_PLACEMENTS.every((exhibit) => Math.abs(exhibit.x - divider) > exhibitHalfWidth + 0.065), `Exhibits clear gallery divider at x=${divider}`);
}
for (let i = 1; i < projectDestinations.length; i++) {
  const previous = projectDestinations[i - 1], current = projectDestinations[i];
  assert.ok(Math.hypot(current.x - previous.x, current.z - previous.z) >= current.radius + previous.radius, "Adjacent project interaction zones do not overlap");
}
for (const skill of CRYSTALS) {
  const destination = DESTINATIONS.find(item => item.payload?.kind === "skills" && item.payload.id === skill.payload.id)!;
  assert.equal(destination.z, skill.z, `${skill.label} interaction sits beside its pedestal`);
  assert.ok(Math.abs(destination.x - skill.x) > .56 + .76 && Math.abs(destination.x - skill.x) < 1.6, `${skill.label} ring is close without overlapping the pedestal`);
}
const gatePiers = AUTHORED_SOLIDS.filter((solid) => solid.id.startsWith("ForganGatePier-"));
assert.equal(gatePiers.length, 2, "The authored Great Court gate has two structural piers");
const gateOpening = { x: (gatePiers[0].center[0] + gatePiers[1].center[0]) / 2, z: (gatePiers[0].center[1] + gatePiers[1].center[1]) / 2 };
assert.equal(isBlocked(gateOpening.x, gateOpening.z), false, "The real Great Court gate opening stays walkable");
for (const pier of gatePiers) assert.equal(isBlocked(pier.center[0], pier.center[1]), true, `${pier.id} blocks movement`);
const cloisterPiers = new Map<number, typeof AUTHORED_SOLIDS>();
for (const solid of AUTHORED_SOLIDS) {
  const match = /^Cloister(\d+)Pier-/.exec(solid.id);
  if (match) cloisterPiers.set(Number(match[1]), [...(cloisterPiers.get(Number(match[1])) ?? []), solid]);
}
assert.ok(cloisterPiers.size >= 16, "The authored Great Court exports its full cloister arc");
for (const [segment, piers] of cloisterPiers) {
  assert.equal(piers.length, 2, `Cloister ${segment} has two arch supports`);
  const opening = { x: (piers[0].center[0] + piers[1].center[0]) / 2, z: (piers[0].center[1] + piers[1].center[1]) / 2 };
  assert.equal(isBlocked(opening.x, opening.z), false, `Cloister ${segment} real arch opening stays walkable`);
}
const rotatedWing = CAMPUS_WINGS.find((wing) => wing.ry)!;
const rotatedInside = {
  x: rotatedWing.x + Math.cos(rotatedWing.ry) * (rotatedWing.hw - 1),
  z: rotatedWing.z - Math.sin(rotatedWing.ry) * (rotatedWing.hw - 1),
};
assert.equal(isBlocked(rotatedInside.x, rotatedInside.z), true, "Rotated Great Court wings use oriented collision volumes");
assert.equal(isBlocked(CAMPUS_LIBRARY.x, CAMPUS_LIBRARY.z), true, "Duhig Tower blocks movement");
assert.equal(isBlocked(2, 57), true, "The player's shoulder cannot pass through bridge railings");
assert.equal(cameraBlocked(2.8, 8.2, 46), true, "The orbit camera cannot enter the bridge pylon");
assert.equal(cameraBlocked(0, 2, 52), false, "Ferries retain clear height beneath the raised bridge");
const towerSolid = AUTHORED_SOLIDS.find((solid) => solid.id.startsWith("ForganSmithTower-"))!;
assert.equal(cameraBlocked(towerSolid.center[0], towerSolid.baseY + towerSolid.height / 2, towerSolid.center[1]), true, "Camera cannot enter the authored Forgan Smith tower");
assert.equal(cameraBlocked(towerSolid.center[0], towerSolid.baseY + towerSolid.height + 1, towerSolid.center[1]), false, "Camera clears the authored tower above its roof");
assert.equal(bridgeDeckHeight(BRIDGE.from), BRIDGE.base, "Bridge ramp starts at its low approach");
assert.equal(bridgeDeckHeight(BRIDGE.riseEnd), BRIDGE.top, "Bridge ramp reaches full clearance smoothly");
assert.equal(bridgeDeckHeight(BRIDGE.fallStart), BRIDGE.top, "Bridge stays level across the ferry channel");
assert.equal(bridgeDeckHeight(BRIDGE.to), BRIDGE.base, "Bridge ramp returns to its low lookout approach");
assert.ok(Math.abs(bridgeDeckHeight(BRIDGE.riseEnd - 0.001) - bridgeDeckHeight(BRIDGE.riseEnd + 0.001)) < 0.00001, "Bridge rise joins the level deck continuously");
assert.ok(Math.abs(bridgeDeckHeight(BRIDGE.fallStart - 0.001) - bridgeDeckHeight(BRIDGE.fallStart + 0.001)) < 0.00001, "Bridge descent leaves the level deck continuously");
assert.ok(bridgeDeckHeight(52) - BRIDGE.base >= 4.5 && bridgeDeckHeight(57) - BRIDGE.base >= 4.5, "Raised span leaves ferry clearance through the channel");
assert.ok(isInsideWorld(0, BRIDGE.from - 0.01) && isInsideWorld(0, BRIDGE.from + 0.01), "Main field connects to the bridge approach");
assert.ok(isInsideWorld(0, BRIDGE.to - 0.01) && isInsideWorld(0, BRIDGE.to + 0.01), "Bridge approach overlaps the lookout walkable disc");
assert.equal(groundHeight(0, 52), BRIDGE.top, "Feet and route markers sit on the raised bridge deck");
assert.equal(groundHeight(4, LOOKOUT.z), LOOKOUT_TOP, "Lookout uses its own deck height");
assert.equal(groundHeight(0, 8), 0, "Campus stays at ground level");

const boomPivot = { x: 0, y: 1.5, z: 0 };
const boomDirection = { x: 0, y: 0, z: 1 };
const sightlineOnly = (_x: number, _y: number, z: number) => z > 5.2 && z < 5.8;
const clearBoom = createCameraBoom(10);
assert.equal(resolveCameraBoom(clearBoom, boomPivot, boomDirection, 10, 1 / 60, sightlineOnly), 10, "A sightline obstruction does not zoom a clear camera endpoint");

const transientBoom = createCameraBoom(10);
const endpointWall = (_x: number, _y: number, z: number) => z > 8.4;
const retracted = resolveCameraBoom(transientBoom, boomPivot, boomDirection, 10, 1 / 60, endpointWall);
assert.ok(retracted < 10, "A blocked camera endpoint retracts immediately");
for (let i = 0; i < 30; i++) resolveCameraBoom(transientBoom, boomPivot, boomDirection, 10, 1 / 60, () => false);
assert.equal(transientBoom.distance, retracted, "A cleared obstruction holds the shorter boom briefly");
for (let i = 0; i < 60; i++) resolveCameraBoom(transientBoom, boomPivot, boomDirection, 10, 1 / 60, () => false);
assert.ok(transientBoom.distance > retracted, "The camera eases outward after the obstruction hold");

const simulateBoom = (fps: number) => {
  const state = createCameraBoom(6);
  for (let i = 0; i < fps; i++) resolveCameraBoom(state, boomPivot, boomDirection, 12, 1 / fps, () => false);
  return state.distance;
};
assert.ok(Math.abs(simulateBoom(30) - simulateBoom(144)) < 0.00001, "Camera boom damping is independent of refresh rate");

const tail: SnakeState = { snake: [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 0, y: 2 }, { x: 0, y: 1 }], dir: { x: 0, y: -1 }, nextDir: { x: -1, y: 0 }, food: { x: 3, y: 3 }, score: 0 };
assert.equal(stepSnake(tail, 4), "playing", "Moving into the vacating tail is legal");
const growing: SnakeState = { snake: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }], dir: { x: 1, y: 0 }, nextDir: { x: 1, y: 0 }, food: { x: 1, y: 0 }, score: 0 };
assert.equal(stepSnake(growing, 2), "won", "Eating the last free cell wins instead of looping forever");
assert.equal(growing.score, 10);
assert.equal(placeFood(growing.snake, 2), null, "A full board has no food slot");
const turning = createSnake(18, { x: 0, y: -1 });
assert.deepEqual(turning.nextDir, { x: 0, y: -1 }, "The first key chooses the starting direction");
steerSnake(turning, { x: 0, y: 1 });
assert.deepEqual(turning.nextDir, { x: 0, y: -1 }, "Reversing into the neck is disallowed");
turning.snake[0] = { x: 9, y: 0 };
assert.equal(stepSnake(turning), "over", "Wall hits end the run");
const selfHit: SnakeState = { ...tail, snake: [{ x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 2, y: 1 }, { x: 2, y: 0 }], nextDir: { x: 1, y: 0 } };
assert.equal(stepSnake(selfHit, 4), "over", "Hitting the body still ends the run");
console.log(`Verified sign proportions and reading positions, mixed scene geometry, ${DESTINATIONS.length * 3} routes, ${CAMPUS_STOPS.length} sourced landmarks, authored arch openings, boundaries, bridge collision and clearance, stable camera behavior, surface heights, and Snake edge cases in ${Math.round(performance.now() - started)}ms.`);
