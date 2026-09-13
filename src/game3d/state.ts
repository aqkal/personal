/**
 * Mutable per-frame runtime state, shared between systems without touching
 * React state (zero re-renders during gameplay). Deliberately dependency-free
 * so HUD components can import it without pulling three.js into their chunk.
 */
export const playerPos = { x: 0, z: 8 };

/** Player heading in radians (for the minimap arrow). */
export const playerHeading = { value: Math.PI };

export const playerMotion = { vx: 0, vz: 0, y: 0, vy: 0, jumpQueued: false, worldY: 0, grounded: true, distance: 0, landing: 0 };

/** Third-person orbit camera: drag to rotate, wheel/pinch to zoom. */
export const cameraOrbit = {
  yaw: 0,
  pitch: 0.68,
  dist: 13,
  /** cinematic fly-in progress 0..1; 1 = player has control */
  intro: 0,
  targetYaw: 0,
  targetPitch: 0.68,
  targetDist: 13,
};

export const runtime = {
  paused: false,
  /** Overlays can stop locomotion while an exhibit continues to render. */
  simulationPaused: false,
  focused: true,
  reducedMotion: false,
  ready: false,
  playing: false,
};

/** Virtual joystick vector (-1..1), written by the touch HUD. */
export const joystick = { x: 0, y: 0, active: false, sprint: false, brake: false };

export type TravelMode = "walking" | "driving" | "scooter" | "ferry";
export const travelState = {
  mode: "walking" as TravelMode,
  buggy: { x: -10, z: 7, y: 0, heading: Math.PI / 2, speed: 0, steering: 0, stopped: 1, boosting: false, velocityX: 0, velocityZ: 0, yawRate: 0, drift: 0, drifting: false },
  scooter: { x: 4.5, z: 8, y: 0, heading: Math.PI / 2, speed: 0, steering: 0, stopped: 1, boosting: false, lean: 0, distance: 0, velocityX: 0, velocityZ: 0, yawRate: 0, drift: 0, drifting: false },
  ferry: { x: -14, z: 50, y: -.3, heading: Math.PI / 2, progress: 0, from: 0, moving: false },
  pendingTravel: null as { x: number; z: number; yaw: number } | null,
  skipRide: false,
  transition: 0,
};

/** End a ride without leaving an unoccupied vehicle moving or unboardable. */
export function resetInactiveTravelMotion() {
  if(travelState.mode!=="driving")Object.assign(travelState.buggy,{speed:0,steering:0,stopped:1,boosting:false,velocityX:0,velocityZ:0,yawRate:0,drift:0,drifting:false});
  if(travelState.mode!=="scooter")Object.assign(travelState.scooter,{speed:0,steering:0,stopped:1,boosting:false,lean:0,velocityX:0,velocityZ:0,yawRate:0,drift:0,drifting:false});
  if(travelState.mode!=="ferry"){travelState.ferry.moving=false;travelState.skipRide=false;}
}

/** Nearest interactable, written by the proximity system (for the pulse ring). */
export const activeTarget = { x: 0, z: 0, active: false };

import { perfEnabled } from "./perf";

// introspection for debugging in the browser console
if (typeof window !== "undefined" && perfEnabled()) {
  (window as unknown as Record<string, unknown>).__g3d = {
    playerPos,
    playerHeading,
    cameraOrbit,
    runtime,
    joystick,
  };
}

export const contextAction = { kind: null as "inspect" | "drive" | "scooter" | "board" | "exit" | null };
