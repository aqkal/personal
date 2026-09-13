type Position = { x: number; y: number; z: number };

/** Clockwise rotation of an upward HUD arrow in the orbit camera's view. */
export function destinationBearing(from: Position, to: Position, yaw: number, pitch: number): number | null {
  const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
  if (Math.hypot(dx, dz) < 0.001) return null;
  const right = dx * Math.cos(yaw) - dz * Math.sin(yaw);
  const up = -(dx * Math.sin(yaw) + dz * Math.cos(yaw)) * Math.sin(pitch) + dy * Math.cos(pitch);
  return Math.atan2(right, up);
}

/** Keep the displayed angle continuous when a bearing crosses north/south. */
export function unwrapBearing(previous: number, next: number): number {
  return previous + Math.atan2(Math.sin(next - previous), Math.cos(next - previous));
}
