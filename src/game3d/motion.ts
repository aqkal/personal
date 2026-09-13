export const damp = (value: number, target: number, rate: number, dt: number) =>
  target + (value - target) * Math.exp(-rate * dt);

export const wrapAngle = (angle: number) =>
  Math.atan2(Math.sin(angle), Math.cos(angle));
