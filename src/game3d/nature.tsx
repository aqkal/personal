"use client";

import { useFrame } from "@react-three/fiber";
import { Instance, Instances, Sparkles } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { ShaderMaterial } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ARCADE, GREAT_COURT, TREES } from "./layout";
import { TOON } from "./materials";

/**
 * Bright Brisbane day. Everything here is built for speed first: no shadow
 * maps, no postprocessing, blob shadows for grounding, and one draw call per
 * repeated thing (trees, clouds, bridge parts, skyline).
 */

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
    vec3 dir = normalize(vWorld);
    float h = dir.y;
    vec3 zenith = vec3(0.20, 0.46, 0.85);
    vec3 mid = vec3(0.47, 0.71, 0.94);
    vec3 horizon = vec3(0.84, 0.92, 0.97);
    vec3 col = mix(mid, zenith, smoothstep(0.15, 0.7, h));
    col = mix(horizon, col, smoothstep(-0.02, 0.2, h));
    // warm sun halo (sun sits high in the north-east)
    vec3 sunDir = normalize(vec3(0.55, 0.62, -0.56));
    float sun = pow(max(dot(dir, sunDir), 0.0), 220.0);
    float halo = pow(max(dot(dir, sunDir), 0.0), 8.0);
    col += vec3(1.0, 0.95, 0.8) * sun * 2.2;
    col += vec3(0.35, 0.3, 0.18) * halo * 0.4;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function SkyDome() {
  return (
    <mesh>
      <sphereGeometry args={[230, 24, 16]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        vertexShader={skyVertex}
        fragmentShader={skyFragment}
      />
    </mesh>
  );
}

/** Puffy flat-shaded clouds: one merged geometry, one instanced draw call. */
export function Clouds() {
  const geometry = useMemo(() => {
    const puffs = [
      new THREE.IcosahedronGeometry(2.2, 1),
      new THREE.IcosahedronGeometry(1.7, 1).translate(2.2, -0.3, 0.4),
      new THREE.IcosahedronGeometry(1.5, 1).translate(-2.1, -0.4, -0.3),
      new THREE.IcosahedronGeometry(1.2, 1).translate(0.6, 0.9, -0.6),
    ];
    const merged = mergeGeometries(puffs);
    merged.scale(1, 0.62, 1);
    return merged;
  }, []);

  const clouds = useMemo(() => {
    const r = lcg(777);
    return Array.from({ length: 11 }, () => ({
      x: (r() - 0.5) * 220,
      y: 34 + r() * 22,
      z: (r() - 0.5) * 220,
      s: 1.1 + r() * 2.1,
      rot: r() * Math.PI,
      speed: 0.4 + r() * 0.5,
    }));
  }, []);

  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    g.children.forEach((child, i) => {
      child.position.x += clouds[i % clouds.length].speed * dt;
      if (child.position.x > 130) child.position.x = -130;
    });
  });

  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <mesh
          key={i}
          geometry={geometry}
          position={[c.x, c.y, c.z]}
          rotation-y={c.rot}
          scale={c.s}
        >
          <meshToonMaterial gradientMap={TOON} color="#ffffff" emissive="#e8f2fb" emissiveIntensity={0.55} />
        </mesh>
      ))}
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
    ctx.fillStyle = "#5aa860";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 60; i++) {
      const g = ctx.createRadialGradient(
        rng() * 256, rng() * 256, 2,
        rng() * 256, rng() * 256, 18 + rng() * 30,
      );
      const shade = rng() < 0.5 ? "#63b569" : "#4f9a55";
      g.addColorStop(0, shade + "cc");
      g.addColorStop(1, shade + "00");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
    }
    for (let i = 0; i < 1200; i++) {
      ctx.fillStyle = rng() < 0.5 ? "#6ec573" : "#46904d";
      ctx.globalAlpha = 0.22 + rng() * 0.25;
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
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]}>
      <planeGeometry args={[220, 220]} />
      <meshToonMaterial gradientMap={TOON} map={grass} />
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
    ctx.fillStyle = "#cfc5b4";
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = "#b6ab97";
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
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = rng() < 0.5 ? "#d8cfc0" : "#c2b7a3";
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

function useLawnStripes() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 8;
    const ctx = c.getContext("2d")!;
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#57ab5f" : "#4b9a54";
      ctx.fillRect(i * 8, 0, 8, 8);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1.6, 1);
    tex.magFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/** Paved paths + central plaza. */
export function Paths() {
  const stone = useStoneTexture();
  const lawnStripes = useLawnStripes();
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
          <mesh
            key={i}
            position={[s.x, 0.02 + i * 0.001, s.z]}
            rotation-x={-Math.PI / 2}
          >
            <planeGeometry args={[s.w, s.d]} />
            <meshToonMaterial gradientMap={TOON} map={tex} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[9.5, 48]} />
        <meshToonMaterial gradientMap={TOON} map={stone} />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[5.6, 5.9, 48]} />
        <meshToonMaterial gradientMap={TOON} color="#b3a888" />
      </mesh>
      {/* Great Court lawn (mowing stripes) + inner ring path */}
      <mesh position={[GREAT_COURT.center.x, 0.015, -21.5]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[19, 13]} />
        <meshToonMaterial gradientMap={TOON} map={lawnStripes} />
      </mesh>
      <mesh position={[GREAT_COURT.center.x, 0.022, -21.5]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[5.2, 6.4, 40]} />
        <meshToonMaterial gradientMap={TOON} map={stone} />
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

    vec3 deep = vec3(0.13, 0.38, 0.62);
    vec3 lit  = vec3(0.35, 0.62, 0.84);
    vec3 col = mix(deep, lit, n);

    // fresnel: grazing angles pick up the bright sky
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float fresnel = pow(1.0 - max(viewDir.y, 0.0), 3.0);
    col += vec3(0.32, 0.4, 0.45) * fresnel;

    // sun sparkle
    float sparkle = smoothstep(0.965, 1.0, sin(vWorld.x * 0.9 + n * 3.4 + uTime * 0.8));
    col += vec3(1.0, 0.97, 0.85) * sparkle * (0.35 + 0.5 * fresnel);

    // soft foam along the banks
    float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float foam = smoothstep(0.045, 0.0, edge) * (0.5 + 0.5 * noise(p * 6.0 + uTime * 0.4));
    col += vec3(0.85, 0.9, 0.94) * foam * 0.45;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function River() {
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  const matRef = useRef<ShaderMaterial>(null);
  useFrame((_, dt) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += dt;
  });
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.12, 52]}>
        <planeGeometry args={[220, 22]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={riverVertex}
          fragmentShader={riverFragment}
          uniforms={uniforms}
        />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[55, -0.12, 0]}>
        <planeGeometry args={[22, 120]} />
        <shaderMaterial vertexShader={riverVertex} fragmentShader={riverFragment} uniforms={uniforms} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[-55, -0.12, 30]}>
        <planeGeometry args={[22, 60]} />
        <shaderMaterial vertexShader={riverVertex} fragmentShader={riverFragment} uniforms={uniforms} />
      </mesh>
    </group>
  );
}

/* ---------------------------------- skyline + bridge ---------------------------------- */

/** Distant Brisbane CBD in daylight haze: three instanced draw calls total. */
export function Skyline() {
  const towers = useMemo(() => {
    const rng = lcg(99);
    return Array.from({ length: 26 }, (_, i) => {
      const x = -95 + i * 7.5 + rng() * 4;
      const h = 10 + rng() * 26 + (Math.abs(x) < 30 ? 10 : 0);
      const shade = 0.72 + rng() * 0.2;
      return {
        x,
        h,
        w: 4.5 + rng() * 3.5,
        z: 78 + rng() * 10,
        antenna: rng() < 0.3,
        color: new THREE.Color(shade * 0.78, shade * 0.85, shade * 0.95),
      };
    });
  }, []);
  const withAntenna = towers.filter((t) => t.antenna);
  return (
    <group>
      <Instances limit={towers.length}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial gradientMap={TOON} />
        {towers.map((t, i) => (
          <Instance
            key={i}
            position={[t.x, t.h / 2 - 0.1, t.z]}
            scale={[t.w, t.h, t.w]}
            color={t.color}
          />
        ))}
      </Instances>
      <Instances limit={withAntenna.length}>
        <cylinderGeometry args={[0.08, 0.14, 4, 5]} />
        <meshToonMaterial gradientMap={TOON} color="#8b96ad" />
        {withAntenna.map((t, i) => (
          <Instance key={i} position={[t.x, t.h + 2, t.z]} />
        ))}
      </Instances>
      {/* far-bank strip */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, 74]}>
        <planeGeometry args={[240, 26]} />
        <meshToonMaterial gradientMap={TOON} color="#9cb89a" />
      </mesh>
    </group>
  );
}

/** Story Bridge silhouette: instanced steelwork, a handful of draw calls. */
export function Bridge() {
  const arch = useMemo(() => {
    const pts: Array<{ y: number; z: number }> = [];
    for (let i = 0; i <= 22; i++) {
      const t = i / 22;
      pts.push({ z: 43 + t * 15, y: 1.4 + Math.sin(t * Math.PI) * 4.6 });
    }
    return pts;
  }, []);
  return (
    <group>
      <mesh position={[0, 0.06, 50]}>
        <boxGeometry args={[4.6, 0.24, 16]} />
        <meshToonMaterial gradientMap={TOON} color="#8d9aae" />
      </mesh>
      {[-2.1, 2.1].map((x) => (
        <mesh key={x} position={[x, 0.7, 50]}>
          <boxGeometry args={[0.16, 1.1, 16]} />
          <meshToonMaterial gradientMap={TOON} color="#77839a" />
        </mesh>
      ))}
      {/* steel arch segments: one instanced call for both sides */}
      <Instances limit={arch.length * 2}>
        <boxGeometry args={[0.14, 0.5, 0.7]} />
        <meshToonMaterial gradientMap={TOON} color="#95a2b8" />
        {[-2.1, 2.1].flatMap((x) =>
          arch.map((p, i) => (
            <Instance key={`${x}-${i}`} position={[x, p.y, p.z]} />
          )),
        )}
      </Instances>
      {/* lookout deck */}
      <mesh position={[0, 0.04, 58.5]}>
        <cylinderGeometry args={[7, 7, 0.2, 24]} />
        <meshToonMaterial gradientMap={TOON} color="#aab4c4" />
      </mesh>
    </group>
  );
}

/* ---------------------------------- trees ---------------------------------- */

const JAC_SHADES = ["#9d7ce0", "#a98ceb", "#8a68d4", "#b598f2"];
const FIG_SHADES = ["#3f7d4a", "#356e40", "#4a8f55"];

// pure derivations of the module-constant TREES: computed once at load
const JACS = TREES.filter((t) => t.kind === "jacaranda");

const TRUNK_ROTATIONS = (() => {
  const r = lcg(515);
  return TREES.map(
    () => [0, r() * Math.PI, (r() - 0.5) * 0.12] as [number, number, number],
  );
})();

const PUFFS = (() => {
  const r = lcg(881);
  return TREES.flatMap((t, i) => {
    const shades = t.kind === "jacaranda" ? JAC_SHADES : FIG_SHADES;
    const spread = t.kind === "jacaranda" ? 1.9 : 2.6;
    return Array.from({ length: 4 }, (_, k) => ({
      key: `${i}-${k}`,
      pos: [
        t.x + (r() - 0.5) * spread * t.s,
        (2.5 + r() * 1.1) * t.s,
        t.z + (r() - 0.5) * spread * t.s,
      ] as [number, number, number],
      scale: (0.9 + r() * 0.8) * t.s,
      color: shades[Math.floor(r() * shades.length)],
    }));
  });
})();

/**
 * Jacarandas in full bloom + Moreton Bay figs. Multi-puff instanced
 * canopies, blossom carpets, and instanced blob shadows for grounding.
 */
export function TreeField() {
  return (
    <group>
      {/* trunks */}
      <Instances limit={TREES.length}>
        <cylinderGeometry args={[0.16, 0.3, 2.6, 7]} />
        <meshToonMaterial gradientMap={TOON} color="#6d5137" />
        {TREES.map((t, i) => (
          <Instance
            key={i}
            position={[t.x, 1.3 * t.s, t.z]}
            scale={[t.s, t.s, t.s]}
            rotation={TRUNK_ROTATIONS[i]}
          />
        ))}
      </Instances>
      {/* canopy puffs (all trees, one call) */}
      <Instances limit={PUFFS.length}>
        <icosahedronGeometry args={[1.35, 1]} />
        <meshToonMaterial gradientMap={TOON} />
        {PUFFS.map((p) => (
          <Instance
            key={p.key}
            position={p.pos}
            scale={[p.scale * 1.3, p.scale * 0.9, p.scale * 1.3]}
            color={p.color}
          />
        ))}
      </Instances>
      {/* blossom carpets under jacarandas */}
      <Instances limit={JACS.length}>
        <circleGeometry args={[1.9, 20]} />
        <meshBasicMaterial color="#b7a3e8" transparent opacity={0.55} depthWrite={false} />
        {JACS.map((t, i) => (
          <Instance
            key={i}
            position={[t.x, 0.035, t.z]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[t.s, t.s, 1]}
          />
        ))}
      </Instances>
      {/* blob shadows (cheap grounding without a shadow map) */}
      <Instances limit={TREES.length}>
        <circleGeometry args={[1.7, 16]} />
        <meshBasicMaterial color="#1c3822" transparent opacity={0.22} depthWrite={false} />
        {TREES.map((t, i) => (
          <Instance
            key={i}
            position={[t.x + 0.5, 0.028, t.z + 0.4]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[t.s * 1.2, t.s, 1]}
          />
        ))}
      </Instances>
    </group>
  );
}

/* ---------------------------------- grass tufts ---------------------------------- */

function tuftReject(x: number, z: number): boolean {
  if (Math.abs(x) > 42 || z < -40 || z > 39) return true;
  if (Math.abs(x) < 3.2 && Math.abs(z) < 42) return true;
  if (Math.abs(z) < 3.2) return true;
  if (Math.abs(x + 27) < 2.6 || Math.abs(x - 27) < 2.6) return true;
  if (x * x + z * z < 110) return true;
  if (
    Math.abs(x - ARCADE.x) < ARCADE.hw + 2 &&
    Math.abs(z - ARCADE.z) < ARCADE.hd + 3
  )
    return true;
  if (Math.abs(x - GREAT_COURT.center.x) < 14 && z > -32 && z < -12) return true;
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
    return new THREE.CanvasTexture(c);
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
        shade: r() < 0.5 ? "#4f9e58" : "#3f8a49",
      });
    }
    return out;
  }, []);

  return (
    <Instances limit={spots.length} geometry={geometry} frustumCulled={false}>
      <meshToonMaterial gradientMap={TOON}
        alphaMap={alphaMap}
        transparent
        alphaTest={0.35}
        side={THREE.DoubleSide}
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

/* ---------------------------------- set dressing ---------------------------------- */

const BUSH_SPOTS = (() => {
  const out: Array<{ x: number; z: number; s: number; c: string }> = [];
  const r = lcg(2024);
  const shades = ["#3f8a4c", "#357a42", "#4c9c58"];
  // ring around the plaza, skipping the four road gaps
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const nearRoad =
      Math.abs(Math.sin(a)) < 0.3 || Math.abs(Math.cos(a)) < 0.3;
    if (nearRoad) continue;
    out.push({ x: Math.cos(a) * 11.2, z: Math.sin(a) * 11.2, s: 0.8 + r() * 0.5, c: shades[i % 3] });
  }
  // court frontage
  for (let x = -38; x <= -16; x += 4.4) {
    if (Math.abs(x + 27) < 4) continue;
    out.push({ x, z: -11.3, s: 0.9 + r() * 0.4, c: shades[Math.floor(r() * 3)] });
  }
  // café, post office, career, arcade, garden edges
  const clusters: Array<[number, number]> = [
    [-35, 8.6], [-31, 8.2], [35, 8.6], [31, 8.2],
    [20, -21], [28, -13], [36, -22],
    [17, 20], [37, 20], [-18, 26], [-36, 26],
  ];
  for (const [x, z] of clusters) {
    out.push({ x, z, s: 0.8 + r() * 0.6, c: shades[Math.floor(r() * 3)] });
  }
  return out;
})();

const FLOWER_SPOTS = (() => {
  const r = lcg(909);
  const colors = ["#ff7ab8", "#ffd166", "#fff4f0", "#ff9f5b", "#c78bff"];
  const out: Array<{ x: number; z: number; c: string }> = [];
  const scatter = (cx: number, cz: number, rx: number, rz: number, n: number) => {
    for (let i = 0; i < n; i++) {
      out.push({
        x: cx + (r() - 0.5) * rx * 2,
        z: cz + (r() - 0.5) * rz * 2,
        c: colors[Math.floor(r() * colors.length)],
      });
    }
  };
  scatter(-27, 22, 6.5, 5.5, 60); // skills garden beds
  scatter(-27, -21.5, 8, 5, 26); // court lawn
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2;
    const rad = 10.4 + r() * 1.4;
    out.push({ x: Math.cos(a) * rad, z: Math.sin(a) * rad, c: colors[Math.floor(r() * colors.length)] });
  }
  return out;
})();

const ROCK_SPOTS = (() => {
  const r = lcg(313);
  const out: Array<{ x: number; z: number; s: number; ry: number }> = [];
  for (let i = 0; i < 14; i++) {
    out.push({ x: -40 + r() * 80, z: 38.2 + r() * 2.2, s: 0.25 + r() * 0.4, ry: r() * Math.PI });
  }
  for (const [x, z] of [[-8, -8.5], [8.5, -9.5], [14.5, 10.5], [-14, 11], [40, -9]] as const) {
    out.push({ x, z, s: 0.3 + r() * 0.35, ry: r() * Math.PI });
  }
  return out;
})();

/** Bushes, flower beds, and rocks: three instanced draw calls of charm. */
export function SetDressing() {
  return (
    <group>
      <Instances limit={BUSH_SPOTS.length}>
        <icosahedronGeometry args={[0.9, 1]} />
        <meshToonMaterial gradientMap={TOON} />
        {BUSH_SPOTS.map((b, i) => (
          <Instance
            key={i}
            position={[b.x, 0.45 * b.s, b.z]}
            scale={[b.s, b.s * 0.75, b.s]}
            color={b.c}
          />
        ))}
      </Instances>
      <Instances limit={FLOWER_SPOTS.length}>
        <sphereGeometry args={[0.09, 6, 6]} />
        <meshBasicMaterial />
        {FLOWER_SPOTS.map((f, i) => (
          <Instance key={i} position={[f.x, 0.14, f.z]} color={f.c} />
        ))}
      </Instances>
      <Instances limit={ROCK_SPOTS.length}>
        <icosahedronGeometry args={[1, 0]} />
        <meshToonMaterial gradientMap={TOON} color="#a3adba" />
        {ROCK_SPOTS.map((rk, i) => (
          <Instance
            key={i}
            position={[rk.x, rk.s * 0.5, rk.z]}
            rotation={[0, rk.ry, 0]}
            scale={[rk.s, rk.s * 0.7, rk.s]}
          />
        ))}
      </Instances>
    </group>
  );
}

/** A lazy flock circling over the river. */
export function Birds() {
  const geometry = useMemo(() => {
    const a = new THREE.BoxGeometry(0.5, 0.04, 0.14);
    a.rotateZ(0.5);
    a.translate(-0.2, 0, 0);
    const b = new THREE.BoxGeometry(0.5, 0.04, 0.14);
    b.rotateZ(-0.5);
    b.translate(0.2, 0, 0);
    return mergeGeometries([a, b]);
  }, []);
  const offsets = useMemo(() => {
    const r = lcg(432);
    return Array.from({ length: 7 }, () => ({
      rad: 5 + r() * 9,
      a: r() * Math.PI * 2,
      y: (r() - 0.5) * 3,
      s: 0.8 + r() * 0.6,
    }));
  }, []);
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.22;
  });
  return (
    <group ref={group} position={[6, 25, 34]}>
      {offsets.map((o, i) => (
        <mesh
          key={i}
          geometry={geometry}
          position={[Math.cos(o.a) * o.rad, o.y, Math.sin(o.a) * o.rad]}
          rotation-y={-o.a}
          scale={o.s}
        >
          <meshBasicMaterial color="#42505f" />
        </mesh>
      ))}
    </group>
  );
}

/** Little sailboats drifting the south reach. */
function Sailboat({ startX, z, speed, sail }: { startX: number; z: number; speed: number; sail: string }) {
  const group = useRef<THREE.Group>(null);
  const sailShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(0, 1.5);
    shape.lineTo(0.95, 0);
    shape.lineTo(0, 0);
    return new THREE.ShapeGeometry(shape);
  }, []);
  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    g.position.x += speed * dt;
    if (g.position.x > 55) g.position.x = -55;
    g.position.y = -0.06 + Math.sin(clock.elapsedTime * 1.3 + startX) * 0.05;
    g.rotation.z = Math.sin(clock.elapsedTime * 0.9 + startX) * 0.04;
  });
  return (
    <group ref={group} position={[startX, -0.06, z]}>
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[1.7, 0.34, 0.7]} />
        <meshToonMaterial gradientMap={TOON} color="#e8e2d4" />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.7, 6]} />
        <meshToonMaterial gradientMap={TOON} color="#6d5137" />
      </mesh>
      <mesh geometry={sailShape} position={[0.06, 0.6, 0]}>
        <meshToonMaterial gradientMap={TOON} color={sail} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function Boats() {
  return (
    <group>
      <Sailboat startX={-24} z={49.5} speed={1.1} sail="#ff8a5c" />
      <Sailboat startX={18} z={53.5} speed={-0.8} sail="#6fc3ff" />
      <Sailboat startX={44} z={51} speed={0.9} sail="#ffd166" />
    </group>
  );
}

/* ---------------------------------- ambience ---------------------------------- */

/** Butterflies over the garden and riverbank (daytime fireflies). */
export function Butterflies() {
  return (
    <group>
      <Sparkles count={22} position={[-27, 1.8, 22]} scale={[14, 2.5, 14]} size={2.4} speed={0.35} color="#ffe28a" />
      <Sparkles count={16} position={[0, 1.6, 46]} scale={[26, 2, 8]} size={2} speed={0.3} color="#ffffff" />
    </group>
  );
}
