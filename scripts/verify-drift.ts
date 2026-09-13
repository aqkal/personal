import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { BUGGY_DIMENSIONS, buggyMotor, scooterMotor, type DriftMotion } from "../src/game3d/travel-layout";
import { resetInactiveTravelMotion, travelState } from "../src/game3d/state";

const STEP = 1 / 60;
type Mode = "buggy" | "scooter";
type Sim = DriftMotion & { speed: number; steering: number; heading: number; x: number; z: number; drifting: boolean };

function initial(speed = 0, heading = 0): Sim {
  return {
    speed, steering: 0, heading, x: 0, z: 0, drifting: false,
    velocityX: Math.sin(heading) * speed, velocityZ: Math.cos(heading) * speed,
    yawRate: 0, drift: 0,
  };
}

function advance(state: Sim, mode: Mode, throttle: number, turn: number, brake: boolean, boost = false) {
  const result = mode === "buggy"
    ? buggyMotor(state.speed, state.steering, throttle, turn, brake, boost, true, STEP, state, state.heading)
    : scooterMotor(state.speed, state.steering, throttle, turn, brake, boost, STEP, state, state.heading);
  state.speed = result.speed;state.steering = result.steering;state.heading += result.headingDelta;
  state.velocityX = result.velocityX;state.velocityZ = result.velocityZ;state.yawRate = result.yawRate;
  state.drift = result.drift;state.drifting = result.drifting;
  state.x += result.velocityX * STEP;state.z += result.velocityZ * STEP;
  return result;
}

function localSlip(state: Sim) {
  const lateral = state.velocityX * Math.cos(state.heading) - state.velocityZ * Math.sin(state.heading);
  const forward = state.velocityX * Math.sin(state.heading) + state.velocityZ * Math.cos(state.heading);
  return Math.abs(Math.atan2(lateral, Math.max(.001, forward)));
}

async function main() {
  travelState.mode = "walking";
  Object.assign(travelState.buggy, { speed: 7, velocityX: 3, velocityZ: 4, yawRate: 1, drift: .8, drifting: true });
  Object.assign(travelState.scooter, { speed: 6, velocityX: 2, velocityZ: 3, yawRate: 1, drift: .7, drifting: true });
  resetInactiveTravelMotion();
  for (const vehicle of [travelState.buggy, travelState.scooter]) {
    assert.deepEqual(
      { speed: vehicle.speed, velocityX: vehicle.velocityX, velocityZ: vehicle.velocityZ, yawRate: vehicle.yawRate, drift: vehicle.drift, drifting: vehicle.drifting },
      { speed: 0, velocityX: 0, velocityZ: 0, yawRate: 0, drift: 0, drifting: false },
      "leaving or re-entering the world clears inactive drift momentum",
    );
  }

  for (const mode of ["buggy", "scooter"] as const) {
    const straight = initial(9);
    for (let i = 0; i < 30; i++) advance(straight, mode, 1, 0, true);
    assert.equal(straight.drift, 0, `${mode} straight Space remains an ordinary brake`);
    assert.ok(straight.speed < .03, `${mode} straight braking still stops within half a second`);

    const reverse = initial(-4);
    for (let i = 0; i < 30; i++) advance(reverse, mode, -1, 1, true);
    assert.equal(reverse.drift, 0, `${mode} cannot enter a reverse drift`);
    assert.equal(reverse.drifting, false, `${mode} reverse braking never publishes drift telemetry`);

    const slow = initial(3.5);
    for (let i = 0; i < 20; i++) advance(slow, mode, 1, 1, true);
    assert.equal(slow.drift, 0, `${mode} parking-speed brake turns do not become drifts`);
  }

  const cart = initial(9), scooter = initial(8);
  for (let i = 0; i < 45; i++) {
    advance(cart, "buggy", 1, 1, true);
    advance(scooter, "scooter", 1, 1, true);
  }
  const cartSlip = localSlip(cart), scooterSlip = localSlip(scooter);
  assert.equal(cart.drifting, true, "golf cart enters a handbrake drift at forward speed");
  assert.equal(scooter.drifting, true, "scooter enters a handbrake drift at forward speed");
  assert.ok(cartSlip > .12, `golf cart develops real lateral velocity, got ${cartSlip}`);
  assert.ok(scooterSlip > .05, `scooter develops real lateral velocity, got ${scooterSlip}`);
  assert.ok(cartSlip > scooterSlip * 1.2, `golf cart slide is broader than scooter slide: ${cartSlip} vs ${scooterSlip}`);

  const durations: Record<Mode, number> = { buggy: 0, scooter: 0 };
  for (const mode of ["buggy", "scooter"] as const) {
    const held = initial(mode === "buggy" ? 9 : 8);let priorEnergy = Infinity, entries = 0, wasDrifting = false;
    for (let tick = 0; tick < 600; tick++) {
      advance(held, mode, 1, 1, true, true);
      const energy = held.velocityX ** 2 + held.velocityZ ** 2;
      assert.ok(Number.isFinite(energy), `${mode} held-brake energy remains finite`);
      assert.ok(energy <= priorEnergy + 1e-10, `${mode} held brake cannot add kinetic energy at tick ${tick}`);
      priorEnergy = energy;
      if (held.drifting && !wasDrifting) entries++;
      if (held.drifting) durations[mode]++;
      wasDrifting = held.drifting;
    }
    assert.equal(entries, 1, `${mode} cannot re-enter drift while the same brake hold continues`);
    assert.equal(held.speed, 0, `${mode} held brake overcomes throttle and reaches an exact stop`);
    assert.equal(Math.hypot(held.velocityX, held.velocityZ), 0, `${mode} lateral momentum is fully spent at rest`);
    assert.equal(held.drifting, false, `${mode} clears drift telemetry at rest`);
  }
  assert.ok(durations.buggy >= 60 && durations.buggy <= 120, `golf cart drift lasts a controlled 1 to 2 seconds, got ${durations.buggy / 60}`);
  assert.ok(durations.scooter >= 42 && durations.scooter <= 78, `scooter drift lasts a controlled 0.7 to 1.3 seconds, got ${durations.scooter / 60}`);

  for (let i = 0; i < 180; i++) {
    advance(cart, "buggy", 1, 0, false);
    advance(scooter, "scooter", 1, 0, false);
  }
  assert.equal(cart.drift, 0, "golf cart fully regains grip after releasing Space");
  assert.equal(scooter.drift, 0, "scooter fully regains grip after releasing Space");
  assert.ok(localSlip(cart) < .005 && localSlip(scooter) < .005, "released vehicles smoothly align velocity with their heading");
  assert.ok(Math.abs(cart.speed - 9) < .01 && Math.abs(scooter.speed - 8) < .01, "release returns to unchanged normal speed limits");

  function cadence(fps: number) {
    const state = initial();let accumulator = 0,tick = 0;
    for (let frame = 0; frame < fps * 5; frame++) {
      accumulator += 1 / fps;
      while (accumulator + 1e-9 >= STEP) {
        const drifting = tick >= 120 && tick < 210;
        advance(state, "buggy", 1, tick < 260 ? .8 : 0, drifting, tick < 120);
        accumulator -= STEP;tick++;
      }
    }
    return { tick, ...state };
  }
  const cadence60 = cadence(60);
  assert.deepEqual(cadence(30), cadence60, "drift motion is identical with 30 Hz rendering");
  assert.deepEqual(cadence(120), cadence60, "drift motion is identical with 120 Hz rendering");

  const runtimeUrl = pathToFileURL(resolve("node_modules/@react-three/rapier/node_modules/@dimforge/rapier3d-compat/rapier.mjs")).href;
  const RAPIER = (await import(runtimeUrl)).default;
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  world.createCollider(RAPIER.ColliderDesc.cuboid(.12, 2, 8).setTranslation(2.5, 1, 5));
  world.step();
  const shape = new RAPIER.Cuboid(BUGGY_DIMENSIONS.halfWidth, BUGGY_DIMENSIONS.halfHeight, BUGGY_DIMENSIONS.halfLength);
  const wallRun = initial(9);let sweptHit = false, blockedAtEnd = false;
  for (let tick = 0; tick < 240; tick++) {
    const oldX = wallRun.x, oldZ = wallRun.z, oldHeading = wallRun.heading;
    const result = advance(wallRun, "buggy", 1, -1, tick < 100);
    let rotation = { x: 0, y: Math.sin(wallRun.heading / 2), z: 0, w: Math.cos(wallRun.heading / 2) };
    const dx = wallRun.x - oldX, dz = wallRun.z - oldZ;
    if (world.intersectionWithShape({ x: oldX, y: BUGGY_DIMENSIONS.bodyY, z: oldZ }, rotation, shape)) {
      wallRun.heading = oldHeading;wallRun.yawRate = 0;
      rotation = { x: 0, y: Math.sin(oldHeading / 2), z: 0, w: Math.cos(oldHeading / 2) };
    }
    const hit = world.castShape({ x: oldX, y: BUGGY_DIMENSIONS.bodyY, z: oldZ }, rotation, { x: dx, y: 0, z: dz }, shape, .025, 1, false);
    if (hit) {
      const fraction = Math.max(0, hit.time_of_impact - .025);
      wallRun.x = oldX + dx * fraction;wallRun.z = oldZ + dz * fraction;
      wallRun.velocityX = result.velocityX * fraction;wallRun.velocityZ = result.velocityZ * fraction;
      sweptHit = true;
    }
    if (world.intersectionWithShape({ x: wallRun.x, y: BUGGY_DIMENSIONS.bodyY, z: wallRun.z }, rotation, shape)) {
      wallRun.x = oldX;wallRun.z = oldZ;wallRun.heading = oldHeading;
      wallRun.velocityX *= .7;wallRun.velocityZ *= .7;wallRun.yawRate = 0;
      blockedAtEnd = true;
      rotation = { x: 0, y: Math.sin(oldHeading / 2), z: 0, w: Math.cos(oldHeading / 2) };
    }
    assert.equal(world.intersectionWithShape({ x: wallRun.x, y: BUGGY_DIMENSIONS.bodyY, z: wallRun.z }, rotation, shape), null, `sideways drift sweep must remain outside the wall at ${JSON.stringify({tick,x:wallRun.x,z:wallRun.z,heading:wallRun.heading,dx,dz,toi:hit?.time_of_impact})}`);
  }
  assert.equal(sweptHit || blockedAtEnd, true, "wall regression must exercise a lateral drift collision");
  world.free();

  const turnWorld = new RAPIER.World({ x: 0, y: 0, z: 0 });
  turnWorld.createCollider(RAPIER.ColliderDesc.cuboid(5, 2, .1).setTranslation(0, 1.5, 1.53));
  turnWorld.step();
  const oldRotation = { x: 0, y: 0, z: 0, w: 1 };
  const blockedYaw = .12;
  const candidateRotation = { x: 0, y: Math.sin(blockedYaw / 2), z: 0, w: Math.cos(blockedYaw / 2) };
  const origin = { x: 0, y: BUGGY_DIMENSIONS.bodyY, z: 0 };
  assert.equal(turnWorld.intersectionWithShape(origin, oldRotation, shape), null, "last valid cart heading remains outside the wall");
  assert.ok(turnWorld.intersectionWithShape(origin, candidateRotation, shape), "turning at contact blocks the candidate yaw");
  const retreat = { x: 0, y: 0, z: -.2 };
  const retreatHit = turnWorld.castShape(origin, oldRotation, retreat, shape, .025, 1, false);
  assert.ok(!retreatHit || retreatHit.time_of_impact > .9, "reverted heading leaves reverse motion clear");
  assert.equal(
    turnWorld.intersectionWithShape({ x: 0, y: BUGGY_DIMENSIONS.bodyY, z: retreat.z }, oldRotation, shape),
    null,
    "blocked yaw must not reject a safe retreat translation",
  );
  turnWorld.free();
  console.log(`✓ drift: entry gates, brake-dominant stop, lateral grip, exit recovery, fixed cadence and runtime wall sweep verified (${(durations.buggy/60).toFixed(2)}s cart, ${(durations.scooter/60).toFixed(2)}s scooter; ${cartSlip.toFixed(3)} vs ${scooterSlip.toFixed(3)} rad slip)`);
}

void main();
