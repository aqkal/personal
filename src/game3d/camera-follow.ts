type Point = { x: number; y: number; z: number };

/** Track presented movement exactly, easing only the remaining camera offset. */
export function followMovingTarget(
  follow: Point,
  previousTarget: Point,
  target: Point,
  dt: number,
) {
  const horizontal = Math.exp(-13 * Math.max(0, dt));
  const vertical = Math.exp(-10 * Math.max(0, dt));
  // Chasing each new world-space target introduces a different lag at each
  // frame duration. Carry the camera with the vehicle first so its framing
  // stays stable, including when render frames fall between physics ticks.
  follow.x = target.x + (follow.x - previousTarget.x) * horizontal;
  follow.y = target.y + (follow.y - previousTarget.y) * vertical;
  follow.z = target.z + (follow.z - previousTarget.z) * horizontal;
}
