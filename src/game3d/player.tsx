"use client";

import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { isBlocked, PLAYER_START } from "./layout";
import {
  cameraOrbit,
  joystick,
  playerHeading,
  playerPos,
  runtime,
} from "./state";

const WALK_SPEED = 6.2;
const SPRINT_SPEED = 9.6;
const INTRO_SECONDS = 4.2;

/** Cinematic fly-in: high over the river/city, sweeping down to the plaza. */
const INTRO_FROM = new THREE.Vector3(26, 46, 66);
const INTRO_LOOK_FROM = new THREE.Vector3(0, 6, 76);

export type ControlName =
  | "forward"
  | "backward"
  | "left"
  | "right"
  | "sprint"
  | "interact";

const tmpTarget = new THREE.Vector3();
const tmpCam = new THREE.Vector3();
const tmpLook = new THREE.Vector3();

const easeInOut = (t: number) => t * t * (3 - 2 * t);

/**
 * Stylized student character (UQ purple hoodie): procedural walk cycle,
 * collision-aware camera-relative movement, orbitable third-person camera.
 * All per-frame math stays in refs and module state.
 */
export function Player() {
  const group = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const walkPhase = useRef(0);
  const [, getKeys] = useKeyboardControls<ControlName>();

  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const g = group.current;
    if (!g) return;

    // input -> camera-relative movement
    let fwd = 0;
    let right = 0;
    if (!runtime.paused && cameraOrbit.intro >= 1) {
      const k = getKeys();
      if (k.forward) fwd += 1;
      if (k.backward) fwd -= 1;
      if (k.left) right -= 1;
      if (k.right) right += 1;
      if (joystick.active) {
        fwd = -joystick.y;
        right = joystick.x;
      }
    }

    const yaw = cameraOrbit.yaw;
    // camera sits at +offsetDir; forward on screen is the opposite
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);

    let vx = fx * fwd + rx * right;
    let vz = fz * fwd + rz * right;
    const len = Math.hypot(vx, vz);
    if (len > 1e-3) {
      const k = getKeys();
      const speed = (k.sprint ? SPRINT_SPEED : WALK_SPEED) / Math.max(len, 1);
      vx *= speed;
      vz *= speed;
    } else {
      vx = 0;
      vz = 0;
    }

    // axis-separated movement so we slide along walls
    const nx = playerPos.x + vx * dt;
    if (!isBlocked(nx, playerPos.z)) playerPos.x = nx;
    const nz = playerPos.z + vz * dt;
    if (!isBlocked(playerPos.x, nz)) playerPos.z = nz;

    g.position.set(playerPos.x, 0, playerPos.z);

    // heading + walk cycle
    const moving = vx !== 0 || vz !== 0;
    if (moving) {
      const target = Math.atan2(vx, vz);
      let diff = target - playerHeading.value;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      playerHeading.value += diff * Math.min(1, dt * 12);
      g.rotation.y = playerHeading.value;
      walkPhase.current += dt * (Math.hypot(vx, vz) > WALK_SPEED + 1 ? 13 : 10);
    } else {
      walkPhase.current = THREE.MathUtils.lerp(
        walkPhase.current,
        Math.round(walkPhase.current / Math.PI) * Math.PI,
        dt * 10,
      );
    }

    const swing = Math.sin(walkPhase.current) * (moving ? 0.75 : 0.05);
    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;
    if (armL.current) armL.current.rotation.x = -swing * 0.85;
    if (armR.current) armR.current.rotation.x = swing * 0.85;
    if (body.current) {
      body.current.position.y = moving
        ? Math.abs(Math.sin(walkPhase.current)) * 0.06
        : Math.sin(performance.now() / 900) * 0.02;
    }

    // orbit camera target position
    const zoomK = runtime.paused ? 0.62 : 1;
    const dist = cameraOrbit.dist * zoomK;
    const cosP = Math.cos(cameraOrbit.pitch);
    const sinP = Math.sin(cameraOrbit.pitch);
    tmpCam.set(
      playerPos.x + Math.sin(yaw) * dist * cosP,
      dist * sinP + 1.2,
      playerPos.z + Math.cos(yaw) * dist * cosP,
    );
    tmpLook.set(playerPos.x, 1.5, playerPos.z);

    if (cameraOrbit.intro < 1) {
      // cinematic fly-in from above the river; any input skips it
      cameraOrbit.intro = Math.min(1, cameraOrbit.intro + dt / INTRO_SECONDS);
      const t = easeInOut(cameraOrbit.intro);
      camera.position.lerpVectors(INTRO_FROM, tmpCam, t);
      tmpTarget.lerpVectors(INTRO_LOOK_FROM, tmpLook, t);
      camera.lookAt(tmpTarget);
    } else {
      const t = 1 - Math.exp(-dt * 5.5);
      camera.position.lerp(tmpCam, t);
      camera.lookAt(tmpLook);
    }
  });

  return (
    <group ref={group} position={[PLAYER_START.x, 0, PLAYER_START.z]}>
      <group ref={body} name="body">
        {/* torso: UQ purple hoodie */}
        <mesh position={[0, 1.02, 0]} castShadow>
          <capsuleGeometry args={[0.26, 0.42, 6, 12]} />
          <meshStandardMaterial color="#6a3ba3" roughness={0.8} />
        </mesh>
        {/* hood bump */}
        <mesh position={[0, 1.32, -0.14]} castShadow>
          <sphereGeometry args={[0.16, 10, 10]} />
          <meshStandardMaterial color="#5b3190" roughness={0.85} />
        </mesh>
        {/* backpack: every student has one */}
        <mesh position={[0, 1.08, -0.3]} castShadow>
          <boxGeometry args={[0.34, 0.44, 0.18]} />
          <meshStandardMaterial color="#e0a33c" roughness={0.85} />
        </mesh>
        {/* head */}
        <mesh position={[0, 1.66, 0]} castShadow>
          <sphereGeometry args={[0.24, 18, 18]} />
          <meshStandardMaterial color="#f2c89b" roughness={0.75} />
        </mesh>
        {/* hair cap */}
        <mesh position={[0, 1.76, -0.02]}>
          <sphereGeometry args={[0.245, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#33241a" roughness={0.95} />
        </mesh>
        {/* arms */}
        <group ref={armL} position={[-0.34, 1.28, 0]}>
          <mesh position={[0, -0.26, 0]} castShadow>
            <capsuleGeometry args={[0.085, 0.34, 4, 8]} />
            <meshStandardMaterial color="#5b3190" roughness={0.8} />
          </mesh>
        </group>
        <group ref={armR} position={[0.34, 1.28, 0]}>
          <mesh position={[0, -0.26, 0]} castShadow>
            <capsuleGeometry args={[0.085, 0.34, 4, 8]} />
            <meshStandardMaterial color="#5b3190" roughness={0.8} />
          </mesh>
        </group>
      </group>
      {/* legs */}
      <group ref={legL} position={[-0.13, 0.62, 0]}>
        <mesh position={[0, -0.28, 0]} castShadow>
          <capsuleGeometry args={[0.1, 0.34, 4, 8]} />
          <meshStandardMaterial color="#26324f" roughness={0.9} />
        </mesh>
      </group>
      <group ref={legR} position={[0.13, 0.62, 0]}>
        <mesh position={[0, -0.28, 0]} castShadow>
          <capsuleGeometry args={[0.1, 0.34, 4, 8]} />
          <meshStandardMaterial color="#26324f" roughness={0.9} />
        </mesh>
      </group>
      {/* soft blob shadow */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0]}>
        <circleGeometry args={[0.5, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.34} depthWrite={false} />
      </mesh>
    </group>
  );
}
