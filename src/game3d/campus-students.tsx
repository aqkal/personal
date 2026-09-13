"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { groundHeight, isBlocked } from "./layout";
import { playerPos, runtime } from "./state";
import { StudentAvatar, type StudentAvatarProps } from "./student-avatar";
import { onBuggyRoad } from "./travel-layout";

const PATHS = [
  [[-17, -12], [-10, -12]],
  [[7, -20], [11, -20]],
  [[-22, 18], [-14, 18]],
  [[13, 9], [20, 9]],
  [[-12, 24], [-4, 24]],
  [[4, -38], [12, -38]],
] as const;

type WalkerProps = {
  path: (typeof PATHS)[number];
  index: number;
};

function CampusWalker({ path, index }: WalkerProps) {
  const group = useRef<THREE.Group>(null);
  const motion = useRef<StudentAvatarProps>({ speed: 0, travelled: index * 0.43 });
  const progress = useRef((index * 0.173) % 1);
  const direction = useRef(index % 2 === 0 ? 1 : -1);
  const travelled = useRef(index * 0.43);
  const greeting = useRef(false);

  useFrame((_, rawDt) => {
    const actor = group.current;
    if (!actor) return;
    const dt = Math.min(rawDt, 0.05);
    const [a, b] = path;
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const currentX = THREE.MathUtils.lerp(a[0], b[0], progress.current);
    const currentZ = THREE.MathUtils.lerp(a[1], b[1], progress.current);
    const playerDistance = Math.hypot(playerPos.x - currentX, playerPos.z - currentZ);
    actor.visible = playerDistance < 30;
    motion.current.active = actor.visible && !runtime.paused && !runtime.simulationPaused && runtime.focused && runtime.playing;
    if (!motion.current.active) return;

    greeting.current = !runtime.reducedMotion && playerDistance < (greeting.current ? 4.2 : 3.2);
    let speed = runtime.reducedMotion || greeting.current ? 0 : 1.15 + (index % 3) * 0.12;
    const proposed = THREE.MathUtils.clamp(progress.current + direction.current * speed * dt / length, 0, 1);
    const nextX = THREE.MathUtils.lerp(a[0], b[0], proposed);
    const nextZ = THREE.MathUtils.lerp(a[1], b[1], proposed);
    if (speed > 0 && (isBlocked(nextX, nextZ) || onBuggyRoad(nextX, nextZ, -0.5))) {
      direction.current *= -1;
      speed = 0;
    } else {
      travelled.current += Math.abs(proposed - progress.current) * length;
      progress.current = proposed;
      if (speed > 0 && (proposed === 1 || proposed === 0)) direction.current *= -1;
    }
    const t = progress.current;
    const x = THREE.MathUtils.lerp(a[0], b[0], t);
    const z = THREE.MathUtils.lerp(a[1], b[1], t);
    motion.current.speed = speed;
    motion.current.travelled = travelled.current;
    motion.current.waving = greeting.current;
    actor.position.set(x, groundHeight(x, z), z);
    const targetHeading = greeting.current
      ? Math.atan2(playerPos.x - x, playerPos.z - z)
      : Math.atan2((b[0] - a[0]) * direction.current, (b[1] - a[1]) * direction.current);
    const turn = Math.atan2(Math.sin(targetHeading - actor.rotation.y), Math.cos(targetHeading - actor.rotation.y));
    actor.rotation.y += turn * (1 - Math.exp(-10 * dt));
  }, -1);

  return (
    <group ref={group} position={[path[0][0], 0, path[0][1]]} scale={0.92}>
      <StudentAvatar speed={0} motionRef={motion} variant={(index % 6) as 0 | 1 | 2 | 3 | 4 | 5} castShadow={index < 2} />
    </group>
  );
}

/** At most six nearby students, with distant movement and animation frozen. */
export function CampusStudents() {
  return PATHS.map((path, index) => <CampusWalker key={index} path={path} index={index} />);
}
