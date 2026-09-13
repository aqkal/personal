"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { travelState } from "./state";
import { SCOOTER_DIMENSIONS } from "./travel-layout";
import { travelPresentation } from "./travel-presentation";

const COLORS = { graphite: "#30323a", dark: "#17191f", tire: "#101116", silver: "#b8bac5", accent: "#a89ad0", white: "#f4f4fa", red: "#dd634e" } as const;
type Color = keyof typeof COLORS;

/** One shared vertex-color material, five small merged meshes, no lights. */
function createScooter(shadows: boolean) {
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const geometries: THREE.BufferGeometry[] = [];
  const root = new THREE.Group();
  root.name = "CampusElectricScooter";
  const lean = new THREE.Group();
  root.add(lean);
  const steering = new THREE.Group();
  steering.position.z = SCOOTER_DIMENSIONS.handleZ;
  lean.add(steering);
  const batches = { body: [] as THREE.BufferGeometry[], stem: [] as THREE.BufferGeometry[], rear: [] as THREE.BufferGeometry[], front: [] as THREE.BufferGeometry[], stand: [] as THREE.BufferGeometry[] };
  const paint = (geometry: THREE.BufferGeometry, color: Color, batch: keyof typeof batches) => {
    const shape = geometry.index ? geometry.toNonIndexed() : geometry;
    if (shape !== geometry) geometry.dispose();
    const shade = new THREE.Color(COLORS[color]);
    const attribute = new Float32Array(shape.getAttribute("position").count * 3);
    for (let i = 0; i < attribute.length; i += 3) { attribute[i] = shade.r; attribute[i + 1] = shade.g; attribute[i + 2] = shade.b; }
    shape.setAttribute("color", new THREE.BufferAttribute(attribute, 3));
    batches[batch].push(shape);
  };
  const box = (size: [number, number, number], at: [number, number, number], color: Color, batch: keyof typeof batches = "body") => {
    paint(new THREE.BoxGeometry(...size).translate(...at), color, batch);
  };
  const tube = (from: [number, number, number], to: [number, number, number], radius: number, color: Color, batch: keyof typeof batches = "body") => {
    const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to), delta = end.clone().sub(start);
    const geometry = new THREE.CylinderGeometry(radius, radius, delta.length(), 10);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()));
    geometry.translate(...start.add(end).multiplyScalar(.5).toArray());
    paint(geometry, color, batch);
  };
  box([.52, .13, 1.12], [0, .205, -.035], "graphite");
  box([.018, .03, .87], [-.266, .21, -.06], "accent");
  box([.018, .03, .87], [.266, .21, -.06], "accent");
  box([.44, .026, .94], [0, .28, -.035], "dark");
  for (const z of [-.4, -.3, -.2, -.1, 0, .1, .2, .3]) box([.34, .006, .017], [0, .296, z], "silver");
  box([.30, .04, .62], [0, .118, -.10], "dark");
  box([.19, .065, .36], [0, .389, -.64], "dark");
  box([.12, .042, .024], [0, .39, -.828], "red");
  for (const x of [-.085, .085]) tube([x, .18, -.64], [x, .235, -.39], .025, "silver");
  box([.30, .035, .018], [0, .20, .535], "white");
  // The entire stem and front assembly rotates around the steering column.
  tube([0, .26, .12], [0, 1.46, 0], .052, "graphite", "stem");
  tube([0, .66, .08], [0, .75, .071], .055, "accent", "stem");
  tube([0, .29, .12], [0, .53, .097], .064, "dark", "stem");
  tube([-.085, .18, .16], [-.085, .39, .108], .026, "silver", "stem");
  tube([.085, .18, .16], [.085, .39, .108], .026, "silver", "stem");
  tube([-.43, 1.51, 0], [.43, 1.51, 0], .031, "dark", "stem");
  for (const sign of [-1, 1]) {
    tube([sign * .27, 1.51, 0], [sign * .43, 1.51, 0], .042, "tire", "stem");
    tube([sign * .24, 1.49, .055], [sign * .39, 1.47, .063], .013, "silver", "stem");
  }
  box([.13, .035, .105], [0, 1.548, 0], "dark", "stem");
  box([.075, .008, .058], [0, 1.57, 0], "accent", "stem");
  box([.11, .09, .055], [0, 1.37, .055], "dark", "stem");
  box([.074, .051, .012], [0, 1.37, .088], "white", "stem");
  const brakeCable = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.25, 1.48, .05), new THREE.Vector3(-.14, 1.29, .15),
    new THREE.Vector3(.06, .88, .135), new THREE.Vector3(.045, .34, .13),
  ]);
  paint(new THREE.TubeGeometry(brakeCable, 14, .009, 5, false), "dark", "stem");
  box([.18, .06, .33], [0, .386, .14], "dark", "stem");
  for (const wheel of ["rear", "front"] as const) {
    paint(new THREE.CylinderGeometry(.18, .18, .105, 16).rotateZ(Math.PI / 2), "tire", wheel);
    paint(new THREE.CylinderGeometry(.095, .095, .112, 12).rotateZ(Math.PI / 2), "silver", wheel);
    paint(new THREE.CylinderGeometry(.043, .043, .118, 10).rotateZ(Math.PI / 2), "graphite", wheel);
    for (const angle of [0, Math.PI / 2]) {
      const spoke = new THREE.BoxGeometry(.121, .023, .15).rotateX(angle);
      paint(spoke, "dark", wheel);
    }
  }
  tube([0, 0, 0], [-.25, -.19, -.08], .017, "silver", "stand");
  box([.12, .024, .085], [-.25, -.19, -.08], "dark", "stand");
  const meshes = {} as Record<keyof typeof batches, THREE.Mesh>;
  for (const key of Object.keys(batches) as Array<keyof typeof batches>) {
    const geometry = mergeGeometries(batches[key]);
    for (const part of batches[key]) part.dispose();
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `ElectricScooter_${key}`;
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    meshes[key] = mesh;
    (key === "stem" || key === "front" ? steering : lean).add(mesh);
  }
  meshes.rear.position.set(0, .18, -.64);
  meshes.front.position.set(0, .18, .16);
  meshes.stand.position.set(-.17, .23, -.14);
  return { root, lean, steering, meshes, geometries, material };
}

export function ElectricScooter({ shadows = true }: { shadows?: boolean }) {
  const model = useMemo(() => createScooter(shadows), [shadows]);
  const live = useRef<typeof model | null>(null);
  const pendingDisposal = useRef(new Map<typeof model, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const timers = pendingDisposal.current;
    const pending = timers.get(model);
    if (pending !== undefined) { clearTimeout(pending); timers.delete(model); }
    live.current = model;
    return () => {
      live.current = null;
      // React development replay reuses this model immediately. Dispose only
      // after a real unmount so an in-flight shader warm-up cannot lose it.
      const timer = setTimeout(() => {
        model.geometries.forEach(geometry => geometry.dispose());
        model.material.dispose();
        timers.delete(model);
      }, 0);
      timers.set(model, timer);
    };
  }, [model]);
  useFrame(() => {
    const model = live.current;
    if (!model) return;
    const scooter = travelPresentation.scooter;
    model.root.position.set(scooter.x, scooter.y, scooter.z);
    model.root.rotation.y = scooter.heading;
    model.lean.rotation.z = travelState.mode === "scooter" ? scooter.lean : .035;
    model.steering.rotation.y = scooter.steering;
    model.meshes.stand.visible = travelState.mode !== "scooter";
    // Keep the two wheel matrices valid even during a bad presentation sample.
    // Wrap distance before division so long sessions also keep a bounded angle.
    const radius = SCOOTER_DIMENSIONS.wheelRadius;
    const wheelAngle = Number.isFinite(scooter.distance)
      ? (scooter.distance % (Math.PI * 2 * radius)) / radius
      : 0;
    model.meshes.front.rotation.x = wheelAngle;
    model.meshes.rear.rotation.x = wheelAngle;
  });
  return <primitive object={model.root} dispose={null} />;
}
