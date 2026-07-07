"use client";

import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { isBlocked, PLAYER_START } from "./layout";
import { joystick, playerPos, runtime } from "./state";

const WALK_SPEED = 6.2;
const SPRINT_SPEED = 9.6;

export type ControlName =
  | "forward"
  | "backward"
  | "left"
  | "right"
  | "sprint"
  | "interact";

const tmpTarget = new THREE.Vector3();
const tmpCam = new THREE.Vector3();

/**
 * Stylized student character: procedural walk cycle, collision-aware
 * movement on the XZ plane, damped third-person camera. All per-frame math
 * stays in refs and module state (no React re-renders while moving).
 */
export function Player() {
  const group = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const heading = useRef(Math.PI);
  const walkPhase = useRef(0);
  const [, getKeys] = useKeyboardControls<ControlName>();

  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const g = group.current;
    if (!g) return;

    let vx = 0;
    let vz = 0;
    if (!runtime.paused) {
      const k = getKeys();
      if (k.forward) vz -= 1;
      if (k.backward) vz += 1;
      if (k.left) vx -= 1;
      if (k.right) vx += 1;
      if (joystick.active) {
        vx = joystick.x;
        vz = joystick.y;
      }
      const len = Math.hypot(vx, vz);
      if (len > 1e-3) {
        const speed = (k.sprint ? SPRINT_SPEED : WALK_SPEED) / Math.max(len, 1);
        vx *= speed;
        vz *= speed;
      } else {
        vx = 0;
        vz = 0;
      }
    }

    // axis-separated movement so we slide along walls
    const nx = playerPos.x + vx * dt;
    if (!isBlocked(nx, playerPos.z)) playerPos.x = nx;
    const nz = playerPos.z + vz * dt;
    if (!isBlocked(playerPos.x, nz)) playerPos.z = nz;

    g.position.set(playerPos.x, 0, playerPos.z);

    const moving = vx !== 0 || vz !== 0;
    if (moving) {
      const target = Math.atan2(vx, vz);
      let diff = target - heading.current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      heading.current += diff * Math.min(1, dt * 12);
      g.rotation.y = heading.current;
      walkPhase.current += dt * (Math.hypot(vx, vz) > WALK_SPEED + 1 ? 13 : 10);
    } else {
      walkPhase.current = THREE.MathUtils.lerp(walkPhase.current, Math.round(walkPhase.current / Math.PI) * Math.PI, dt * 10);
    }

    // limb swing + idle breathing
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

    // damped third-person camera; pulls in closer while a panel is open
    const dist = runtime.paused ? 7.2 : 10.6;
    const height = runtime.paused ? 5.4 : 8.2;
    tmpCam.set(playerPos.x, height, playerPos.z + dist);
    const t = 1 - Math.exp(-dt * 4.2);
    camera.position.lerp(tmpCam, t);
    tmpTarget.set(playerPos.x, 1.5, playerPos.z);
    camera.lookAt(tmpTarget);
  });

  return (
    <group ref={group} position={[PLAYER_START.x, 0, PLAYER_START.z]}>
      <group ref={body} name="body">
        {/* torso: teal hoodie */}
        <mesh position={[0, 1.02, 0]} castShadow>
          <capsuleGeometry args={[0.26, 0.42, 6, 12]} />
          <meshStandardMaterial color="#2fbfa3" roughness={0.8} />
        </mesh>
        {/* backpack: every student has one */}
        <mesh position={[0, 1.1, -0.26]} castShadow>
          <boxGeometry args={[0.34, 0.42, 0.18]} />
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
            <meshStandardMaterial color="#28a68d" roughness={0.8} />
          </mesh>
        </group>
        <group ref={armR} position={[0.34, 1.28, 0]}>
          <mesh position={[0, -0.26, 0]} castShadow>
            <capsuleGeometry args={[0.085, 0.34, 4, 8]} />
            <meshStandardMaterial color="#28a68d" roughness={0.8} />
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
