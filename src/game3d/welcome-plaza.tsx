"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeSceneGeometry } from "./geometry";
import { WaterMaterial } from "./nature";
import { runtime } from "./state";

// Match the recessed interiors authored in scripts/blender/environment.py.
const WATER_Y = 0.38;
const UPPER_WATER_Y = 1.395;
const JET_LANDING_RADIUS = 1.95;

function pavingGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  // A single narrow stone apron belongs to the basin, not the surrounding roads.
  const apron = new THREE.RingGeometry(3.04, 3.29, 64);
  apron.rotateX(-Math.PI / 2);
  apron.translate(0, 0.044, 0);
  parts.push(apron);
  // Straight paving joints stop outside the basin and keep the court quiet.
  for (const x of [-5.25, -3.5, 3.5, 5.25]) {
    const joint = new THREE.PlaneGeometry(0.018, 9);
    joint.rotateX(-Math.PI / 2);
    joint.translate(x, 0.045, 0);
    parts.push(joint);
  }
  for (const z of [-3.5, 3.5]) {
    const joint = new THREE.PlaneGeometry(14, 0.018);
    joint.rotateX(-Math.PI / 2);
    joint.translate(0, 0.045, z);
    parts.push(joint);
  }
  return mergeSceneGeometry(parts);
}

function waterGeometry() {
  return mergeSceneGeometry([
    new THREE.CircleGeometry(2.63, 64).rotateX(-Math.PI / 2).translate(0, WATER_Y, 0),
    new THREE.CircleGeometry(0.825, 48).rotateX(-Math.PI / 2).translate(0, UPPER_WATER_Y, 0),
  ]);
}

function jetGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const angle = Math.PI / 4 + i / 4 * Math.PI * 2;
    const outward = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
    const curve = new THREE.QuadraticBezierCurve3(
      outward.clone().multiplyScalar(0.77).setY(UPPER_WATER_Y + 0.015),
      outward.clone().multiplyScalar(1.18).setY(1.96),
      outward.clone().multiplyScalar(JET_LANDING_RADIUS).setY(WATER_Y + 0.008),
    );
    parts.push(new THREE.TubeGeometry(curve, 14, 0.022, 5, false));
  }
  // A modest central jet gives the low stone bowls a readable fountain silhouette.
  parts.push(new THREE.CylinderGeometry(0.015, 0.033, 0.65, 8).translate(0, 1.795, 0));
  return mergeSceneGeometry(parts);
}

function rippleGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const angle = Math.PI / 4 + i / 4 * Math.PI * 2;
    const ring = new THREE.RingGeometry(0.13, 0.155, 20);
    ring.rotateX(-Math.PI / 2);
    ring.translate(Math.sin(angle) * JET_LANDING_RADIUS, WATER_Y + 0.009, Math.cos(angle) * JET_LANDING_RADIUS);
    parts.push(ring);
  }
  return mergeSceneGeometry(parts);
}

/** Water and flush paving finish the single authored stone fountain. */
export function WelcomePlaza() {
  const geometry = useMemo(() => ({
    paving: pavingGeometry(), water: waterGeometry(), jets: jetGeometry(), ripples: rippleGeometry(),
  }), []);
  useEffect(() => () => Object.values(geometry).forEach(part => part.dispose()), [geometry]);
  const rippleRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const mesh = rippleRef.current;
    if (!mesh || runtime.reducedMotion || runtime.paused || runtime.simulationPaused || !runtime.focused) return;
    const pulse = (Math.sin(clock.elapsedTime * 2.8) + 1) * 0.5;
    const material = mesh.material as THREE.MeshBasicMaterial;
    material.opacity = 0.24 + pulse * 0.18;
  });
  return <group name="WelcomePlaza">
    <mesh geometry={geometry.paving} receiveShadow userData={{ noCast: true }}><meshLambertMaterial color="#c6b797" /></mesh>
    <mesh geometry={geometry.water} userData={{ noShadow: true }}><WaterMaterial scale={0.8} shore={0} /></mesh>
    <mesh geometry={geometry.jets} renderOrder={2} userData={{ noShadow: true }}><meshBasicMaterial color="#d7f4f2" transparent opacity={0.78} depthWrite={false} /></mesh>
    <mesh ref={rippleRef} geometry={geometry.ripples} renderOrder={3} userData={{ noShadow: true }}><meshBasicMaterial color="#f2ffff" transparent opacity={0.34} depthWrite={false} /></mesh>
  </group>;
}
