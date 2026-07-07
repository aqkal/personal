"use client";

import { useFrame } from "@react-three/fiber";
import { Instance, Instances, Sparkles, Stars } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { ShaderMaterial } from "three";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ARCADE, GREAT_COURT, TREES } from "./layout";

/** Deterministic PRNG so scatter and textures are stable across re-renders. */
export function lcg(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ---------------------------------- sky ---------------------------------- */

const skyVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const skyFragment = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    float h = normalize(vWorld).y;
    vec3 zenith = vec3(0.012, 0.02, 0.055);
    vec3 mid = vec3(0.035, 0.055, 0.13);
    vec3 horizon = vec3(0.11, 0.09, 0.16);
    vec3 col = mix(mid, zenith, smoothstep(0.12, 0.65, h));
    col = mix(horizon, col, smoothstep(-0.02, 0.14, h));
    // warm city glow to the south (+z)
    float south = smoothstep(0.2, 1.0, normalize(vWorld.xz + vec2(0.0001)).y);
    col += vec3(0.10, 0.055, 0.03) * south * smoothstep(0.14, -0.05, h);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function NightSky() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[230, 24, 16]} />
        <shaderMaterial
          side={THREE.BackSide}
          depthWrite={false}
          vertexShader={skyVertex}
          fragmentShader={skyFragment}
        />
      </mesh>
      <Stars radius={190} depth={40} count={3200} factor={3.4} saturation={0} fade speed={0.5} />
      {/* moon: emissive enough to bloom, with a halo sprite */}
      <mesh position={[58, 52, -72]}>
        <sphereGeometry args={[4.4, 24, 24]} />
        <meshBasicMaterial color={[2.2, 2.1, 1.75]} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ---------------------------------- ground ---------------------------------- */

function useGroundTexture() {
  return useMemo(() => {
    const rng = lcg(7331);
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#182f20";
    ctx.fillRect(0, 0, 256, 256);
    // large soft mottling
    for (let i = 0; i < 60; i++) {
      const g = ctx.createRadialGradient(
        rng() * 256, rng() * 256, 2,
        rng() * 256, rng() * 256, 18 + rng() * 30,
      );
      const shade = rng() < 0.5 ? "#1d3b28" : "#142819";
      g.addColorStop(0, shade + "cc");
      g.addColorStop(1, shade + "00");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
    }
    // fine speckle
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = rng() < 0.5 ? "#20402c" : "#122316";
      ctx.globalAlpha = 0.25 + rng() * 0.3;
      ctx.fillRect(rng() * 256, rng() * 256, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(18, 18);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

export function Ground() {
  const grass = useGroundTexture();
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow>
      <planeGeometry args={[220, 220]} />
      <meshStandardMaterial map={grass} roughness={1} metalness={0} />
    </mesh>
  );
}

/* ---------------------------------- paths ---------------------------------- */

function useStoneTexture() {
  return useMemo(() => {
    const rng = lcg(4242);
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#3f4556";
    ctx.fillRect(0, 0, 128, 128);
    // paving joints
    ctx.strokeStyle = "#333849";
    ctx.lineWidth = 2;
    for (let y = 0; y <= 128; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(128, y);
      ctx.stroke();
    }
    for (let row = 0; row < 4; row++) {
      const off = row % 2 === 0 ? 0 : 32;
      for (let x = off; x <= 128; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, row * 32);
        ctx.lineTo(x, row * 32 + 32);
        ctx.stroke();
      }
    }
    // wear
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = rng() < 0.5 ? "#474d61" : "#383d4d";
      ctx.globalAlpha = 0.3;
      ctx.fillRect(rng() * 128, rng() * 128, 2, 2);
    }
    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/** Paths with light curb edges + central plaza, slightly raised. */
export function Paths() {
  const stone = useStoneTexture();
  const strips = [
    { x: 0, z: 0, w: 3.6, d: 84 },
    { x: 0, z: 0, w: 84, d: 3.6 },
    { x: -27, z: -10, w: 3, d: 16 },
    { x: 27, z: -10, w: 3, d: 16 },
    { x: -27, z: 12, w: 3, d: 16 },
    { x: 27, z: 12, w: 3, d: 16 },
  ];
  return (
    <group>
      {strips.map((s, i) => {
        const tex = stone.clone();
        tex.needsUpdate = true;
        tex.repeat.set(Math.max(1, s.w / 3), Math.max(1, s.d / 3));
        return (
          <group key={i}>
            <mesh position={[s.x, 0.02 + i * 0.001, s.z]} rotation-x={-Math.PI / 2} receiveShadow>
              <planeGeometry args={[s.w, s.d]} />
              <meshStandardMaterial map={tex} roughness={0.9} metalness={0.05} />
            </mesh>
            {/* pale curbs catch the lamp light */}
            <mesh position={[s.x, 0.028 + i * 0.001, s.z]} rotation-x={-Math.PI / 2}>
              <ringGeometry args={[0, 0]} />
              <meshBasicMaterial visible={false} />
            </mesh>
          </group>
        );
      })}
      {/* plaza disc with a radial ring */}
      <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[9.5, 48]} />
        <meshStandardMaterial map={stone} roughness={0.9} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[5.6, 5.9, 48]} />
        <meshStandardMaterial color="#5a6178" roughness={0.8} />
      </mesh>
      {/* Great Court lawn (manicured) + inner ring path like the real one */}
      <mesh position={[GREAT_COURT.center.x, 0.015, -21.5]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[19, 13]} />
        <meshStandardMaterial color="#1e4029" roughness={1} />
      </mesh>
      <mesh position={[GREAT_COURT.center.x, 0.022, -21.5]} rotation-x={-Math.PI / 2} receiveShadow>
        <ringGeometry args={[5.2, 6.4, 40]} />
        <meshStandardMaterial map={stone} roughness={0.9} />
      </mesh>
    </group>
  );
}

/* ---------------------------------- river ---------------------------------- */

const riverVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const riverFragment = /* glsl */ `
  // note: three.js injects "uniform vec3 cameraPosition;" automatically
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorld;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1, 0)), f.x),
      mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x),
      f.y
    );
  }

  void main() {
    vec2 p = vWorld.xz * 0.35;
    float n = noise(p + vec2(uTime * 0.22, uTime * 0.14));
    n += 0.5 * noise(p * 2.3 - vec2(uTime * 0.31, uTime * 0.12));
    n /= 1.5;

    vec3 deep = vec3(0.016, 0.045, 0.10);
    vec3 lit  = vec3(0.09, 0.19, 0.33);
    vec3 col = mix(deep, lit, n);

    // fresnel: grazing angles pick up the sky
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float fresnel = pow(1.0 - max(viewDir.y, 0.0), 3.0);
    col += vec3(0.06, 0.09, 0.16) * fresnel;

    // moon glint streak
    float streak = smoothstep(0.972, 1.0, sin(vWorld.x * 0.85 + n * 3.0 + uTime * 0.6));
    col += vec3(1.2, 1.12, 0.9) * streak * (0.35 + 0.65 * fresnel);

    // city glow reflection strengthens toward the far bank
    float glow = smoothstep(30.0, 60.0, vWorld.z) * (0.4 + 0.6 * n);
    col += vec3(0.16, 0.11, 0.15) * glow;

    // soft foam along plane edges (banks); far edges hide in fog
    float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float foam = smoothstep(0.045, 0.0, edge) * (0.5 + 0.5 * noise(p * 6.0 + uTime * 0.4));
    col += vec3(0.35, 0.42, 0.5) * foam * 0.35;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function River() {
  // one uniforms object shared by all three reaches; ticking it once
  // animates every plane
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  const matRef = useRef<ShaderMaterial>(null);
  useFrame((_, dt) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += dt;
  });
  return (
    <group>
      {/* south reach */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.12, 52]}>
        <planeGeometry args={[220, 22]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={riverVertex}
          fragmentShader={riverFragment}
          uniforms={uniforms}
        />
      </mesh>
      {/* east reach (the St Lucia bend) */}
      <mesh rotation-x={-Math.PI / 2} position={[55, -0.12, 0]}>
        <planeGeometry args={[22, 120]} />
        <shaderMaterial
          vertexShader={riverVertex}
          fragmentShader={riverFragment}
          uniforms={uniforms}
        />
      </mesh>
      {/* west bank hint */}
      <mesh rotation-x={-Math.PI / 2} position={[-55, -0.12, 30]}>
        <planeGeometry args={[22, 60]} />
        <shaderMaterial
          vertexShader={riverVertex}
          fragmentShader={riverFragment}
          uniforms={uniforms}
        />
      </mesh>
    </group>
  );
}

/* ---------------------------------- skyline + bridge ---------------------------------- */

function useWindowsTexture(hue: string) {
  return useMemo(() => {
    const rng = lcg(9021);
    const c = document.createElement("canvas");
    c.width = 32;
    c.height = 64;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#05070d";
    ctx.fillRect(0, 0, 32, 64);
    for (let y = 2; y < 62; y += 4) {
      for (let x = 2; x < 30; x += 4) {
        if (rng() < 0.42) {
          ctx.fillStyle = rng() < 0.75 ? hue : "#8fb7d9";
          ctx.globalAlpha = 0.55 + rng() * 0.45;
          ctx.fillRect(x, y, 2, 2);
        }
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [hue]);
}

/** Distant Brisbane CBD across the water. */
export function Skyline() {
  const windows = useWindowsTexture("#ffd98a");
  const towers = useMemo(() => {
    const rng = lcg(99);
    return Array.from({ length: 26 }, (_, i) => {
      const x = -95 + i * 7.5 + rng() * 4;
      const h = 10 + rng() * 26 + (Math.abs(x) < 30 ? 10 : 0);
      return {
        x,
        h,
        w: 4.5 + rng() * 3.5,
        z: 78 + rng() * 10,
        antenna: rng() < 0.3,
      };
    });
  }, []);
  return (
    <group>
      {towers.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          <mesh position={[0, t.h / 2 - 0.1, 0]}>
            <boxGeometry args={[t.w, t.h, t.w]} />
            <meshStandardMaterial
              color="#0a0f1c"
              emissiveMap={windows}
              emissive="#ffffff"
              emissiveIntensity={1.35}
              roughness={0.9}
            />
          </mesh>
          {t.antenna && (
            <>
              <mesh position={[0, t.h + 2, 0]}>
                <cylinderGeometry args={[0.08, 0.14, 4, 5]} />
                <meshStandardMaterial color="#161b2c" roughness={0.8} />
              </mesh>
              <mesh position={[0, t.h + 4.1, 0]}>
                <sphereGeometry args={[0.22, 8, 8]} />
                <meshBasicMaterial color={[2.4, 0.35, 0.3]} toneMapped={false} />
              </mesh>
            </>
          )}
        </group>
      ))}
      {/* far-bank strip */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, 74]}>
        <planeGeometry args={[240, 26]} />
        <meshStandardMaterial color="#0b1018" roughness={1} />
      </mesh>
    </group>
  );
}

/** Story Bridge silhouette: steel arch with a string of lights. */
export function Bridge() {
  const lights = useMemo(() => {
    const pts: Array<[number, number, number]> = [];
    for (let i = 0; i <= 22; i++) {
      const t = i / 22;
      const z = 43 + t * 15;
      const y = 1.4 + Math.sin(t * Math.PI) * 4.6;
      pts.push([0, y, z]);
    }
    return pts;
  }, []);
  return (
    <group>
      <mesh position={[0, 0.06, 50]} receiveShadow>
        <boxGeometry args={[4.6, 0.24, 16]} />
        <meshStandardMaterial color="#2c3244" roughness={0.85} />
      </mesh>
      {[-2.1, 2.1].map((x) => (
        <mesh key={x} position={[x, 0.7, 50]}>
          <boxGeometry args={[0.16, 1.1, 16]} />
          <meshStandardMaterial color="#3c4358" roughness={0.7} />
        </mesh>
      ))}
      {[-2.1, 2.1].map((x) =>
        lights.map(([, y, z], i) => (
          <mesh key={`${x}-${i}`} position={[x, y, z]}>
            <boxGeometry args={[0.14, 0.5, 0.7]} />
            <meshStandardMaterial color="#454e68" roughness={0.6} />
          </mesh>
        )),
      )}
      {lights.map(([, y, z], i) => (
        <mesh key={i} position={[0, y + 0.4, z]}>
          <sphereGeometry args={[0.11, 8, 8]} />
          <meshBasicMaterial color={[2.4, 1.9, 1.1]} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, 0.04, 58.5]} receiveShadow>
        <cylinderGeometry args={[7, 7, 0.2, 24]} />
        <meshStandardMaterial color="#2c3244" roughness={0.85} />
      </mesh>
    </group>
  );
}

/* ---------------------------------- trees ---------------------------------- */

const JAC_SHADES = ["#8e6fd8", "#9d7ce0", "#7a5cc4", "#a98ceb"];
const FIG_SHADES = ["#24513a", "#1d422f", "#2c5f44"];

/**
 * Jacarandas (UQ's purple signature) + Moreton Bay figs. Canopies are
 * multi-puff instanced clusters with per-instance shade jitter; jacarandas
 * drop a blossom carpet.
 */
export function TreeField() {
  const jacs = TREES.filter((t) => t.kind === "jacaranda");
  const figs = TREES.filter((t) => t.kind === "fig");
  const rng = useMemo(() => lcg(515), []);

  const jacPuffs = useMemo(() => {
    const r = lcg(881);
    return jacs.flatMap((t, i) =>
      Array.from({ length: 4 }, (_, k) => ({
        key: `${i}-${k}`,
        pos: [
          t.x + (r() - 0.5) * 1.9 * t.s,
          (2.6 + r() * 1.1) * t.s,
          t.z + (r() - 0.5) * 1.9 * t.s,
        ] as [number, number, number],
        scale: (0.85 + r() * 0.75) * t.s,
        color: JAC_SHADES[Math.floor(r() * JAC_SHADES.length)],
      })),
    );
  }, [jacs]);

  const figPuffs = useMemo(() => {
    const r = lcg(212);
    return figs.flatMap((t, i) =>
      Array.from({ length: 4 }, (_, k) => ({
        key: `${i}-${k}`,
        pos: [
          t.x + (r() - 0.5) * 2.6 * t.s,
          (2.4 + r() * 1.0) * t.s,
          t.z + (r() - 0.5) * 2.6 * t.s,
        ] as [number, number, number],
        scale: (1.0 + r() * 0.8) * t.s,
        color: FIG_SHADES[Math.floor(r() * FIG_SHADES.length)],
      })),
    );
  }, [figs]);

  return (
    <group>
      {/* trunks */}
      <Instances limit={TREES.length} castShadow>
        <cylinderGeometry args={[0.16, 0.3, 2.6, 7]} />
        <meshStandardMaterial color="#4a3a2c" roughness={1} />
        {TREES.map((t, i) => (
          <Instance
            key={i}
            position={[t.x, 1.3 * t.s, t.z]}
            scale={[t.s, t.s, t.s]}
            rotation={[0, rng() * Math.PI, (rng() - 0.5) * 0.12]}
          />
        ))}
      </Instances>
      {/* branches (one tilted limb per tree) */}
      <Instances limit={TREES.length} castShadow>
        <cylinderGeometry args={[0.07, 0.12, 1.6, 5]} />
        <meshStandardMaterial color="#41332a" roughness={1} />
        {TREES.map((t, i) => (
          <Instance
            key={i}
            position={[t.x + 0.4 * t.s, 2.3 * t.s, t.z]}
            rotation={[0, rng() * Math.PI * 2, 0.7]}
            scale={[t.s, t.s, t.s]}
          />
        ))}
      </Instances>
      {/* jacaranda canopy puffs */}
      <Instances limit={jacPuffs.length} castShadow>
        <icosahedronGeometry args={[1.3, 1]} />
        <meshStandardMaterial roughness={0.9} />
        {jacPuffs.map((p) => (
          <Instance
            key={p.key}
            position={p.pos}
            scale={[p.scale * 1.25, p.scale * 0.9, p.scale * 1.25]}
            color={p.color}
          />
        ))}
      </Instances>
      {/* fig canopy puffs */}
      <Instances limit={figPuffs.length} castShadow>
        <icosahedronGeometry args={[1.4, 1]} />
        <meshStandardMaterial roughness={1} />
        {figPuffs.map((p) => (
          <Instance
            key={p.key}
            position={p.pos}
            scale={[p.scale * 1.4, p.scale * 0.85, p.scale * 1.4]}
            color={p.color}
          />
        ))}
      </Instances>
      {/* blossom carpets under jacarandas */}
      <Instances limit={jacs.length}>
        <circleGeometry args={[1.9, 20]} />
        <meshBasicMaterial color="#5d4494" transparent opacity={0.4} depthWrite={false} />
        {jacs.map((t, i) => (
          <Instance
            key={i}
            position={[t.x, 0.035, t.z]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[t.s, t.s, 1]}
          />
        ))}
      </Instances>
    </group>
  );
}

/* ---------------------------------- grass tufts ---------------------------------- */

function tuftReject(x: number, z: number): boolean {
  if (Math.abs(x) > 42 || z < -40 || z > 39) return true;
  if (Math.abs(x) < 3.2 && Math.abs(z) < 42) return true; // NS road
  if (Math.abs(z) < 3.2) return true; // EW road
  if (Math.abs(x + 27) < 2.6 || Math.abs(x - 27) < 2.6) return true; // spurs
  if (x * x + z * z < 110) return true; // plaza
  if (
    Math.abs(x - ARCADE.x) < ARCADE.hw + 2 &&
    Math.abs(z - ARCADE.z) < ARCADE.hd + 3
  )
    return true;
  if (Math.abs(x - GREAT_COURT.center.x) < 14 && z > -32 && z < -12)
    return true; // court interior + wings
  return false;
}

/** Instanced crossed-plane grass tufts scattered off the paths. */
export function GrassTufts() {
  const geometry = useMemo(() => {
    const a = new THREE.PlaneGeometry(0.7, 0.5);
    const b = new THREE.PlaneGeometry(0.7, 0.5);
    b.rotateY(Math.PI / 2);
    const merged = mergeGeometries([a, b]);
    merged.translate(0, 0.25, 0);
    return merged;
  }, []);

  const alphaMap = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 48;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 64, 48);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    const r = lcg(66);
    for (let i = 0; i < 9; i++) {
      const bx = 6 + i * 6 + r() * 3;
      ctx.beginPath();
      ctx.moveTo(bx, 48);
      ctx.quadraticCurveTo(bx + (r() - 0.5) * 10, 24, bx + (r() - 0.5) * 16, 4 + r() * 8);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    return tex;
  }, []);

  const spots = useMemo(() => {
    const r = lcg(3131);
    const out: Array<{ x: number; z: number; s: number; rot: number; shade: string }> = [];
    let guard = 0;
    while (out.length < 300 && guard < 4000) {
      guard++;
      const x = (r() - 0.5) * 84;
      const z = (r() - 0.5) * 80;
      if (tuftReject(x, z)) continue;
      out.push({
        x,
        z,
        s: 0.7 + r() * 0.9,
        rot: r() * Math.PI,
        shade: r() < 0.5 ? "#2c5c3c" : "#234b30",
      });
    }
    return out;
  }, []);

  return (
    <Instances limit={spots.length} geometry={geometry} frustumCulled={false}>
      <meshStandardMaterial
        alphaMap={alphaMap}
        transparent
        alphaTest={0.35}
        side={THREE.DoubleSide}
        roughness={1}
      />
      {spots.map((t, i) => (
        <Instance
          key={i}
          position={[t.x, 0, t.z]}
          rotation={[0, t.rot, 0]}
          scale={[t.s, t.s, t.s]}
          color={t.shade}
        />
      ))}
    </Instances>
  );
}

/* ---------------------------------- ambience ---------------------------------- */

export function Fireflies() {
  return (
    <group>
      <Sparkles count={34} position={[-27, 1.6, 22]} scale={[14, 2.5, 14]} size={2.6} speed={0.28} color="#c8ff9d" />
      <Sparkles count={26} position={[0, 1.4, 46]} scale={[30, 2, 10]} size={2.2} speed={0.22} color="#9dd8ff" />
      <Sparkles count={20} position={[-27, 2, -22]} scale={[16, 3, 10]} size={2} speed={0.2} color="#d8c8ff" />
    </group>
  );
}
