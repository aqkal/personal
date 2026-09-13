/** Travel geometry is shared by the road renderer, motors, navigation and tests. */
export const BUGGY_ROADS = [
  { x: 0, z: -7, w: 82, d: 5 },
  { x: 0, z: 30, w: 82, d: 5 },
  { x: -41, z: 11.5, w: 5, d: 42 },
  { x: 41, z: 11.5, w: 5, d: 42 },
  { x: -15.5, z: 7, w: 51, d: 5 },
  { x: 10, z: 3, w: 5, d: 13 },
] as const;
export const BUGGY_BAYS = [{ x: -10, z: 7 }, { x: 34, z: -7 }, { x: -17, z: 30 }] as const;
export const FERRY_DOCKS = [
  { id: "campus", x: -14, z: 40, boatX: -14, boatZ: 50, y: 0.36 },
  { id: "lookout", x: -6, z: 84, boatX: -16.8, boatZ: 84, y: 0.36 },
] as const;
export const FERRY_SECONDS = 24;
export const PLAY_LAWN = { x: -45, z: -42, hw: 7, hd: 6 };
export const BUGGY_EXIT_DISTANCE = 1.6;
/** Full shipped cart envelope, including wheels, bumpers and canopy. */
export const BUGGY_DIMENSIONS = {
  halfWidth: 1.04, halfLength: 1.41, halfHeight: 1.24, bodyY: 1.25,
} as const;
export const SCOOTER_EXIT_DISTANCE = 1.05;
export const SCOOTER_START = { x: 4.5, z: 8, heading: Math.PI / 2 } as const;
export const SCOOTER_DIMENSIONS = {
  halfWidth: .59, halfLength: .84, halfHeight: 1.10, bodyY: 1.14,
  deckY: .30, wheelRadius: .18, handleY: 1.51, handleZ: .48, gripX: .34,
} as const;
const {halfWidth:sw,halfLength:sl}=SCOOTER_DIMENSIONS;
const SCOOTER_FOOTPRINT = [
  [0,0],[-sw,-sl],[sw,-sl],[-sw,sl],[sw,sl],[0,-sl],[0,sl],
] as const;
const {halfWidth:bw,halfLength:bl}=BUGGY_DIMENSIONS;
const BUGGY_FOOTPRINT = [
  [0,0],[bw,bl],[-bw,bl],[bw,-bl],[-bw,-bl],
] as const;
const FERRY_ROUTE = [
  { x: FERRY_DOCKS[0].boatX, z: FERRY_DOCKS[0].boatZ }, { x: -5, z: 53 }, { x: 10, z: 54 },
  { x: 13, z: 58 }, { x: 8, z: 61 }, { x: -12, z: 61 },
  { x: -18, z: 70 }, { x: FERRY_DOCKS[1].boatX, z: FERRY_DOCKS[1].boatZ },
] as const;
function catmullPoint(p0:number,p1:number,p2:number,p3:number,u:number){return .5*(2*p1+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u*u*u);}
function catmullTangent(p0:number,p1:number,p2:number,p3:number,u:number){return .5*((-p0+p2)+2*(2*p0-5*p1+4*p2-p3)*u+3*(-p0+3*p1-3*p2+p3)*u*u);}

/** A narrow vehicle still needs handlebar, wheel and corner clearance. */
export function scooterFootprintPoints(x: number, z: number, heading: number) {
  const c = Math.cos(heading), s = Math.sin(heading);
  return SCOOTER_FOOTPRINT.map(([lx, lz]) => ({
    x: x + lx * c + lz * s, z: z - lx * s + lz * c,
  }));
}

export type ScooterSurface = {
  heightAt(x: number, z: number): number;
  mainlandAt(x: number, z: number, margin: number): boolean;
  lake: { x: number; z: number; rx: number; rz: number };
  bridge: { from: number; to: number };
};
export type BuggySurface = Pick<ScooterSurface,"heightAt"|"lake"> & {
  mainlandAt(x: number, z: number): boolean;
};

/**
 * Resolve the complete scooter footprint onto declared riding surfaces.
 * Bridge restrictions apply even where its ramp overlaps the mainland below.
 * Buildings and furniture never become ground merely because they have a roof.
 */
export function scooterSurfaceHeight(x: number, z: number, heading: number, surface: ScooterSurface): number | null {
  let low = Infinity, high = -Infinity;
  const c = Math.cos(heading), s = Math.sin(heading);
  for (const [lx,lz] of SCOOTER_FOOTPRINT) {
    const px=x+lx*c+lz*s,pz=z-lx*s+lz*c;
    if (!surface.mainlandAt(px, pz, .12)) return null;
    if (Math.abs(px) <= 2.4 && pz >= surface.bridge.from - .12 && pz <= surface.bridge.to) return null;
    const lakeX = (px - surface.lake.x) / surface.lake.rx;
    const lakeZ = (pz - surface.lake.z) / surface.lake.rz;
    if (lakeX * lakeX + lakeZ * lakeZ < 1.04) return null;
    const y = surface.heightAt(px, pz);
    if (!Number.isFinite(y)) return null;
    low = Math.min(low, y); high = Math.max(high, y);
  }
  // Only low thresholds can be ridden over. Large drop-offs require dismounting.
  return high - low <= .34 ? high : null;
}

/** Reuse the already sampled destination when an obstacle sweep is complete. */
export function scooterSweepSurfaceHeight(targetHeight: number | null, fraction: number, x: number, z: number, heading: number, surface: ScooterSurface) {
  return fraction === 1 ? targetHeight : scooterSurfaceHeight(x,z,heading,surface);
}

export function scooterExitCandidates(x: number, z: number, heading: number) {
  const c = Math.cos(heading), s = Math.sin(heading);
  return [[SCOOTER_EXIT_DISTANCE, 0], [-SCOOTER_EXIT_DISTANCE, 0], [SCOOTER_EXIT_DISTANCE, -.6], [-SCOOTER_EXIT_DISTANCE, -.6], [0, -1.4]].map(([lx, lz]) => ({
    x: x + lx * c + lz * s, z: z - lx * s + lz * c,
  }));
}

function transportSteering(speed: number, steering: number, turn: number, wheelbase: number, dt: number) {
  // Preserve parking turns while progressively widening boosted turns. Scaling
  // by wheelbase keeps the short scooter from pivoting sharply at road speed.
  const limit = .52 / (1 + Math.abs(speed) * .04 + (speed / wheelbase) ** 2 * .02);
  const desired = -Math.max(-1, Math.min(1, turn)) * limit;
  return steering + (desired - steering) * (1 - Math.exp(-10 * dt));
}

export type DriftMotion = {
  velocityX: number;
  velocityZ: number;
  yawRate: number;
  drift: number;
};

type DriftTuning = {
  wheelbase: number;
  brakeRate: number;
  reverseRate: number;
  driveRate: number;
  coastRate: number;
  handbrakeRate: number;
  entrySpeed: number;
  releaseSpeed: number;
  reversingThreshold: number;
  driveThreshold: number;
  entryRate: number;
  exitRate: number;
  slideGrip: number;
  yawGain: number;
  slideDrag: number;
};

export type VehicleMotorStep = DriftMotion & {
  speed: number;
  steering: number;
  headingDelta: number;
  drifting: boolean;
};

const BUGGY_DRIFT: DriftTuning = {
  wheelbase: 1.85, brakeRate: 15, reverseRate: 14, driveRate: 3.8, coastRate: 6,
  handbrakeRate: .85, entrySpeed: 4.4, releaseSpeed: 2.2, reversingThreshold: -.1, driveThreshold: 0,
  entryRate: 7.5, exitRate: 3.4, slideGrip: .7, yawGain: .9, slideDrag: .22,
};
const SCOOTER_DRIFT: DriftTuning = {
  wheelbase: 1.03, brakeRate: 13, reverseRate: 8, driveRate: 2.8, coastRate: 4.5,
  handbrakeRate: 1.35, entrySpeed: 4.8, releaseSpeed: 2, reversingThreshold: 0, driveThreshold: .05,
  entryRate: 9, exitRate: 5.8, slideGrip: 2.4, yawGain: .52, slideDrag: .4,
};

function finite(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Add controllable yaw and lateral inertia to the ordinary bicycle motor.
 * Braking stays unchanged unless the vehicle is moving forward and steering.
 */
function driftMotor(
  speed: number,
  steering: number,
  throttle: number,
  turn: number,
  brake: boolean,
  dt: number,
  targetForward: number,
  targetReverse: number,
  tuning: DriftTuning,
  motion?: DriftMotion,
  heading = 0,
): VehicleMotorStep {
  const boundedDt = Math.max(0, Math.min(dt, .05));
  const boundedThrottle = Math.max(-1, Math.min(1, throttle));
  const boundedTurn = Math.max(-1, Math.min(1, turn));
  const priorDrift = Math.max(0, Math.min(1, finite(motion?.drift ?? 0, 0)));
  const enteringDrift = speed >= tuning.entrySpeed && priorDrift <= .08;
  const spendingDrift = speed > tuning.releaseSpeed && priorDrift > .08;
  const handbrake = brake && boundedThrottle >= 0 && Math.abs(boundedTurn) >= .18 && (enteringDrift || spendingDrift);
  const target = brake ? 0 : boundedThrottle * (boundedThrottle < 0 ? targetReverse : targetForward);
  const reversing = target * speed < tuning.reversingThreshold;
  const rate = handbrake ? tuning.handbrakeRate : brake ? tuning.brakeRate : reversing ? tuning.reverseRate : Math.abs(boundedThrottle) > tuning.driveThreshold ? tuning.driveRate : tuning.coastRate;
  let nextSpeed = speed + (target - speed) * (1 - Math.exp(-rate * boundedDt));
  if (target === 0 && Math.abs(nextSpeed) < .02) nextSpeed = 0;
  const nextSteering = transportSteering(nextSpeed, steering, boundedTurn, tuning.wheelbase, boundedDt);
  let drift = handbrake
    ? priorDrift + (1 - priorDrift) * (1 - Math.exp(-tuning.entryRate * boundedDt))
    : priorDrift * Math.exp(-tuning.exitRate * boundedDt);
  if (drift < .002) drift = 0;

  const bicycleYaw = Math.tan(nextSteering) * nextSpeed / tuning.wheelbase;
  const priorYaw = finite(motion?.yawRate ?? bicycleYaw, bicycleYaw);
  const yawTarget = bicycleYaw * (1 + tuning.yawGain * drift);
  const yawRate = drift === 0 && !handbrake
    ? bicycleYaw
    : priorYaw + (yawTarget - priorYaw) * (1 - Math.exp(-(6 + 3 * (1 - drift)) * boundedDt));
  const headingDelta = yawRate * boundedDt;
  const nextHeading = heading + headingDelta;
  const desiredX = Math.sin(nextHeading) * nextSpeed;
  const desiredZ = Math.cos(nextHeading) * nextSpeed;
  const oldX = finite(motion?.velocityX ?? Math.sin(heading) * speed, Math.sin(heading) * speed);
  const oldZ = finite(motion?.velocityZ ?? Math.cos(heading) * speed, Math.cos(heading) * speed);
  const oldMagnitude = Math.hypot(oldX, oldZ);
  const useSpeedFallback = oldMagnitude < .001 && Math.abs(speed) > .05 && priorDrift === 0;
  const priorX = useSpeedFallback ? Math.sin(heading) * speed : oldX;
  const priorZ = useSpeedFallback ? Math.cos(heading) * speed : oldZ;
  const grip = 20 + (tuning.slideGrip - 20) * drift;
  const blend = 1 - Math.exp(-grip * boundedDt);
  const drag = handbrake ? Math.exp(-tuning.slideDrag * boundedDt) : 1;
  const velocityX = drift === 0 && !handbrake ? desiredX : (priorX + (desiredX - priorX) * blend) * drag;
  const velocityZ = drift === 0 && !handbrake ? desiredZ : (priorZ + (desiredZ - priorZ) * blend) * drag;
  const drifting = drift > .08 && Math.hypot(velocityX, velocityZ) > 2.5;
  return { speed: nextSpeed, steering: nextSteering, headingDelta, velocityX, velocityZ, yawRate, drift, drifting };
}

/** Fixed-step buggy motor, shared with physics verification. */
export function buggyMotor(speed: number, steering: number, throttle: number, turn: number, brake: boolean, boost: boolean, road: boolean, dt: number, motion?: DriftMotion, heading = 0) {
  const forwardLimit = boost ? (road ? 14 : 8) : (road ? 9 : 5.4);
  const reverseLimit = boost ? (road ? 10 : 7) : (road ? 5 : 3.5);
  return driftMotor(speed, steering, throttle, turn, brake, dt, forwardLimit, reverseLimit, BUGGY_DRIFT, motion, heading);
}

/** Fixed-step scooter motor, shared with physics verification. */
export function scooterMotor(speed: number, steering: number, throttle: number, turn: number, brake: boolean, boost: boolean, dt: number, motion?: DriftMotion, heading = 0) {
  // Terrain controls where the scooter may go, never how quickly it travels.
  return driftMotor(speed, steering, throttle, turn, brake, dt, boost ? 14 : 8, 2.2, SCOOTER_DRIFT, motion, heading);
}

export function onBuggyRoad(x: number, z: number, inset = 0) {
  return BUGGY_ROADS.some(r => Math.abs(x - r.x) <= r.w / 2 - inset && Math.abs(z - r.z) <= r.d / 2 - inset);
}

/** Sample the moving buggy footprint, rather than treating its centre as the whole vehicle. */
export function buggyFootprintPoints(x: number, z: number, heading: number) {
  const c=Math.cos(heading),s=Math.sin(heading);
  return BUGGY_FOOTPRINT.map(([lx,lz])=>({x:x+lx*c+lz*s,z:z-lx*s+lz*c}));
}

/** Allocation-free terrain check for the fixed-tick cart motor. */
export function buggySurfaceValid(x: number, z: number, heading: number, surface: BuggySurface) {
  const c=Math.cos(heading),s=Math.sin(heading);
  for(const [lx,lz] of BUGGY_FOOTPRINT){
    const px=x+lx*c+lz*s,pz=z-lx*s+lz*c;
    if(!surface.mainlandAt(px,pz)||surface.heightAt(px,pz)>.05)return false;
    const lakeX=(px-surface.lake.x)/surface.lake.rx,lakeZ=(pz-surface.lake.z)/surface.lake.rz;
    if(!(lakeX*lakeX+lakeZ*lakeZ>=1.02))return false;
  }
  return true;
}

export function buggyExitCandidates(x: number, z: number, heading: number) {
  const sideX = Math.cos(heading) * BUGGY_EXIT_DISTANCE;
  const sideZ = -Math.sin(heading) * BUGGY_EXIT_DISTANCE;
  return [{ x: x + sideX, z: z + sideZ }, { x: x - sideX, z: z - sideZ }];
}

export function dockArrivalCandidates(dockIndex: number) {
  const dock = FERRY_DOCKS[dockIndex];
  const points: Array<{ x:number; z:number }> = [];
  for (let radius = 0; radius <= 2.001; radius += 0.4) {
    for (let i = 0; i < 12; i++) points.push({
      x: dock.x + Math.cos(i * Math.PI / 6) * radius,
      z: dock.z + Math.sin(i * Math.PI / 6) * radius,
    });
  }
  return points;
}

/** A broad river excursion under the bridge, then around to the lookout berth. */
export function ferryPose(progress: number, from: number) {
  const t = from === 0 ? progress : 1 - progress;
  const scaled = Math.max(0, Math.min(1, t)) * (FERRY_ROUTE.length - 1);
  const i = Math.min(FERRY_ROUTE.length - 2, Math.floor(scaled)), u = scaled - i;
  const a = FERRY_ROUTE[Math.max(0, i - 1)], b = FERRY_ROUTE[i], c = FERRY_ROUTE[i + 1], d = FERRY_ROUTE[Math.min(FERRY_ROUTE.length - 1, i + 2)];
  const direction = from === 0 ? 1 : -1;
  return { x: catmullPoint(a.x,b.x,c.x,d.x,u), z: catmullPoint(a.z,b.z,c.z,d.z,u), heading: Math.atan2(catmullTangent(a.x,b.x,c.x,d.x,u)*direction, catmullTangent(a.z,b.z,c.z,d.z,u)*direction) };
}
