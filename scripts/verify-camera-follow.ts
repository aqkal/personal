import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import * as THREE from "three";
import { followMovingTarget } from "../src/game3d/camera-follow";

const started = performance.now();
const WIDTH = 1920, HEIGHT = 1080;
const SPEED = 14;
const patterns = {
  uneven: [.007, .027, .011, .019, .009, .031, .014, .018],
  hitches: [.008, .016, .011, .025, .014, .017, .080, .012],
};
const camera = new THREE.PerspectiveCamera(50, WIDTH / HEIGHT, .1, 400);
const boom = new THREE.Vector3(0, Math.sin(.68), Math.cos(.68)).multiplyScalar(13);
const seat = new THREE.Vector3(-.36, .4, -.22);

function screen(point: THREE.Vector3, focus: THREE.Vector3) {
  camera.position.copy(focus).add(boom);
  camera.lookAt(focus);
  camera.updateMatrixWorld(true);
  const projected = point.clone().project(camera);
  return new THREE.Vector2((projected.x + 1) * WIDTH / 2, (1 - projected.y) * HEIGHT / 2);
}

// Retain the former chase as a negative control. A regression test must fail
// for the observed behavior, not merely establish that new values are finite.
function legacyChase(follow: THREE.Vector3, target: THREE.Vector3, dt: number) {
  follow.lerp(target, 1 - Math.exp(-13 * Math.min(dt, .05)));
}

const results: Array<{ pattern: string; turning: boolean; maximumErrorPx: number; legacyVariationPx: number }> = [];
for (const [pattern, deltas] of Object.entries(patterns)) {
  for (const turning of [false, true]) {
    const target = new THREE.Vector3(0, 1.15, 0);
    const previous = target.clone(), follow = target.clone(), oldFollow = target.clone();
    const error = new THREE.Vector2(), minimum = new THREE.Vector2(Infinity, Infinity), maximum = new THREE.Vector2(-Infinity, -Infinity);
    let elapsed = 0, maximumErrorPx = 0;
    for (let frame = 0; frame < 1600; frame++) {
      const rawDt = deltas[frame % deltas.length];
      elapsed += rawDt;
      // A 40 m circular path keeps speed constant through changing headings.
      // Its exact trajectory is independent of the integration being tested.
      const heading = turning ? elapsed * SPEED / 40 : 0;
      if (turning) target.set(40 * (1 - Math.cos(heading)), 1.15, 40 * Math.sin(heading));
      else target.set(0, 1.15, elapsed * SPEED);
      followMovingTarget(follow, previous, target, Math.min(rawDt, .05));
      previous.copy(target);
      legacyChase(oldFollow, target, rawDt);

      const rider = seat.clone().applyAxisAngle(THREE.Object3D.DEFAULT_UP, heading).add(target);
      // The oracle is a rigid camera carriage. During a turn the offset seat
      // should move naturally on screen, but frame timing must add no motion.
      const expected = screen(rider, target);
      maximumErrorPx = Math.max(maximumErrorPx, screen(rider, follow).distanceTo(expected));
      if (frame > 80) {
        error.copy(screen(rider, oldFollow)).sub(expected);
        minimum.min(error); maximum.max(error);
      }
    }
    const legacyVariationPx = maximum.distanceTo(minimum);
    assert.ok(maximumErrorPx < 1e-7, `${pattern}: ${turning ? "turning" : "straight"} camera added screen motion`);
    assert.ok(legacyVariationPx > .5, `${pattern}: negative control did not reproduce visible follow wobble`);
    results.push({ pattern, turning, maximumErrorPx, legacyVariationPx });
  }
}

// A mounting offset should decay by elapsed easing time, regardless of how
// that interval is split into render frames or where the vehicle travels.
const initialOffset = new THREE.Vector3(2, -1, -3);
function settle(deltas: number[], moving: boolean) {
  const target = new THREE.Vector3(), previous = target.clone(), follow = initialOffset.clone();
  let elapsed = 0, easingTime = 0, previousError = initialOffset.length();
  for (const rawDt of deltas) {
    elapsed += rawDt;
    const dt = Math.min(rawDt, .05);
    easingTime += dt;
    if (moving) target.set(Math.sin(elapsed) * 5, Math.sin(elapsed * .5), elapsed * SPEED);
    followMovingTarget(follow, previous, target, dt);
    previous.copy(target);
    const distance = follow.distanceTo(target);
    assert.ok(distance <= previousError + 1e-12, "mounting offset overshot or grew");
    previousError = distance;
  }
  const residual = follow.clone().sub(target);
  const expected = initialOffset.clone().multiply(new THREE.Vector3(Math.exp(-13 * easingTime), Math.exp(-10 * easingTime), Math.exp(-13 * easingTime)));
  assert.ok(residual.distanceTo(expected) < 1e-11, "mount offset no longer follows continuous exponential recovery");
  return residual;
}
const regular = Array.from({ length: 120 }, () => 1 / 120);
const unevenOneSecond: number[] = [];
let remaining = 1;
while (remaining > 1e-12) {
  const dt = Math.min(remaining, patterns.uneven[unevenOneSecond.length % patterns.uneven.length]);
  unevenOneSecond.push(dt); remaining -= dt;
}
assert.ok(settle(regular, true).distanceTo(settle(unevenOneSecond, true)) < 1e-11, "mount recovery depends on render partition");
assert.ok(settle(Array.from({ length: 360 }, () => 1 / 120), false).length() < 1e-12, "stationary camera did not settle");
settle(Array.from({ length: 80 }, (_, i) => patterns.hitches[i % patterns.hitches.length]), true);

const held = new THREE.Vector3(2, 3, 4), previous = new THREE.Vector3(1, 1, 1), target = new THREE.Vector3(8, 9, 10);
const offset = held.clone().sub(previous);
followMovingTarget(held, previous, target, 0);
assert.ok(held.clone().sub(target).distanceTo(offset) < 1e-12, "zero-time frame changed the mount offset");

console.log(JSON.stringify({ results, checks: "projected straight/turning stability; irregular frames; 80 ms hitches; mounting recovery; render partition invariance; stationary settling; zero-time frame", elapsedMs: performance.now() - started }, null, 2));
