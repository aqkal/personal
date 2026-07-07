/**
 * Mutable per-frame runtime state, shared between systems without touching
 * React state (zero re-renders during gameplay). Deliberately dependency-free
 * so HUD components can import it without pulling three.js into their chunk.
 */
export const playerPos = { x: 0, z: 8 };

/** Player heading in radians (for the minimap arrow). */
export const playerHeading = { value: Math.PI };

/** Third-person orbit camera: drag to rotate, wheel/pinch to zoom. */
export const cameraOrbit = {
  yaw: 0,
  pitch: 0.62,
  dist: 13,
  /** cinematic fly-in progress 0..1; 1 = player has control */
  intro: 0,
};

export const runtime = {
  paused: false,
  /** quality ladder: 2 = full, 1 = reduced effects, 0 = minimal */
  quality: 2,
};

/** Virtual joystick vector (-1..1), written by the touch HUD. */
export const joystick = { x: 0, y: 0, active: false };

/** Nearest interactable, written by the proximity system (for the pulse ring). */
export const activeTarget = { x: 0, z: 0, active: false };

// dev-only introspection for debugging in the browser console
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as unknown as Record<string, unknown>).__g3d = {
    playerPos,
    playerHeading,
    cameraOrbit,
    runtime,
    joystick,
  };
}
