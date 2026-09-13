"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { activeTarget, runtime } from "./state";
import { groundHeight } from "./layout";
import { damp } from "./motion";

/**
 * Pulsing ground ring under the nearest interactable: the modern-game
 * "you can press E on this" affordance.
 */
export function TargetRing() {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }, dt) => {
    const m = ref.current;
    const material = mat.current;
    if (!m || !material) return;
    const show = activeTarget.active && !runtime.paused;
    material.opacity = damp(
      material.opacity,
      show ? 0.55 : 0,
      10,
      Math.min(dt, 0.05),
    );
    if (material.opacity < 0.01) {
      m.visible = false;
      return;
    }
    m.visible = true;
    m.position.set(activeTarget.x, groundHeight(activeTarget.x, activeTarget.z) + 0.05, activeTarget.z);
    const pulse = runtime.reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * 3.4) * 0.08;
    m.scale.setScalar(pulse);
  });

  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} visible={false}>
      <ringGeometry args={[0.58, 0.76, 40]} />
      <meshBasicMaterial
        ref={mat}
        color="#b18b45"
        transparent
        opacity={0}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
      />
    </mesh>
  );
}
