"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { travelState } from "./state";

function visibilityTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#e9cf91";

  ctx.beginPath();
  ctx.arc(64, 43, 25, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(33, 70, 62, 92, 22);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(22, 82, 22, 76, 11);
  ctx.roundRect(84, 82, 22, 76, 11);
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(37, 145, 23, 94, 11);
  ctx.roundRect(68, 145, 23, 94, 11);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

/**
 * One-draw player marker that appears only where scene depth is in front of it.
 * The plane sits toward the camera, ahead of the player's own depth, so the
 * normal character does not reveal the marker. Opaque geometry between the
 * camera and player makes the GreaterDepth test pass and exposes the silhouette.
 */
export function PlayerVisibility({
  enabledRef,
  playerRef,
}: {
  /** Optional mutable gate for a caller's existing camera-occupancy result. */
  enabledRef?: MutableRefObject<boolean>;
  /** The rendered player group, already resolved against vehicle interpolation. */
  playerRef: MutableRefObject<THREE.Group | null>;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const towardCamera = useRef(new THREE.Vector3());
  const playerCenter = useRef(new THREE.Vector3());
  const texture = useMemo(() => visibilityTexture(), []);
  const material = useRef<THREE.MeshBasicMaterial>(null);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(({ camera }, dt) => {
    const marker = mesh.current;
    const ink = material.current;
    if (!marker || !ink) return;
    const target = (enabledRef?.current ?? true) ? 0.5 : 0;
    ink.opacity = THREE.MathUtils.damp(ink.opacity, target, 12, Math.min(dt, 0.05));
    marker.visible = ink.opacity > 0.01;
    if (!marker.visible) return;

    const player = playerRef.current;
    if (!player) {
      marker.visible = false;
      return;
    }
    const seated = travelState.mode === "driving" || travelState.mode === "ferry";
    playerCenter.current.set(0, seated ? 0.88 : 1.08, 0);
    player.localToWorld(playerCenter.current);
    towardCamera.current.set(
      camera.position.x - playerCenter.current.x,
      camera.position.y - playerCenter.current.y,
      camera.position.z - playerCenter.current.z,
    );
    if (towardCamera.current.lengthSq() > 1e-6) {
      towardCamera.current.normalize().multiplyScalar(1.1);
    }
    marker.position.set(
      playerCenter.current.x + towardCamera.current.x,
      playerCenter.current.y + towardCamera.current.y,
      playerCenter.current.z + towardCamera.current.z,
    );
    marker.quaternion.copy(camera.quaternion);
  });

  return (
    <mesh ref={mesh} renderOrder={100} userData={{ noShadow: true }}>
      <planeGeometry args={[1.05, 2.1]} />
      <meshBasicMaterial
        ref={material}
        map={texture}
        transparent
        opacity={0}
        alphaTest={0.06}
        depthFunc={THREE.GreaterDepth}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
        toneMapped={false}
      />
    </mesh>
  );
}
