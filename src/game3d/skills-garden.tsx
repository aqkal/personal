"use client";

import { useEffect, useMemo } from "react";
import type {} from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CRYSTALS } from "./layout";

const PALETTE = [
  [0.76, 0.62, 0.43],
  [0.64, 0.46, 0.27],
  [0.45, 0.28, 0.08],
  [0.12, 0.32, 0.36],
  [0.22, 0.39, 0.24],
] as const;

function gardenGeometry() {
  const batches: THREE.BufferGeometry[][] = PALETTE.map(() => []);
  const rotation = new THREE.Quaternion();
  const matrix = new THREE.Matrix4();
  const unitScale = new THREE.Vector3(1, 1, 1);
  const up = new THREE.Vector3(0, 1, 0);
  const place = (geometry: THREE.BufferGeometry, material: number, x: number, y: number, z: number, yaw = 0) => {
    rotation.setFromAxisAngle(up, yaw);
    matrix.compose(new THREE.Vector3(x, y, z), rotation, unitScale);
    geometry.applyMatrix4(matrix);
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    if (flat !== geometry) geometry.dispose();
    flat.deleteAttribute("uv");
    const positions = flat.getAttribute("position");
    const normals = flat.getAttribute("normal");
    const shades = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
      const shade = (0.86 + 0.14 * Math.min(1, Math.max(0, positions.getY(i)))) * (normals.getY(i) < -0.2 ? 0.84 : 1);
      shades.set([shade, shade, shade], i * 3);
    }
    flat.setAttribute("color", new THREE.BufferAttribute(shades, 3));
    batches[material].push(flat);
  };
  const box = (material: number, x: number, y: number, z: number, w: number, h: number, d: number, radius = 0.025, yaw = 0) => {
    place(new RoundedBoxGeometry(w, h, d, 1, Math.min(radius, w / 3, h / 3, d / 3)), material, x, y, z, yaw);
  };

  // Flush paving forms an open cross. The southern edge stops before the road.
  for (const [z, depth] of [[17.225, 0.75], [20.125, 1.45], [24.125, 1.95], [27.025, 0.25]]) {
    box(0, -27, 0.025, z, 2.3, 0.05, depth, 0.02);
  }
  box(0, -27, 0.025, 22, 12.8, 0.05, 2.3, 0.02);
  for (const z of [18.5, 26]) box(0, -27, 0.025, z, 10.8, 0.05, 1.8, 0.02);

  for (const [index, station] of CRYSTALS.slice(0, 4).entries()) {
    const { x, z } = station;
    const yaw = z > 22 ? Math.PI : 0;
    const local = (dx: number, dy: number, dz = 0) => new THREE.Vector3(dx, dy, dz).applyAxisAngle(up, yaw).add(new THREE.Vector3(x, 0, z));
    const detail = (material: number, dx: number, y: number, dz: number, w: number, h: number, d: number, angle = 0) => {
      const geometry = new RoundedBoxGeometry(w, h, d, 1, Math.min(0.025, w / 3, h / 3, d / 3));
      geometry.rotateZ(angle);
      const point = local(dx, y, dz);
      place(geometry, material, point.x, point.y, point.z, yaw);
    };
    box(1, x, 0.13, z, 1.12, 0.26, 1.12, 0.045);
    box(0, x, 0.46, z, 0.86, 0.50, 0.86, 0.045);
    box(1, x, 0.75, z, 1.03, 0.11, 1.03, 0.035);
    // A recessed coloured tile distinguishes the four content stations.
    detail(3, 0, 0.45, 0.437, 0.56, 0.26, 0.025);
    detail(2, 0, 0.82, 0, 0.09, 0.12, 0.09);

    if (index === 0) {
      // Programming languages: two sculpted angle brackets.
      for (const side of [-1, 1]) for (const upper of [-1, 1]) {
        detail(2, side * 0.20, 1.035 + upper * 0.10, 0, 0.28, 0.07, 0.10, side * upper * Math.PI / 4);
      }
      detail(2, 0, 1.04, 0, 0.06, 0.38, 0.08, -0.18);
    } else if (index === 1) {
      // Web development: a browser window, with a small toolbar and inset pane.
      detail(2, 0, 1.04, 0, 0.67, 0.43, 0.11);
      detail(3, 0, 1.025, 0.067, 0.55, 0.25, 0.025);
      for (const dx of [-0.21, -0.12, -0.03]) detail(0, dx, 1.19, 0.066, 0.045, 0.035, 0.025);
    } else if (index === 2) {
      // Software engineering: a small assembled gear around a clear centre.
      const ring = new THREE.TorusGeometry(0.17, 0.052, 5, 12);
      const centre = local(0, 1.045);
      place(ring, 2, centre.x, centre.y, centre.z, yaw);
      for (let tooth = 0; tooth < 8; tooth++) {
        const angle = tooth * Math.PI / 4;
        detail(2, Math.sin(angle) * 0.225, 1.045 + Math.cos(angle) * 0.225, 0, 0.085, 0.085, 0.11, -angle);
      }
    } else {
      // Tools and technologies: three connected version-control nodes.
      detail(2, -0.18, 1.03, 0, 0.055, 0.39, 0.07);
      detail(2, 0.01, 1.035, 0, 0.055, 0.38, 0.07, -Math.PI / 3);
      for (const [dx, y] of [[-0.18, 0.86], [-0.18, 1.23], [0.20, 1.15]]) {
        const ring = new THREE.TorusGeometry(0.065, 0.023, 5, 10);
        const point = local(dx, y);
        place(ring, 3, point.x, point.y, point.z, yaw);
      }
    }
  }

  // Low planting sits along the outside edges, leaving the centre and station
  // approaches open. These ground-cover mounds require no additional solids.
  for (const x of [-34.05, -19.95]) {
    for (let i = 0; i < 9; i++) {
      const z = 17.4 + i * 1.1;
      const mound = new THREE.IcosahedronGeometry(1, 1);
      mound.scale(0.43, 0.16 + (i % 2) * 0.035, 0.44);
      place(mound, 4, x + (i % 2) * 0.09, 0.10, z);
    }
  }

  return batches.map((parts) => {
    const merged = mergeGeometries(parts, false)!;
    parts.forEach((part) => part.dispose());
    return merged;
  });
}

/** Four quiet, walk-up skill stations in five static material batches. */
export function SkillsGarden() {
  const geometry = useMemo(() => gardenGeometry(), []);
  useEffect(() => () => geometry.forEach(part => part.dispose()), [geometry]);
  return <group name="SkillsGarden">
    {geometry.map((mesh, index) => <mesh key={index} geometry={mesh} receiveShadow castShadow={index === 1 || index === 2} userData={{ noShadow: index !== 1 && index !== 2 }}>
      <meshLambertMaterial color={new THREE.Color().setRGB(PALETTE[index][0], PALETTE[index][1], PALETTE[index][2])} vertexColors />
    </mesh>)}
  </group>;
}
