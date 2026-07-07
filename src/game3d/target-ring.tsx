"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { activeTarget, runtime } from "./state";

/**
 * Pulsing ground ring under the nearest interactable: the modern-game
 * "you can press E on this" affordance.
 */
export function TargetRing() {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const m = ref.current;
    const material = mat.current;
    if (!m || !material) return;
    const show = activeTarget.active && !runtime.paused;
    material.opacity = THREE.MathUtils.lerp(
      material.opacity,
      show ? 0.55 : 0,
      0.15,
    );
    if (material.opacity < 0.01) {
      m.visible = false;
      return;
    }
    m.visible = true;
    m.position.set(activeTarget.x, 0.05, activeTarget.z);
    const pulse = 1 + Math.sin(clock.elapsedTime * 3.4) * 0.12;
    m.scale.setScalar(pulse);
  });

  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} visible={false}>
      <ringGeometry args={[1.05, 1.3, 40]} />
      <meshBasicMaterial
        ref={mat}
        color={[0.6, 2.2, 1.1]}
        toneMapped={false}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  );
}
