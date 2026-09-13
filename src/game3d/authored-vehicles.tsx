"use client";

import { useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { runtime, travelState } from "./state";
import { travelPresentation } from "./travel-presentation";
import { GzipGLTFLoader } from "./gzip-gltf-loader";

const VEHICLES_URL = "/assets/game/vehicles.glb.gz";
const WHEEL_RADIUS = 0.33;
const AXLE = new THREE.Vector3(1, 0, 0);

function requireNode(root: THREE.Object3D, name: string) {
  const node = root.getObjectByName(name);
  if (!node) throw new Error(`Authored vehicles asset is missing ${name}`);
  return node;
}

/** Two flat foam ribbons share one mesh and one unlit draw call. */
function wakeGeometry() {
  const positions: number[] = [];
  const indices: number[] = [];
  for (const side of [-1, 1]) {
    const base = positions.length / 3;
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      const x = side * (1.1 + t * 1.9);
      const z = -4.9 - t * 5.3;
      const halfWidth = 0.10 + t * 0.14;
      positions.push(x - halfWidth, 0, z, x + halfWidth, 0, z);
      if (i < 5) {
        const a = base + i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Visuals consume the resolved motors; player and camera transforms stay independent. */
export function AuthoredVehicles({ shadows = true }: { shadows?: boolean }) {
  const source = useLoader(GzipGLTFLoader, VEHICLES_URL).scene;
  const assets = useMemo(() => {
    const materials = new Map<THREE.Material, THREE.MeshLambertMaterial>();
    const root = new THREE.Group();
    root.name = "AuthoredVehicles";
    const buggy = requireNode(source, "Buggy").clone(true);
    const ferry = requireNode(source, "Ferry").clone(true);
    root.add(buggy, ferry);
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const original = Array.isArray(object.material) ? object.material[0] : object.material;
      let material = materials.get(original);
      if (!material) {
        material = new THREE.MeshLambertMaterial({
          name: original.name,
          color: original instanceof THREE.MeshStandardMaterial ? original.color.clone() : "#ffffff",
          vertexColors: true,
          side: original.side,
        });
        materials.set(original, material);
      }
      object.material = material;
      object.castShadow = shadows;
      object.receiveShadow = true;
    });
    const wheels = ["FL", "FR", "RL", "RR"].map((suffix) => {
      const node = requireNode(buggy, `BuggyWheel${suffix}`);
      return { node, bind: node.quaternion.clone() };
    });
    const steering = [requireNode(buggy, "BuggySteerFL"), requireNode(buggy, "BuggySteerFR")];
    const wakeMaterial = new THREE.MeshBasicMaterial({
      color: "#d6e5dc", transparent: true, opacity: 0, depthWrite: false,
    });
    const wake = new THREE.Mesh(wakeGeometry(), wakeMaterial);
    wake.name = "PassengerFerryWake";
    wake.userData.noShadow = true;
    wake.visible = false;
    root.add(wake);
    return {
      root, buggy, ferry, wheels, steering, wake, wakeMaterial, materials,
      body: requireNode(buggy, "BuggyBody"),
    };
  }, [source, shadows]);
  const animation = useRef({ time: 0, spin: new THREE.Quaternion() });

  const live = useRef<typeof assets | null>(null);
  useEffect(() => {
    live.current = assets;
    return () => {
      live.current = null;
      assets.materials.forEach((material) => material.dispose());
      assets.wake.geometry.dispose();
      assets.wakeMaterial.dispose();
    };
  }, [assets]);

  useFrame((_, delta) => {
    const view = live.current;
    if (!view) return;
    const b = travelPresentation.buggy;
    const f = travelPresentation.ferry;
    view.buggy.position.set(b.x, b.y, b.z);
    view.buggy.rotation.y = b.heading;
    view.ferry.position.set(f.x, f.y, f.z);
    view.ferry.rotation.y = f.heading;
    view.wake.position.set(f.x, f.y + 0.035, f.z);
    view.wake.rotation.y = f.heading;
    if (runtime.paused || runtime.simulationPaused || !runtime.playing) return;

    const dt = Math.min(delta, 0.05);
    const state = animation.current;
    state.time += dt;
    state.spin.setFromAxisAngle(AXLE, b.distance / WHEEL_RADIUS % (Math.PI * 2));
    for (const wheel of view.wheels) wheel.node.quaternion.copy(state.spin).multiply(wheel.bind);
    for (const steering of view.steering) steering.rotation.set(0, b.steering, 0);

    view.body.rotation.set(b.pitch, 0, b.lean);

    const opacity = travelState.ferry.moving ? 0.22 : 0;
    view.wakeMaterial.opacity = THREE.MathUtils.damp(view.wakeMaterial.opacity, opacity, 5, dt);
    view.wake.visible = view.wakeMaterial.opacity > 0.005;
    view.wake.scale.z = runtime.reducedMotion ? 1 : 1 + Math.sin(state.time * 2.5) * 0.018;
  });

  return <primitive object={assets.root} dispose={null} />;
}
