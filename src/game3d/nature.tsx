"use client";

import { useFrame } from "@react-three/fiber";
import { Instance, Instances } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ShaderMaterial } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { TREES, WORLD_PATHS } from "./layout";
import { runtime } from "./state";
import {
  SUN_GROUND,
  SUN_POSITION,
  TOON,
  shadowOffset,
  softShadowAlpha,
  tileTexture,
} from "./materials";

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
    // Background depth lets the existing opaque scene reject hidden sky pixels.
    // Keep x/y/w intact so the sky direction and appearance are unchanged.
    gl_Position.z = gl_Position.w;
  }
`;

const skyFragment = /* glsl */ `
  uniform vec3 uSunDir;
  varying vec3 vWorld;
  void main() {
    vec3 dir = normalize(vWorld);
    float h = dir.y;
    vec3 zenith = vec3(0.20, 0.46, 0.85);
    vec3 mid = vec3(0.47, 0.71, 0.94);
    vec3 horizon = vec3(0.84, 0.92, 0.97);
    vec3 col = mix(mid, zenith, smoothstep(0.15, 0.7, h));
    col = mix(horizon, col, smoothstep(-0.02, 0.2, h));

    float toSun = max(dot(dir, uSunDir), 0.0);

    // stylized cirrus: sines projected onto a flat sky plane so the bands lie
    // overhead instead of wrapping the dome. No texture, no noise fetch.
    float hs = max(h, 0.06);
    vec2 sp = dir.xz / hs;
    float band = sin(sp.x * 0.33 + sin(sp.y * 0.19) * 2.4) * 0.5 + 0.5;
    band *= sin(sp.y * 0.26 + 1.7) * 0.5 + 0.5;
    float cirrus = smoothstep(0.5, 0.94, band) * smoothstep(0.04, 0.34, h);
    // wisps near the sun catch the light instead of staying flat white
    vec3 wisp = mix(vec3(0.99, 0.99, 1.0), vec3(1.0, 0.96, 0.87), toSun);
    col = mix(col, wisp, cirrus * 0.38);

    float disc = smoothstep(0.9993, 0.9997, toSun);
    float sun = pow(toSun, 220.0);
    float halo = pow(toSun, 8.0);
    col += vec3(1.0, 0.97, 0.86) * disc * 2.6;
    col += vec3(1.0, 0.95, 0.8) * sun * 2.2;
    col += vec3(0.35, 0.3, 0.18) * halo * 0.4;
    // horizon haze band so distant geometry melts into the sky
    col = mix(col, vec3(0.93, 0.95, 0.94), smoothstep(0.08, -0.04, h) * 0.35);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function SkyDome() {
  // uSunDir matches the directional light in world.tsx so the glow and the
  // actual key light never desync
  const uniforms = useMemo(
    () => ({ uSunDir: { value: new THREE.Vector3(...SUN_POSITION).normalize() } }),
    [],
  );
  return (
    <mesh renderOrder={1000}>
      <sphereGeometry args={[230, 24, 16]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        depthFunc={THREE.LessEqualDepth}
        vertexShader={skyVertex}
        fragmentShader={skyFragment}
        uniforms={uniforms}
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
    puffs.forEach(puff => puff.dispose());
    merged.scale(1, 0.62, 1);
    return merged;
  }, []);
  useEffect(() => () => { geometry.dispose(); }, [geometry]);

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

  const refs = useRef<Array<THREE.Object3D | null>>([]);
  useFrame((_, dt) => {
    for (let i = 0; i < clouds.length; i++) {
      const o = refs.current[i];
      if (!o) continue;
      o.position.x += clouds[i].speed * dt;
      if (o.position.x > 130) o.position.x = -130;
    }
  });

  return (
    <Instances
      geometry={geometry}
      limit={clouds.length}
      frustumCulled={false}
      userData={{ noShadow: true }}
    >
      <meshToonMaterial gradientMap={TOON} color="#ffffff" emissive="#e8f2fb" emissiveIntensity={0.55} />
      {clouds.map((c, i) => (
        <Instance
          key={i}
          ref={(el) => {
            refs.current[i] = el as THREE.Object3D | null;
          }}
          position={[c.x, c.y, c.z]}
          rotation={[0, c.rot, 0]}
          scale={c.s}
        />
      ))}
    </Instances>
  );
}

/* ---------------------------------- ground ---------------------------------- */

/**
 * Wider than it looks like it needs to be, on purpose. At 220 the plane ended
 * at x 110, which from the east edge of the playable area is 66 units away:
 * inside the fog's 70-unit start, so the edge of the world was a visible line
 * against the sky. At 500 every edge is past fog-far and reads as pure haze.
 */
const GROUND_SIZE = 500;

/** One tile every 24.4 units, so the repeat stays put as the plane grows. */
const GROUND_TILE = 24.4;

/**
 * Grass at 512 with two scales of variation. The tile is twice as wide as it
 * used to be at the same texel density, so the repeat is far less obvious on
 * the largest surface on screen.
 */
function useGroundTexture() {
  return useMemo(() => {
    const rng = lcg(7331);
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#68a163";
    ctx.fillRect(0, 0, 512, 512);

    // Only macro variation survives. One tile covers 24 world units, so the
    // fine speckle that used to be here averaged out to flat plastic before it
    // reached a pixel. These patches are metres across and far apart in tone.
    // olive-leaning rather than pure green: fully saturated turf is the
    // clearest "engine default" tell on the biggest surface in the scene
    const shades = ["#84b579", "#74a86c", "#5b8f57", "#4d804d", "#6a9c63"];
    const blotch = (count: number, min: number, max: number, alpha: string) => {
      for (let i = 0; i < count; i++) {
        const x = rng() * 512;
        const y = rng() * 512;
        const r = min + rng() * (max - min);
        const g = ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
        const shade = shades[Math.floor(rng() * shades.length)];
        g.addColorStop(0, shade + alpha);
        g.addColorStop(0.6, shade + "66");
        g.addColorStop(1, shade + "00");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 512, 512);
      }
    };
    blotch(10, 150, 260, "cc"); // metre-scale patches of lighter/darker turf
    blotch(34, 60, 130, "aa");
    blotch(120, 18, 48, "88"); // clumps

    // short dashes at clump scale: reads as mown texture from player height
    for (let i = 0; i < 2600; i++) {
      ctx.strokeStyle = shades[Math.floor(rng() * shades.length)];
      ctx.globalAlpha = 0.25 + rng() * 0.3;
      ctx.lineWidth = 1 + rng() * 2;
      const x = rng() * 512;
      const y = rng() * 512;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng() - 0.5) * 14, y + (rng() - 0.5) * 14);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return tileTexture(new THREE.CanvasTexture(c), GROUND_SIZE / GROUND_TILE);
  }, []);
}

export function Ground() {
  const grass = useGroundTexture();
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]}>
      <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
      <meshToonMaterial gradientMap={TOON} map={grass} />
    </mesh>
  );
}

/* ---------------------------------- paths ---------------------------------- */

export function stoneCanvas(): HTMLCanvasElement {
  const rng = lcg(4242);
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#cfc5b4";
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "#b6ab97";
  ctx.lineWidth = 3;
  for (let y = 0; y <= 256; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  for (let row = 0; row < 4; row++) {
    const off = row % 2 === 0 ? 0 : 64;
    for (let x = off; x <= 256; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, row * 64);
      ctx.lineTo(x, row * 64 + 64);
      ctx.stroke();
    }
  }
  // per-slab tint so the paving reads as laid stone, not printed grid
  for (let row = 0; row < 4; row++) {
    const off = row % 2 === 0 ? 0 : 64;
    for (let x = off - 128; x < 256; x += 128) {
      ctx.fillStyle = rng() < 0.5 ? "#d5cbba" : "#c6bba8";
      ctx.globalAlpha = 0.35 + rng() * 0.3;
      ctx.fillRect(x + 2, row * 64 + 2, 124, 60);
    }
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = rng() < 0.5 ? "#d8cfc0" : "#bdb29e";
    ctx.globalAlpha = 0.25 + rng() * 0.2;
    ctx.fillRect(rng() * 256, rng() * 256, 2, 2);
  }
  ctx.globalAlpha = 1;
  return c;
}

const STRIPS = WORLD_PATHS;

/** Paved paths + central plaza. */
export function Paths() {
  // one canvas, one texture per distinct repeat, all built once: cloning
  // during render leaked a fresh GPU texture on every quality-ladder change
  const { stripTextures, plazaStone } = useMemo(() => {
    // clone rather than construct: clones share one GPU upload, so the eight
    // repeat variants cost a single texture in video memory
    const base = new THREE.CanvasTexture(stoneCanvas());
    const make = (rx: number, ry: number) => tileTexture(base.clone(), rx, ry);
    return {
      stripTextures: STRIPS.map((s) => make(s.w / 3, s.d / 3)),
      plazaStone: make(6, 6),
    };
  }, []);

  return (
    <group>
      {STRIPS.map((s, i) => (
        <mesh
          key={i}
          position={[s.x, 0.02 + i * 0.001, s.z]}
          rotation-x={-Math.PI / 2}
        >
          <planeGeometry args={[s.w, s.d]} />
          <meshToonMaterial gradientMap={TOON} map={stripTextures[i]} />
        </mesh>
      ))}
      <mesh position={[0, 0.03, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[9.5, 48]} />
        <meshToonMaterial gradientMap={TOON} map={plazaStone} />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[5.6, 5.9, 48]} />
        <meshToonMaterial gradientMap={TOON} color="#b3a888" />
      </mesh>
      <mesh position={[3, 0.035, -63]} rotation-x={-Math.PI / 2} scale={[12, 9.5, 1]}>
        <ringGeometry args={[1, 1.1, 64]} />
        <meshToonMaterial gradientMap={TOON} map={plazaStone} />
      </mesh>
    </group>
  );
}

/* ---------------------------------- river ---------------------------------- */

const riverVertex = /* glsl */ `
  #include <fog_pars_vertex>
  #ifdef WATER_SHORE
  varying vec2 vUv;
  #endif
  varying vec3 vWorld;
  void main() {
    #ifdef WATER_SHORE
    vUv = uv;
    #endif
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vec4 mvPosition = viewMatrix * w;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const riverFragment = /* glsl */ `
  // note: three.js injects "uniform vec3 cameraPosition;" automatically
  #include <fog_pars_fragment>
  uniform float uTime;
  uniform float uScale;
  #ifdef WATER_SHORE
  uniform float uShore;
  varying vec2 vUv;
  #endif
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
    vec2 p = vWorld.xz * uScale;
    float n = noise(p + vec2(uTime * 0.22, uTime * 0.14));
    n += 0.5 * noise(p * 2.3 - vec2(uTime * 0.31, uTime * 0.12));
    n /= 1.5;

    vec3 deep = vec3(0.14, 0.31, 0.35);
    vec3 lit  = vec3(0.31, 0.53, 0.57);
    vec3 col = mix(deep, lit, n);

    // fresnel: grazing angles pick up the bright sky
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float fresnel = pow(1.0 - max(viewDir.y, 0.0), 3.0);
    col += vec3(0.32, 0.4, 0.45) * fresnel;

    // Sun glints. A thresholded sine ran as continuous bands across the
    // surface, which read as thick white worms crawling over the river; two
    // noise octaves at different scales break it into scattered points.
    float glintA = noise(p * 3.4 + vec2(uTime * 0.30, -uTime * 0.18));
    float glintB = noise(p * 9.0 - vec2(uTime * 0.45, uTime * 0.26));
    float sparkle = smoothstep(0.68, 0.95, glintA) * smoothstep(0.55, 0.92, glintB);
    col += vec3(1.0, 0.97, 0.85) * sparkle * (0.5 + 0.7 * fresnel);

    // Compile shore effects only for surfaces whose UV edges represent banks.
    // The active river, lake and fountain all omit this unused noise octave.
    #ifdef WATER_SHORE
    float edge = uShore > 1.5 ? (0.5 - length(vUv - 0.5)) : min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float shore = smoothstep(0.11, 0.0, edge);
    col = mix(col, vec3(0.52, 0.69, 0.64), shore * 0.45 * uShore);

    float foam = smoothstep(0.045, 0.0, edge) * (0.5 + 0.5 * noise(p * 6.0 + uTime * 0.4));
    col += vec3(0.85, 0.9, 0.94) * foam * 0.5 * min(uShore, 1.0);
    #endif

    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
  }
`;

/**
 * The scene's one water shader, shared by the river and the plaza fountain.
 * `shore` switches off the bank shallows for closed pools.
 */
export function WaterMaterial({
  scale = 0.35,
  shore = 1,
}: {
  scale?: number;
  shore?: number;
}) {
  const shoreEnabled = shore !== 0;
  const defines = useMemo(() => shoreEnabled ? { WATER_SHORE: 1 } : {}, [shoreEnabled]);
  const uniforms = useMemo(
    () =>
      THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uScale: { value: scale },
          uShore: { value: shore },
        },
      ]),
    [scale, shore],
  );
  const ref = useRef<ShaderMaterial>(null);
  useFrame((_, dt) => {
    if (ref.current && !runtime.reducedMotion && !runtime.paused && runtime.focused) ref.current.uniforms.uTime.value += Math.min(dt, 0.05);
  });
  return (
    <shaderMaterial
      key={shoreEnabled ? "shore-water" : "open-water"}
      ref={ref}
      vertexShader={riverVertex}
      fragmentShader={riverFragment}
      uniforms={uniforms}
      defines={defines}
      fog
    />
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

const WHITE = new THREE.Color("#ffffff");
const AMBIENCE_STEP = 1 / 30;

const PUFFS = (() => {
  const r = lcg(881);
  return TREES.flatMap((t, i) => {
    const shades = t.kind === "jacaranda" ? JAC_SHADES : FIG_SHADES;
    const spread = t.kind === "jacaranda" ? 1.9 : 2.6;
    const treePhase = r() * Math.PI * 2;
    // seven lumps, not four: the extra small ones break the smooth ball
    // silhouette that made every canopy read as one flat blob
    return Array.from({ length: 7 }, (_, k) => {
      const color = shades[Math.floor(r() * shades.length)];
      const outer = k >= 4;
      return {
        key: `${i}-${k}`,
        pos: [
          t.x + (r() - 0.5) * spread * (outer ? 1.5 : 1) * t.s,
          (outer ? 2.2 + r() * 1.6 : 2.5 + r() * 1.1) * t.s,
          t.z + (r() - 0.5) * spread * (outer ? 1.5 : 1) * t.s,
        ] as [number, number, number],
        scale: (outer ? 0.5 + r() * 0.45 : 0.95 + r() * 0.75) * t.s,
        color,
        /** same hue lifted toward white, for the sunlit crown layer */
        lit: new THREE.Color(color).lerp(WHITE, 0.17).getStyle(),
        phase: treePhase + r() * 0.6,
      };
    });
  });
})();

/**
 * Offset of the sunlit crown layer, along the sun direction. With no shadow
 * map, this is what gives a canopy a top and an underside instead of reading
 * as one flat blob of colour.
 */
const CROWN = (() => {
  const [x, y, z] = SUN_POSITION;
  const len = Math.hypot(x, y, z);
  // small: the crown has to read as the lit side of one volume. Pushed
  // further out it separates into a second, paler ball sitting on top.
  return { x: (x / len) * 0.26, y: (y / len) * 0.26, z: (z / len) * 0.26 };
})();

/**
 * Jacarandas in full bloom + Moreton Bay figs. Multi-puff instanced
 * canopies, blossom carpets, and instanced blob shadows for grounding.
 * Canopies sway per tree on the CPU (same idiom as Clouds): zero extra
 * draw calls, no shader patching.
 */
export function TreeField({
  reducedMotion = false,
  softGL = false,
}: {
  reducedMotion?: boolean;
  softGL?: boolean;
} = {}) {
  const sway = !reducedMotion && !softGL;
  const puffRefs = useRef<Array<THREE.Object3D | null>>([]);
  const outlineRefs = useRef<Array<THREE.Object3D | null>>([]);
  const crownRefs = useRef<Array<THREE.Object3D | null>>([]);
  const lastSway = useRef(-Infinity);
  useFrame(({ clock }) => {
    if (!sway) return;
    const t = clock.elapsedTime;
    if (t - lastSway.current < AMBIENCE_STEP) return;
    lastSway.current = t;
    for (let i = 0; i < PUFFS.length; i++) {
      const p = PUFFS[i];
      const dx = Math.sin(t * 0.7 + p.phase * 1.3) * 0.035 * p.scale;
      const dy = Math.sin(t * 1.1 + p.phase) * 0.05 * p.scale;
      const puff = puffRefs.current[i];
      if (puff) puff.position.set(p.pos[0] + dx, p.pos[1] + dy, p.pos[2]);
      const outline = outlineRefs.current[i];
      if (outline) outline.position.set(p.pos[0] + dx, p.pos[1] + dy, p.pos[2]);
      const crown = crownRefs.current[i];
      if (crown) {
        crown.position.set(
          p.pos[0] + dx + CROWN.x * p.scale,
          p.pos[1] + dy + CROWN.y * p.scale,
          p.pos[2] + CROWN.z * p.scale,
        );
      }
    }
  });
  return (
    <group>
      {/* trunk outlines (inverted hull: dark back-facing shell) */}
      <Instances limit={TREES.length} frames={1}>
        <cylinderGeometry args={[0.2, 0.35, 2.68, 7]} />
        <meshBasicMaterial color="#2e2115" side={THREE.BackSide} />
        {TREES.map((t, i) => (
          <Instance
            key={i}
            position={[t.x, 1.3 * t.s, t.z]}
            scale={[t.s, t.s, t.s]}
            rotation={TRUNK_ROTATIONS[i]}
          />
        ))}
      </Instances>
      {/* trunks */}
      <Instances limit={TREES.length} frames={1}>
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
      {/* canopy outlines */}
      <Instances limit={PUFFS.length}>
        <icosahedronGeometry args={[1.43, 1]} />
        <meshBasicMaterial color="#20351f" side={THREE.BackSide} />
        {PUFFS.map((p, i) => (
          <Instance
            key={p.key}
            ref={(el) => {
              outlineRefs.current[i] = el as THREE.Object3D | null;
            }}
            position={p.pos}
            scale={[p.scale * 1.3, p.scale * 0.9, p.scale * 1.3]}
          />
        ))}
      </Instances>
      {/* canopy puffs (all trees, one call) */}
      <Instances limit={PUFFS.length}>
        <icosahedronGeometry args={[1.35, 1]} />
        <meshToonMaterial gradientMap={TOON} />
        {PUFFS.map((p, i) => (
          <Instance
            key={p.key}
            ref={(el) => {
              puffRefs.current[i] = el as THREE.Object3D | null;
            }}
            position={p.pos}
            scale={[p.scale * 1.3, p.scale * 0.9, p.scale * 1.3]}
            color={p.color}
          />
        ))}
      </Instances>
      {/* sunlit crown: a smaller, lighter puff pushed toward the sun, so
          canopies have a lit top and a shaded belly */}
      <Instances limit={PUFFS.length}>
        <icosahedronGeometry args={[1.35, 1]} />
        <meshToonMaterial gradientMap={TOON} />
        {PUFFS.map((p, i) => (
          <Instance
            key={p.key}
            ref={(el) => {
              crownRefs.current[i] = el as THREE.Object3D | null;
            }}
            position={[
              p.pos[0] + CROWN.x * p.scale,
              p.pos[1] + CROWN.y * p.scale,
              p.pos[2] + CROWN.z * p.scale,
            ]}
            scale={[p.scale * 1.14, p.scale * 0.8, p.scale * 1.14]}
            color={p.lit}
          />
        ))}
      </Instances>
      {/* blossom carpets under jacarandas: soft-edged, so the fallen petals
          thin out into the grass instead of stopping at a drawn circle */}
      <Instances limit={JACS.length} frames={1}>
        <planeGeometry args={[4.4, 4.4]} />
        <meshBasicMaterial
          color="#b7a3e8"
          alphaMap={softShadowAlpha()}
          transparent
          opacity={0.62}
          depthWrite={false}
        />
        {JACS.map((t, i) => (
          <Instance
            key={i}
            position={[t.x, 0.035, t.z]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[t.s, t.s, 1]}
          />
        ))}
      </Instances>
      {/* blob shadows: soft-edged, stretched away from the sun */}
      <Instances limit={TREES.length} frames={1}>
        <planeGeometry args={[3.4, 3.4]} />
        <meshBasicMaterial
          color="#15301c"
          alphaMap={softShadowAlpha()}
          transparent
          opacity={0.45}
          depthWrite={false}
        />
        {TREES.map((t, i) => {
          // canopy centre sits ~3 up, so the shadow lands nearly 3 to the side
          const [ox, oz] = shadowOffset(3 * t.s);
          return (
            <Instance
              key={i}
              position={[t.x + ox, 0.028, t.z + oz]}
              rotation={[-Math.PI / 2, 0, SUN_GROUND.angle]}
              scale={[t.s * 1.7, t.s * 1.1, 1]}
            />
          );
        })}
      </Instances>
    </group>
  );
}
