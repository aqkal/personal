export type CameraPoint = { x: number; y: number; z: number };

export type CameraBoomState = {
  distance: number;
  clearTime: number;
  requestedDistance: number;
};

export type CameraSolidBlocked = (x: number, y: number, z: number, radius: number) => boolean;

const CAMERA_RADIUS = 0.45;
const MIN_DISTANCE = 3;
const SAMPLE_STEP = 0.25;
const HOLD_SECONDS = 0.6;
const DISTANCE_DEADBAND = 0.06;
const REQUEST_DEADBAND = 0.08;

export function createCameraBoom(distance: number): CameraBoomState {
  const initial = Math.max(MIN_DISTANCE, distance);
  return { distance: initial, clearTime: HOLD_SECONDS, requestedDistance: initial };
}

function endpointBlocked(
  pivot: CameraPoint,
  direction: CameraPoint,
  distance: number,
  blocked: CameraSolidBlocked,
) {
  return blocked(
    pivot.x + direction.x * distance,
    pivot.y + direction.y * distance,
    pivot.z + direction.z * distance,
    CAMERA_RADIUS,
  );
}

function farthestSafeDistance(
  pivot: CameraPoint,
  direction: CameraPoint,
  requested: number,
  blocked: CameraSolidBlocked,
) {
  // The caller already found the starting endpoint occupied.
  for (let distance = requested - SAMPLE_STEP; distance >= MIN_DISTANCE; distance -= SAMPLE_STEP) {
    if (!endpointBlocked(pivot, direction, distance, blocked)) return distance;
  }
  return MIN_DISTANCE;
}

/** Resolve camera occupancy without testing scenery along the player sightline. */
export function resolveCameraBoom(
  state: CameraBoomState,
  pivot: CameraPoint,
  rawDirection: CameraPoint,
  requestedDistance: number,
  dt: number,
  blocked: CameraSolidBlocked,
): number {
  const length = Math.hypot(rawDirection.x, rawDirection.y, rawDirection.z) || 1;
  const direction = {
    x: rawDirection.x / length,
    y: rawDirection.y / length,
    z: rawDirection.z / length,
  };
  const requested = Math.max(MIN_DISTANCE, requestedDistance);
  const userChangedZoom = Math.abs(requested - state.requestedDistance) > REQUEST_DEADBAND;
  state.requestedDistance = requested;

  let target = requested;
  const requestedBlocked = endpointBlocked(pivot, direction, requested, blocked);
  if (requestedBlocked) {
    target = farthestSafeDistance(pivot, direction, requested, blocked);
    state.clearTime = 0;
  } else {
    state.clearTime = userChangedZoom
      ? HOLD_SECONDS
      : Math.min(HOLD_SECONDS, state.clearTime + Math.max(0, dt));
    if (state.clearTime < HOLD_SECONDS && requested > state.distance) target = state.distance;
  }

  if (Math.abs(target - state.distance) > DISTANCE_DEADBAND) {
    const rate = target < state.distance ? 18 : 3;
    state.distance += (target - state.distance) * (1 - Math.exp(-rate * Math.max(0, dt)));
  } else {
    state.distance = target;
  }

  // Damping must not leave the camera sphere inside newly entered geometry.
  const resolvedBlocked = state.distance === requested
    ? requestedBlocked
    : endpointBlocked(pivot, direction, state.distance, blocked);
  if (resolvedBlocked) {
    state.distance = farthestSafeDistance(pivot, direction, state.distance, blocked);
    state.clearTime = 0;
  }
  return state.distance;
}
