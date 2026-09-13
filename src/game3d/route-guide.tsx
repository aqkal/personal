"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { gameBus } from "@/game/bus";
import { clearSegment, DESTINATIONS, destinationId, findRoute, navigation } from "./navigation";
import { playerPos, runtime } from "./state";
import { groundHeight } from "./layout";

const marker = new THREE.Object3D();
const DOTS = 44;

/** One instanced draw call, no lights, no per-frame React updates. */
export function RouteGuide() {
  const dots = useRef<THREE.InstancedMesh>(null);
  const replanTimer = useRef(0);
  useEffect(() => {
    const select = ({ id }: { id: string }) => {
      const destination = DESTINATIONS.find((item) => destinationId(item) === id) ?? null;
      navigation.destination = destination;
      navigation.points = destination ? findRoute(playerPos, destination) : [];
      navigation.index = 0;
      navigation.arrived = false;
      replanTimer.current = 0;
      gameBus.emit("navigation:change", { id: destination ? id : null, arrived: false, failed: !!destination && !navigation.points.length });
    };
    gameBus.on("navigation:select", select);
    return () => {
      gameBus.off("navigation:select", select);
      navigation.destination = null;
      navigation.points = [];
      navigation.index = 0;
    };
  }, []);

  useFrame(({ clock }, dt) => {
    const mesh = dots.current;
    if (!mesh) return;
    const target = navigation.destination;
    mesh.visible = !!target && !navigation.arrived && runtime.playing;
    if (!target || navigation.arrived || runtime.paused || !runtime.playing) return;
    const distance = Math.hypot(target.x - playerPos.x, target.z - playerPos.z);
    if (distance < target.radius - 0.4 && !navigation.arrived) {
      navigation.arrived = true;
      mesh.visible = false;
      gameBus.emit("navigation:change", { id: destinationId(target), arrived: true });
      if (!target.payload) gameBus.emit("campus:visit", { id: destinationId(target) });
      return;
    }
    // Free exploration remains possible. Recalculate after a detour, at most once per second.
    replanTimer.current += dt;
    if (!navigation.arrived && replanTimer.current > 1) {
      replanTimer.current = 0;
      const next = navigation.points[navigation.index];
      if (next && (Math.hypot(next.x - playerPos.x, next.z - playerPos.z) > 5 || !clearSegment(playerPos, next))) {
        navigation.points = findRoute(playerPos, target);
        navigation.index = 0;
        if (!navigation.points.length) {
          gameBus.emit("navigation:change", { id: destinationId(target), arrived: false, failed: true });
        }
      }
    }
    while (navigation.index < navigation.points.length - 1) {
      const p = navigation.points[navigation.index];
      if (Math.hypot(p.x - playerPos.x, p.z - playerPos.z) > 1.35) break;
      navigation.index++;
    }
    const start = navigation.index;
    let count = 0;
    for (let i = start; i < navigation.points.length && count < DOTS; i += 2) {
      const p = navigation.points[i];
      marker.position.set(p.x, groundHeight(p.x, p.z) + 0.065, p.z);
      marker.rotation.set(-Math.PI / 2, 0, 0);
      marker.scale.setScalar(runtime.reducedMotion ? 1 : 0.88 + Math.sin(clock.elapsedTime * 3 - count * 0.35) * 0.12);
      marker.updateMatrix();
      mesh.setMatrixAt(count++, marker.matrix);
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={dots} args={[undefined, undefined, DOTS]} frustumCulled={false} userData={{ noShadow: true }}>
      <ringGeometry args={[0.095, 0.19, 12]} />
      <meshBasicMaterial color="#ffe3a0" depthWrite={false} transparent opacity={0.9} />
    </instancedMesh>
  );
}
