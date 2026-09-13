"use client";

import { useEffect, useMemo } from "react";
import type {} from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LOOKOUT, LOOKOUT_BENCHES, LOOKOUT_TOP } from "./layout";

const COLORS = [
  [0.64, 0.46, 0.27],
  [0.76, 0.62, 0.43],
  [0.45, 0.28, 0.08],
  [0.22, 0.39, 0.24],
] as const;

function islandGeometry() {
  const parts: THREE.BufferGeometry[][] = COLORS.map(() => []);
  const add = (geometry: THREE.BufferGeometry, material: number, x = 0, y = 0, z = LOOKOUT.z) => {
    geometry.translate(x, y, z);
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    if (flat !== geometry) geometry.dispose();
    flat.deleteAttribute("uv");
    parts[material].push(flat);
  };
  const box = (material: number, x: number, y: number, z: number, w: number, h: number, d: number) => {
    add(new RoundedBoxGeometry(w, h, d, 1, Math.min(0.03, w / 3, h / 3, d / 3)), material, x, y, z);
  };
  const beam = (start: THREE.Vector3, end: THREE.Vector3, radius: number) => {
    const direction = end.clone().sub(start);
    const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), 6);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
    const centre = start.clone().lerp(end, 0.5);
    add(geometry, 2, centre.x, centre.y, centre.z);
  };
  const top = LOOKOUT_TOP;
  const bottom = -0.7;
  // The real platform closes the formerly invisible ground collider at the
  // bridge terminus. Its submerged wall remains visible at the waterline.
  add(new THREE.CylinderGeometry(LOOKOUT.r, LOOKOUT.r, top - bottom, 48, 1, true), 0, 0, (top + bottom) / 2);
  const floor = new THREE.CircleGeometry(LOOKOUT.r - 0.56, 48);
  floor.rotateX(-Math.PI / 2);
  add(floor, 1, 0, top);
  const innerRing = new THREE.RingGeometry(LOOKOUT.r - 0.56, LOOKOUT.r - 0.38, 48);
  innerRing.rotateX(-Math.PI / 2);
  add(innerRing, 0, 0, top);
  const edge = new THREE.RingGeometry(LOOKOUT.r - 0.38, LOOKOUT.r, 48);
  edge.rotateX(-Math.PI / 2);
  add(edge, 1, 0, top);

  const radius = LOOKOUT.r - 0.27;
  const points = Array.from({ length: 49 }, (_, index) => {
    const angle = index / 48 * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * radius, top, LOOKOUT.z + Math.sin(angle) * radius);
  });
  const entrance = (point: THREE.Vector3) =>
    (Math.abs(point.x) < 2.4 && point.z < LOOKOUT.z - 5)
    || (point.x < -5.5 && point.z > LOOKOUT.z - 2.5 && point.z < LOOKOUT.z + 0.6);
  const posts = new Set<number>();
  for (let index = 0; index < 48; index++) {
    const a = points[index];
    const b = points[index + 1];
    const middle = a.clone().lerp(b, 0.5);
    if (entrance(a) || entrance(b) || entrance(middle)) continue;
    posts.add(index);
    posts.add((index + 1) % 48);
    for (const height of [0.46, 0.94]) {
      beam(a.clone().add(new THREE.Vector3(0, height, 0)), b.clone().add(new THREE.Vector3(0, height, 0)), height > 0.5 ? 0.042 : 0.028);
    }
  }
  for (const index of posts) {
    const point = points[index];
    add(new THREE.CylinderGeometry(0.038, 0.038, 0.97, 6), 2, point.x, top + 0.485, point.z);
  }

  for (const bench of LOOKOUT_BENCHES) {
    box(2, bench.x, top + 0.55, bench.z, bench.hw * 2, 0.14, 0.65);
    box(2, bench.x, top + 0.99, bench.z + 0.33, bench.hw * 2, 0.66, 0.14);
    for (const offset of [-0.75, 0.75]) box(0, bench.x + offset, top + 0.24, bench.z, 0.15, 0.48, 0.44);
  }

  // Ground cover is confined to the rear arc, clear of both arrivals.
  for (const x of [-2.4, 2.4]) for (const offset of [-0.55, 0.15, 0.75]) {
    const leaves = new THREE.IcosahedronGeometry(1, 1);
    leaves.scale(0.55, 0.20, 0.48);
    add(leaves, 3, x + offset, top + 0.14, LOOKOUT.z + 4.5 - Math.abs(offset) * 0.2);
  }

  return parts.map((batch) => {
    const geometry = mergeGeometries(batch, false)!;
    batch.forEach((part) => part.dispose());
    return geometry;
  });
}

/** A complete circular river lookout, with open bridge and ferry approaches. */
export function LookoutIsland() {
  const geometry = useMemo(() => islandGeometry(), []);
  useEffect(() => () => geometry.forEach(part => part.dispose()), [geometry]);
  return <group name="LookoutIsland">
    {geometry.map((mesh, index) => <mesh key={index} geometry={mesh} receiveShadow castShadow={index === 0 || index === 2} userData={{ noShadow: index === 1 || index === 3 }}>
      <meshLambertMaterial color={new THREE.Color().setRGB(COLORS[index][0], COLORS[index][1], COLORS[index][2])} />
    </mesh>)}
  </group>;
}
