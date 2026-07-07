"use client";

import { useFrame } from "@react-three/fiber";
import { Instance, Instances, Sparkles, Stars } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { TREES } from "./layout";

/** Deterministic PRNG so textures are stable across re-renders. */
export function lcg(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ---------------------------------- ground ---------------------------------- */

function useNoiseTexture(base: string, spot: string, alpha = 0.16) {
  return useMemo(() => {
    const rng = lcg(7331);
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = spot;
    ctx.globalAlpha = alpha;
    for (let i = 0; i < 340; i++) {
      const x = rng() * 128;
      const y = rng() * 128;
      const r = 1 + rng() * 3.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(26, 26);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [base, spot, alpha]);
}

export function Ground() {
  const grass = useNoiseTexture("#17301f", "#1e3d28");
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} receiveShadow>
      <planeGeometry args={[220, 220]} />
      <meshStandardMaterial map={grass} roughness={1} metalness={0} />
    </mesh>
  );
}

/** Paths + central plaza, slightly raised so they catch lamp light. */
export function Paths() {
  const stone = useNoiseTexture("#3d4354", "#495064", 0.3);
  const mat = (
    <meshStandardMaterial map={stone} roughness={0.9} metalness={0.05} />
  );
  return (
    <group>
      {/* north-south avenue */}
      <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[3.6, 84]} />
        {mat}
      </mesh>
      {/* east-west avenue */}
      <mesh position={[0, 0.021, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[84, 3.6]} />
        {mat}
      </mesh>
      {/* spurs into zones */}
      {[
        { x: -27, z: -10, w: 3, d: 16 },
        { x: 27, z: -10, w: 3, d: 16 },
        { x: -27, z: 12, w: 3, d: 16 },
        { x: 27, z: 12, w: 3, d: 16 },
      ].map((s, i) => (
        <mesh
          key={i}
          position={[s.x, 0.02, s.z]}
          rotation-x={-Math.PI / 2}
          receiveShadow
        >
          <planeGeometry args={[s.w, s.d]} />
          {mat}
        </mesh>
      ))}
      {/* plaza disc */}
      <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[9.5, 48]} />
        {mat}
      </mesh>
      {/* Great Court lawn (lighter, manicured) */}
      <mesh position={[-27, 0.015, -22]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[18, 12]} />
        <meshStandardMaterial color="#1d3b26" roughness={1} />
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
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorld;

  float wave(vec2 p, float t) {
    return sin(p.x * 0.55 + t * 0.8) * sin(p.y * 0.7 - t * 0.6)
         + 0.5 * sin(p.x * 1.7 - t * 1.1) * sin(p.y * 1.3 + t * 0.9);
  }

  void main() {
    float w = wave(vWorld.xz, uTime);
    vec3 deep = vec3(0.023, 0.055, 0.11);
    vec3 lit  = vec3(0.10, 0.20, 0.34);
    vec3 col = mix(deep, lit, 0.5 + 0.5 * w);

    // moon glint streak (moon sits high in the south-east)
    float streak = smoothstep(0.985, 1.0, sin(vWorld.x * 0.9 + w * 2.2 + uTime * 0.7));
    col += vec3(1.15, 1.1, 0.9) * streak * 0.9;

    // city glow reflection near the far bank
    float glow = smoothstep(10.0, 42.0, vWorld.z) * (0.5 + 0.5 * w);
    col += vec3(0.14, 0.10, 0.16) * glow;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function River() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.uTime.value += dt;
  });
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  return (
    <group>
      {/* south reach */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.12, 52]}>
        <planeGeometry args={[220, 22]} />
        <shaderMaterial
          ref={mat}
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

/* ---------------------------------- sky ---------------------------------- */

export function NightSky() {
  return (
    <group>
      <Stars radius={190} depth={50} count={2600} factor={3.2} saturation={0} fade speed={0.5} />
      {/* moon: emissive enough to bloom */}
      <mesh position={[58, 52, -72]}>
        <sphereGeometry args={[4.4, 24, 24]} />
        <meshBasicMaterial color={[2.2, 2.1, 1.75]} toneMapped={false} />
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
    const rng = (() => {
      let s = 99;
      return () => {
        s = (s * 16807) % 2147483647;
        return s / 2147483647;
      };
    })();
    return Array.from({ length: 26 }, (_, i) => {
      const x = -95 + i * 7.5 + rng() * 4;
      const h = 10 + rng() * 26 + (Math.abs(x) < 30 ? 10 : 0);
      return { x, h, w: 4.5 + rng() * 3.5, z: 78 + rng() * 10 };
    });
  }, []);
  return (
    <group>
      {towers.map((t, i) => (
        <mesh key={i} position={[t.x, t.h / 2 - 0.1, t.z]}>
          <boxGeometry args={[t.w, t.h, t.w]} />
          <meshStandardMaterial
            color="#0a0f1c"
            emissiveMap={windows}
            emissive="#ffffff"
            emissiveIntensity={1.35}
            roughness={0.9}
          />
        </mesh>
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
      {/* deck */}
      <mesh position={[0, 0.06, 50]} receiveShadow>
        <boxGeometry args={[4.6, 0.24, 16]} />
        <meshStandardMaterial color="#2c3244" roughness={0.85} />
      </mesh>
      {/* rails */}
      {[-2.1, 2.1].map((x) => (
        <mesh key={x} position={[x, 0.7, 50]}>
          <boxGeometry args={[0.16, 1.1, 16]} />
          <meshStandardMaterial color="#3c4358" roughness={0.7} />
        </mesh>
      ))}
      {/* arches */}
      {[-2.1, 2.1].map((x) =>
        lights.map(([, y, z], i) => (
          <mesh key={`${x}-${i}`} position={[x, y, z]}>
            <boxGeometry args={[0.14, 0.5, 0.7]} />
            <meshStandardMaterial color="#454e68" roughness={0.6} />
          </mesh>
        )),
      )}
      {/* light string (blooms) */}
      {lights.map(([, y, z], i) => (
        <mesh key={i} position={[0, y + 0.4, z]}>
          <sphereGeometry args={[0.11, 8, 8]} />
          <meshBasicMaterial color={[2.4, 1.9, 1.1]} toneMapped={false} />
        </mesh>
      ))}
      {/* lookout deck */}
      <mesh position={[0, 0.04, 58.5]} receiveShadow>
        <cylinderGeometry args={[7, 7, 0.2, 24]} />
        <meshStandardMaterial color="#2c3244" roughness={0.85} />
      </mesh>
    </group>
  );
}

/* ---------------------------------- trees ---------------------------------- */

/**
 * Jacarandas (UQ's purple signature) + Moreton Bay figs, instanced:
 * 2 draw calls for every trunk + canopy in the scene.
 */
export function TreeField() {
  const jacs = TREES.filter((t) => t.kind === "jacaranda");
  const figs = TREES.filter((t) => t.kind === "fig");
  return (
    <group>
      {/* trunks (shared) */}
      <Instances limit={TREES.length} castShadow>
        <cylinderGeometry args={[0.16, 0.28, 2.4, 7]} />
        <meshStandardMaterial color="#4a3a2c" roughness={1} />
        {TREES.map((t, i) => (
          <Instance
            key={i}
            position={[t.x, 1.2 * t.s, t.z]}
            scale={[t.s, t.s, t.s]}
          />
        ))}
      </Instances>
      {/* jacaranda canopies */}
      <Instances limit={jacs.length * 2} castShadow>
        <icosahedronGeometry args={[1.5, 1]} />
        <meshStandardMaterial color="#8e6fd8" roughness={0.95} />
        {jacs.flatMap((t, i) => [
          <Instance
            key={`a${i}`}
            position={[t.x, 2.9 * t.s, t.z]}
            scale={[1.5 * t.s, 1.1 * t.s, 1.5 * t.s]}
          />,
          <Instance
            key={`b${i}`}
            position={[t.x + 0.7 * t.s, 2.3 * t.s, t.z + 0.3 * t.s]}
            scale={[0.9 * t.s, 0.7 * t.s, 0.9 * t.s]}
          />,
        ])}
      </Instances>
      {/* fig canopies */}
      <Instances limit={figs.length * 2} castShadow>
        <icosahedronGeometry args={[1.5, 1]} />
        <meshStandardMaterial color="#24513a" roughness={1} />
        {figs.flatMap((t, i) => [
          <Instance
            key={`a${i}`}
            position={[t.x, 2.7 * t.s, t.z]}
            scale={[1.7 * t.s, 1.15 * t.s, 1.7 * t.s]}
          />,
          <Instance
            key={`b${i}`}
            position={[t.x - 0.8 * t.s, 2.1 * t.s, t.z - 0.3 * t.s]}
            scale={[1 * t.s, 0.75 * t.s, 1 * t.s]}
          />,
        ])}
      </Instances>
    </group>
  );
}

/* ---------------------------------- ambience ---------------------------------- */

export function Fireflies() {
  return (
    <group>
      <Sparkles
        count={34}
        position={[-27, 1.6, 22]}
        scale={[14, 2.5, 14]}
        size={2.6}
        speed={0.28}
        color="#c8ff9d"
      />
      <Sparkles
        count={26}
        position={[0, 1.4, 46]}
        scale={[30, 2, 10]}
        size={2.2}
        speed={0.22}
        color="#9dd8ff"
      />
      <Sparkles
        count={20}
        position={[-27, 2, -22]}
        scale={[16, 3, 10]}
        size={2}
        speed={0.2}
        color="#d8c8ff"
      />
    </group>
  );
}
