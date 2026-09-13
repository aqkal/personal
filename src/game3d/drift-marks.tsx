"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CAMPUS_LAKE, groundHeight } from "./layout";
import { runtime, travelState } from "./state";
import { travelPresentation, type TransportPose } from "./travel-presentation";
import { isMainland } from "./terrain";
import { onBuggyRoad } from "./travel-layout";
import { SKID_LIFETIME, SkidTrailBuffer } from "./skid-trails";
import { queueSkidUpload } from "./skid-uploads";

const ROAD_INK = new THREE.Color("#292b2b").toArray();
const TURF_INK = new THREE.Color("#596247").toArray();

/** One bounded, unlit draw for both vehicles. No particles or extra lights. */
export function DriftMarks() {
  const mesh = useRef<THREE.Mesh>(null);
  const clock = useRef(0);
  const data = useMemo(() => {
    const tracks = new SkidTrailBuffer();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(tracks.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("born", new THREE.BufferAttribute(tracks.born, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("strength", new THREE.BufferAttribute(tracks.strengths, 1).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("ink", new THREE.BufferAttribute(tracks.colors, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute("uv", new THREE.BufferAttribute(tracks.uv, 2));
    geometry.setDrawRange(0, 0);
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      uniforms: { time: { value: 0 } },
      vertexShader: `
        attribute float born;
        attribute float strength;
        attribute vec3 ink;
        varying float markBorn;
        varying float markStrength;
        varying vec3 markInk;
        varying vec2 markUv;
        void main() {
          markBorn = born; markStrength = strength; markInk = ink; markUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying float markBorn;
        varying float markStrength;
        varying vec3 markInk;
        varying vec2 markUv;
        void main() {
          float fade = 1.0 - smoothstep(10.0, ${SKID_LIFETIME.toFixed(1)}, time - markBorn);
          float edges = smoothstep(0.0, 0.15, markUv.x) * (1.0 - smoothstep(0.85, 1.0, markUv.x));
          float tread = 0.88 + 0.12 * sin(markUv.x * 42.0);
          float alpha = 0.62 * markStrength * fade * edges * tread;
          if (alpha < 0.005) discard;
          gl_FragColor = vec4(markInk, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
    return { tracks, geometry, material };
  }, []);

  const live = useRef<typeof data | null>(null);
  const pendingDisposal = useRef(new Map<typeof data, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const timers = pendingDisposal.current;
    const pending = timers.get(data);
    if (pending !== undefined) { clearTimeout(pending); timers.delete(data); }
    live.current = data;
    return () => {
      live.current = null;
      // Keep the reusable buffers alive during development effect replay.
      timers.set(data, setTimeout(() => {
        data.geometry.dispose(); data.material.dispose(); timers.delete(data);
      }, 0));
    };
  }, [data]);

  useFrame((_, dt) => {
    const resources = live.current;
    if (!resources) return;
    const { tracks, geometry, material } = resources;
    if (!runtime.playing || runtime.paused || runtime.simulationPaused || !runtime.focused) {
      tracks.end();
      return;
    }
    clock.current += Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.05)) : 0;
    const time = clock.current, version = tracks.version, first = tracks.cursor;
    material.uniforms.time.value = time;

    const contact = (track: number, pose: TransportPose, x: number, z: number, width: number, strength: number) => {
      const c = Math.cos(pose.heading), s = Math.sin(pose.heading);
      const px = pose.x + x * c + z * s, pz = pose.z - x * s + z * c;
      const y = groundHeight(px, pz);
      const lake = ((px - CAMPUS_LAKE.x) / CAMPUS_LAKE.rx) ** 2 + ((pz - CAMPUS_LAKE.z) / CAMPUS_LAKE.rz) ** 2 < 1.04;
      if (!isMainland(px, pz, 0.1) || lake || Math.abs(pose.y - y) > 0.14) { tracks.end(track); return; }
      const ink = onBuggyRoad(px, pz) || y > 0.1 ? ROAD_INK : TURF_INK;
      tracks.stamp(track, px, y + 0.052, pz, width, time, strength, ink);
    };

    if (travelState.mode === "driving" && travelState.buggy.drifting) {
      const strength = 0.3 + travelState.buggy.drift * 0.7;
      // Authored rear wheel centres in vehicles.py: x +/-0.82, z -0.85.
      contact(0, travelPresentation.buggy, -0.82, -0.85, 0.22, strength);
      contact(1, travelPresentation.buggy, 0.82, -0.85, 0.22, strength);
    } else { tracks.end(0); tracks.end(1); }
    if (travelState.mode === "scooter" && travelState.scooter.drifting) {
      contact(2, travelPresentation.scooter, 0, -0.64, 0.105, 0.3 + travelState.scooter.drift * 0.7);
    } else tracks.end(2);

    if (tracks.version !== version) {
      queueSkidUpload(geometry, first, tracks.version - version, tracks.capacity);
      geometry.setDrawRange(0, tracks.count * 6);
    }
    if (mesh.current) mesh.current.visible = tracks.count > 0 && time - tracks.lastWrite < SKID_LIFETIME;
  });

  // The initial empty draw range still lets the normal world warm-up compile
  // this shader, rather than compiling it in the middle of the first drift.
  return <mesh ref={mesh} name="DriftTyreMarks" geometry={data.geometry} material={data.material}
    frustumCulled={false} renderOrder={1} userData={{ noShadow: true }} />;
}
