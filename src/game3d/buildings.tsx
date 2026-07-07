"use client";

import { Html, Instance, Instances, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  ARCADE,
  CABINETS,
  CAFE,
  CRYSTALS,
  GREAT_COURT,
  LAMPS,
  OFFICES,
  POST,
  ZONE_LABELS,
} from "./layout";
import { lcg } from "./nature";
import { playerPos } from "./state";

/* ---------------------------------- shared ---------------------------------- */

const SANDSTONE = "#dcc394";
const SANDSTONE_DARK = "#b89f70";

function Label({
  position,
  children,
  accent = "#1f8a4c",
  /** only render within this distance of the player (declutters far views) */
  showWithin,
  /** world-space anchor for the proximity check (position may be local) */
  worldXZ,
}: {
  position: [number, number, number];
  children: string;
  accent?: string;
  showWithin?: number;
  worldXZ?: [number, number];
}) {
  const [visible, setVisible] = useState(showWithin === undefined);
  const tick = useRef(0);

  useFrame(() => {
    if (showWithin === undefined || !worldXZ) return;
    // cheap proximity check, every ~12 frames
    tick.current = (tick.current + 1) % 12;
    if (tick.current !== 0) return;
    const d = Math.hypot(worldXZ[0] - playerPos.x, worldXZ[1] - playerPos.z);
    const next = d < showWithin;
    setVisible((prev) => (prev === next ? prev : next));
  });

  if (!visible) return null;
  return (
    <Html position={position} center distanceFactor={38} zIndexRange={[10, 0]}>
      <div
        className="pointer-events-none select-none whitespace-nowrap rounded-full border bg-white/80 px-3 py-1 font-pixel text-[9px] tracking-wider shadow-sm backdrop-blur-sm"
        style={{ borderColor: `${accent}55`, color: accent }}
      >
        {children}
      </div>
    </Html>
  );
}

/** Day windows: glassy sky reflections on a facade texture. */
function useGlassWindows(cols: number, rows: number, density = 0.85) {
  return useMemo(() => {
    const rng = lcg(cols * 131 + rows * 31 + Math.round(density * 100));
    const c = document.createElement("canvas");
    c.width = cols * 6;
    c.height = rows * 6;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#8ba3c2";
    ctx.fillRect(0, 0, c.width, c.height);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (rng() < density) {
          const bright = rng();
          ctx.fillStyle =
            bright < 0.3 ? "#dcecfa" : bright < 0.7 ? "#a9c6e4" : "#7f9cbd";
          ctx.fillRect(x * 6 + 1, y * 6 + 1, 4, 3);
        }
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [cols, rows, density]);
}

/** Instanced blob shadows to ground the structures without a shadow map. */
export function StructureShadows() {
  const rects = [
    ...OFFICES.map((o) => ({ x: o.x, z: o.z, w: o.w + 2, d: o.d + 2 })),
    { x: CAFE.x, z: CAFE.z, w: CAFE.w + 2, d: CAFE.d + 2 },
    { x: POST.x, z: POST.z, w: POST.w + 2, d: POST.d + 2 },
    { x: ARCADE.x, z: ARCADE.z - 1, w: ARCADE.hw * 2 + 2, d: ARCADE.hd * 2 },
    ...[GREAT_COURT.northWing, GREAT_COURT.westWing, GREAT_COURT.eastWing, GREAT_COURT.southWest, GREAT_COURT.southEast].map(
      (w) => ({ x: w.x, z: w.z, w: w.hw * 2 + 1.5, d: w.hd * 2 + 1.5 }),
    ),
  ];
  return (
    <Instances limit={rects.length}>
      <circleGeometry args={[0.72, 14]} />
      <meshBasicMaterial color="#23402a" transparent opacity={0.18} depthWrite={false} />
      {rects.map((r, i) => (
        <Instance
          key={i}
          position={[r.x + 0.6, 0.026, r.z + 0.5]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[r.w / 1.2, r.d / 1.2, 1]}
        />
      ))}
    </Instances>
  );
}

/* ---------------------------------- UQ Great Court ---------------------------------- */

/** Sandstone brickwork: coursed blocks with tint variation, like the real thing. */
function useSandstoneTexture() {
  return useMemo(() => {
    const rng = lcg(1911);
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    const tints = ["#dcc394", "#d2b788", "#e5cfa2", "#c9ac7c", "#e0c898"];
    const courseH = 16;
    const blockW = 32;
    for (let row = 0; row < 128 / courseH; row++) {
      const off = row % 2 === 0 ? 0 : blockW / 2;
      for (let x = -1; x < 5; x++) {
        ctx.fillStyle = tints[Math.floor(rng() * tints.length)];
        ctx.fillRect(x * blockW + off, row * courseH, blockW - 1.5, courseH - 1.5);
      }
    }
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#b09468";
    ctx.fillRect(0, 0, 128, 128);
    ctx.globalCompositeOperation = "source-over";
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = rng() < 0.5 ? "#c0a374" : "#ecdbb0";
      ctx.globalAlpha = 0.18;
      ctx.fillRect(rng() * 128, rng() * 128, 2, 2);
    }
    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/** Arched cloister windows (dark glass in sandstone) for court facades. */
function useArchedWindows(count: number) {
  return useMemo(() => {
    const rng = lcg(count * 7 + 13);
    const c = document.createElement("canvas");
    c.width = count * 24;
    c.height = 48;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#cdb488";
    ctx.fillRect(0, 0, c.width, 48);
    for (let i = 0; i < count; i++) {
      const shade = rng();
      ctx.fillStyle = shade < 0.6 ? "#4a5a6e" : "#617d99";
      const x = i * 24 + 6;
      ctx.fillRect(x, 18, 12, 24);
      ctx.beginPath();
      ctx.arc(x + 6, 18, 6, Math.PI, 0);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [count]);
}

/**
 * The UQ signature: an enclosed sandstone Great Court with cloister
 * colonnades, arched windows, a south entrance gate, and the clock tower
 * in the morning sun.
 */
export function GreatCourt() {
  const { northWing, westWing, eastWing, southWest, southEast, gate, tower } =
    GREAT_COURT;
  const sandstone = useSandstoneTexture();
  const archesWide = useArchedWindows(12);
  const archesSide = useArchedWindows(8);

  const clockFace = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#4a3d28";
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = "#f6ecd2";
    ctx.beginPath();
    ctx.arc(32, 32, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2c2416";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(32, 32);
    ctx.lineTo(32, 14);
    ctx.moveTo(32, 32);
    ctx.lineTo(44, 36);
    ctx.stroke();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  const wingTexture = (hw: number, h: number) => {
    const t = sandstone.clone();
    t.needsUpdate = true;
    t.repeat.set(Math.max(1, hw / 2.2), Math.max(1, h / 3.2));
    return t;
  };

  const wings = [northWing, westWing, eastWing, southWest, southEast];

  const columns = useMemo(() => {
    const out: Array<[number, number, number]> = [];
    for (let x = -11.5; x <= 11.5; x += 1.92) {
      out.push([GREAT_COURT.center.x + x, 1.5, northWing.z + northWing.hd + 0.7]);
    }
    for (let z = -6.5; z <= 6.5; z += 1.86) {
      out.push([westWing.x + westWing.hw + 0.7, 1.5, westWing.z + z]);
      out.push([eastWing.x - eastWing.hw - 0.7, 1.5, eastWing.z + z]);
    }
    return out;
  }, [northWing, westWing, eastWing]);

  return (
    <group>
      {wings.map((w, i) => (
        <group key={i}>
          <mesh position={[w.x, w.h / 2, w.z]}>
            <boxGeometry args={[w.hw * 2, w.h, w.hd * 2]} />
            <meshLambertMaterial map={wingTexture(w.hw, w.h)} />
          </mesh>
          <mesh position={[w.x, w.h + 0.35, w.z]}>
            <boxGeometry args={[w.hw * 2 + 0.6, 0.7, w.hd * 2 + 0.6]} />
            <meshLambertMaterial color={SANDSTONE_DARK} />
          </mesh>
        </group>
      ))}

      {/* arched windows on the court-facing facades */}
      <mesh position={[northWing.x, northWing.h * 0.6, northWing.z + northWing.hd + 0.03]}>
        <planeGeometry args={[northWing.hw * 2 - 1.5, northWing.h * 0.45]} />
        <meshLambertMaterial map={archesWide} />
      </mesh>
      <mesh
        position={[westWing.x + westWing.hw + 0.03, westWing.h * 0.6, westWing.z]}
        rotation-y={Math.PI / 2}
      >
        <planeGeometry args={[westWing.hd * 2 - 1.5, westWing.h * 0.45]} />
        <meshLambertMaterial map={archesSide} />
      </mesh>
      <mesh
        position={[eastWing.x - eastWing.hw - 0.03, eastWing.h * 0.6, eastWing.z]}
        rotation-y={-Math.PI / 2}
      >
        <planeGeometry args={[eastWing.hd * 2 - 1.5, eastWing.h * 0.45]} />
        <meshLambertMaterial map={archesSide} />
      </mesh>

      {/* cloister colonnade: columns + capitals + lintels + shaded walkway */}
      <Instances limit={columns.length}>
        <cylinderGeometry args={[0.2, 0.25, 3, 8]} />
        <meshLambertMaterial color={SANDSTONE} />
        {columns.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>
      <Instances limit={columns.length}>
        <boxGeometry args={[0.55, 0.22, 0.55]} />
        <meshLambertMaterial color={SANDSTONE_DARK} />
        {columns.map((p, i) => (
          <Instance key={i} position={[p[0], 3.05, p[2]]} />
        ))}
      </Instances>
      <mesh position={[GREAT_COURT.center.x, 3.35, northWing.z + northWing.hd + 0.7]}>
        <boxGeometry args={[northWing.hw * 2 - 1, 0.4, 0.8]} />
        <meshLambertMaterial color={SANDSTONE} />
      </mesh>
      {[westWing.x + westWing.hw + 0.7, eastWing.x - eastWing.hw - 0.7].map((x) => (
        <mesh key={x} position={[x, 3.35, westWing.z]}>
          <boxGeometry args={[0.8, 0.4, westWing.hd * 2 - 1]} />
          <meshLambertMaterial color={SANDSTONE} />
        </mesh>
      ))}
      {/* shaded cloister recess behind the columns */}
      <mesh position={[GREAT_COURT.center.x, 1.4, northWing.z + northWing.hd + 0.08]}>
        <planeGeometry args={[northWing.hw * 2 - 1.5, 2.6]} />
        <meshLambertMaterial color="#6e5c40" />
      </mesh>

      {/* south entrance gate */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[gate.x + side * gate.halfOpening, gate.h / 2, gate.z]}>
          <boxGeometry args={[1, gate.h, 1.4]} />
          <meshLambertMaterial map={wingTexture(1, gate.h)} />
        </mesh>
      ))}
      <mesh position={[gate.x, gate.h - 0.5, gate.z]}>
        <boxGeometry args={[gate.halfOpening * 2 + 1, 1.2, 1.6]} />
        <meshLambertMaterial color={SANDSTONE_DARK} />
      </mesh>

      {/* clock tower */}
      <group position={[tower.x, 0, tower.z]}>
        <mesh position={[0, tower.h / 2, 0]}>
          <boxGeometry args={[tower.w, tower.h, tower.w]} />
          <meshLambertMaterial map={wingTexture(tower.w / 2, tower.h)} />
        </mesh>
        <mesh position={[0, tower.h + 0.3, 0]}>
          <boxGeometry args={[tower.w + 0.7, 0.6, tower.w + 0.7]} />
          <meshLambertMaterial color={SANDSTONE_DARK} />
        </mesh>
        {[0, Math.PI / 2].map((ry) => (
          <mesh key={ry} position={[0, tower.h - 5.2, 0]} rotation-y={ry}>
            <boxGeometry args={[tower.w + 0.06, 1.6, 1.1]} />
            <meshLambertMaterial color="#4a4034" />
          </mesh>
        ))}
        <mesh position={[0, tower.h + 1.7, 0]}>
          <coneGeometry args={[tower.w * 0.78, 2.6, 4]} />
          <meshLambertMaterial color="#7a6894" />
        </mesh>
        {[0, Math.PI].map((ry) => (
          <mesh
            key={ry}
            position={[0, tower.h - 2.2, ry === 0 ? tower.w / 2 + 0.02 : -(tower.w / 2 + 0.02)]}
            rotation-y={ry}
          >
            <planeGeometry args={[2, 2]} />
            <meshLambertMaterial map={clockFace} />
          </mesh>
        ))}
      </group>

      {/* scholarship plaque */}
      <group position={[GREAT_COURT.plaque.x, 0, GREAT_COURT.plaque.z]}>
        <mesh position={[0, 0.55, 0]} rotation-x={-0.25}>
          <boxGeometry args={[1, 0.8, 0.14]} />
          <meshLambertMaterial color="#8f9ab2" />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.5, 0.36, 0.3]} />
          <meshLambertMaterial color="#6b7488" />
        </mesh>
      </group>
    </group>
  );
}

/* ---------------------------------- career towers ---------------------------------- */

export function CareerDistrict() {
  return (
    <group>
      {OFFICES.map((o) => (
        <OfficeTower key={o.payload.id} spec={o} />
      ))}
    </group>
  );
}

function OfficeTower({ spec }: { spec: (typeof OFFICES)[number] }) {
  const windows = useGlassWindows(8, 14);
  return (
    <group position={[spec.x, 0, spec.z]}>
      <mesh position={[0, spec.h / 2, 0]}>
        <boxGeometry args={[spec.w, spec.h, spec.d]} />
        <meshLambertMaterial map={windows} />
      </mesh>
      <mesh position={[0, spec.h + 0.25, 0]}>
        <boxGeometry args={[spec.w + 0.4, 0.5, spec.d + 0.4]} />
        <meshLambertMaterial color="#5b6b85" />
      </mesh>
      <mesh position={[0, spec.h + 0.8, 0]}>
        <sphereGeometry args={[0.22, 10, 10]} />
        <meshLambertMaterial color={spec.accent} />
      </mesh>
      {/* entrance awning */}
      <mesh position={[0, 2.3, spec.d / 2 + 0.5]}>
        <boxGeometry args={[2.6, 0.15, 1.2]} />
        <meshLambertMaterial color={spec.accent} />
      </mesh>
      <mesh position={[0, 1.1, spec.d / 2 + 0.02]}>
        <planeGeometry args={[1.8, 2.2]} />
        <meshLambertMaterial color="#2e3d52" />
      </mesh>
      <Label position={[0, spec.h + 2.2, 0]} accent="#1f5e8a">
        {spec.label.toUpperCase()}
      </Label>
    </group>
  );
}

/* ---------------------------------- café + post office ---------------------------------- */

export function Cafe() {
  return (
    <group position={[CAFE.x, 0, CAFE.z]}>
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[CAFE.w, 3.2, CAFE.d]} />
        <meshLambertMaterial color="#a9795a" />
      </mesh>
      <mesh position={[0, 3.5, 0]}>
        <coneGeometry args={[CAFE.w * 0.78, 1.6, 4]} />
        <meshLambertMaterial color="#6e4a33" />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[CAFE.w / 2 + 0.5, 2.35, -1.5 + i]} rotation-z={-0.5}>
          <boxGeometry args={[1.3, 0.06, 0.98]} />
          <meshLambertMaterial color={i % 2 === 0 ? "#2e9e5b" : "#f5f7fa"} />
        </mesh>
      ))}
      <mesh position={[CAFE.w / 2 + 0.02, 1.2, 1.4]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[1.4, 2.2]} />
        <meshLambertMaterial color="#3d3228" />
      </mesh>
      <mesh position={[CAFE.w / 2 + 0.02, 1.7, -1.4]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[1.7, 1.1]} />
        <meshLambertMaterial color="#bcd7ea" />
      </mesh>
      {/* steam over the roof vent */}
      <Sparkles count={8} position={[0.8, 4.6, 0]} scale={[0.8, 1.6, 0.8]} size={1.6} speed={0.5} color="#ffffff" />
    </group>
  );
}

export function PostOffice() {
  return (
    <group position={[POST.x, 0, POST.z]}>
      <mesh position={[0, 1.7, 0]}>
        <boxGeometry args={[POST.w, 3.4, POST.d]} />
        <meshLambertMaterial color="#8fa3c6" />
      </mesh>
      <mesh position={[0, 3.75, 0]}>
        <boxGeometry args={[POST.w + 0.5, 0.7, POST.d + 0.5]} />
        <meshLambertMaterial color="#d1544f" />
      </mesh>
      <mesh position={[-POST.w / 2 - 0.02, 1.2, 0]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[1.5, 2.3]} />
        <meshLambertMaterial color="#33404f" />
      </mesh>
      <mesh position={[-POST.w / 2 - 1.4, 0.55, 1.6]}>
        <cylinderGeometry args={[0.28, 0.28, 1.1, 10]} />
        <meshLambertMaterial color="#d1544f" />
      </mesh>
    </group>
  );
}

/* ---------------------------------- arcade ---------------------------------- */

export function Arcade() {
  return (
    <group>
      <mesh position={[ARCADE.x, 4.4, ARCADE.z - 1]}>
        <boxGeometry args={[ARCADE.hw * 2 + 1.5, 0.35, 5.5]} />
        <meshLambertMaterial color="#46527a" />
      </mesh>
      {[ARCADE.x - ARCADE.hw - 0.4, ARCADE.x + ARCADE.hw + 0.4].map((x) => (
        <mesh key={x} position={[x, 2.2, ARCADE.z + 0.8]}>
          <cylinderGeometry args={[0.14, 0.14, 4.4, 8]} />
          <meshLambertMaterial color="#5b6890" />
        </mesh>
      ))}
      {/* front strip keeps the arcade pink, just not glowing */}
      <mesh position={[ARCADE.x, 4.05, ARCADE.z + 1.4]}>
        <boxGeometry args={[ARCADE.hw * 2 + 1.2, 0.1, 0.1]} />
        <meshBasicMaterial color="#ff6bd6" />
      </mesh>
      {CABINETS.map((c) => (
        <ArcadeCabinet key={c.payload.id} spec={c} />
      ))}
    </group>
  );
}

function ArcadeCabinet({ spec }: { spec: (typeof CABINETS)[number] }) {
  return (
    <group position={[spec.x, 0, spec.z]}>
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[1.15, 1.9, 0.95]} />
        <meshLambertMaterial color="#39415f" />
      </mesh>
      <mesh position={[0, 1.98, 0.1]}>
        <boxGeometry args={[1.15, 0.28, 0.75]} />
        <meshBasicMaterial color={spec.accent} />
      </mesh>
      {/* screens stay lit under the pavilion shade */}
      <mesh position={[0, 1.35, 0.49]} rotation-x={-0.12}>
        <planeGeometry args={[0.8, 0.62]} />
        <meshBasicMaterial color="#54d5ef" />
      </mesh>
      <mesh position={[0, 0.92, 0.55]} rotation-x={0.5}>
        <boxGeometry args={[1.05, 0.1, 0.5]} />
        <meshLambertMaterial color="#4b5478" />
      </mesh>
      <Label
        position={[0, 2.6, 0]}
        accent="#b23a8f"
        showWithin={16}
        worldXZ={[spec.x, spec.z]}
      >
        {spec.label.toUpperCase()}
      </Label>
    </group>
  );
}

/* ---------------------------------- skills garden ---------------------------------- */

export function SkillsGarden() {
  return (
    <group>
      {CRYSTALS.map((c) => (
        <Crystal key={c.payload.id} spec={c} />
      ))}
    </group>
  );
}

function Crystal({ spec }: { spec: (typeof CRYSTALS)[number] }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime + spec.x;
    ref.current.rotation.y = t * 0.6;
    ref.current.position.y = 1.5 + Math.sin(t * 1.4) * 0.14;
  });
  return (
    <group position={[spec.x, 0, spec.z]}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.55, 0.75, 0.6, 6]} />
        <meshLambertMaterial color="#9aa4b8" />
      </mesh>
      <mesh ref={ref} position={[0, 1.5, 0]}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshLambertMaterial
          color={spec.accent}
          emissive={spec.accent}
          emissiveIntensity={0.35}
        />
      </mesh>
      <Label
        position={[0, 2.7, 0]}
        accent="#1f8a4c"
        showWithin={20}
        worldXZ={[spec.x, spec.z]}
      >
        {spec.label.toUpperCase()}
      </Label>
    </group>
  );
}

/* ---------------------------------- plaza fountain ---------------------------------- */

export function Fountain() {
  return (
    <group>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[2.7, 2.9, 0.8, 24]} />
        <meshLambertMaterial color="#a8b0c2" />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[2.35, 2.35, 0.14, 24]} />
        <meshLambertMaterial color="#4e94d4" />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[0.3, 0.42, 1, 12]} />
        <meshLambertMaterial color="#a8b0c2" />
      </mesh>
      <Sparkles count={22} position={[0, 1.6, 0]} scale={[2.4, 1.2, 2.4]} size={2} speed={0.8} color="#eaf6ff" />
    </group>
  );
}

/* ---------------------------------- street lamps ---------------------------------- */

export function StreetLamps() {
  return (
    <group>
      <Instances limit={LAMPS.length}>
        <cylinderGeometry args={[0.07, 0.1, 3.1, 6]} />
        <meshLambertMaterial color="#3c4a44" />
        {LAMPS.map((l, i) => (
          <Instance key={i} position={[l.x, 1.55, l.z]} />
        ))}
      </Instances>
      <Instances limit={LAMPS.length}>
        <sphereGeometry args={[0.17, 10, 10]} />
        <meshLambertMaterial color="#eef2f6" />
        {LAMPS.map((l, i) => (
          <Instance key={i} position={[l.x, 3.18, l.z]} />
        ))}
      </Instances>
    </group>
  );
}

/* ---------------------------------- zone labels ---------------------------------- */

export function ZoneLabels() {
  return (
    <group>
      {ZONE_LABELS.map((z) => (
        <Html
          key={z.label}
          position={[z.x, z.y, z.z]}
          center
          distanceFactor={55}
          zIndexRange={[10, 0]}
        >
          <div className="pointer-events-none select-none whitespace-nowrap rounded border border-black/15 bg-white/70 px-3 py-1 font-pixel text-[9px] tracking-widest text-[#2b3a55] shadow-sm backdrop-blur-sm">
            {z.label}
          </div>
        </Html>
      ))}
    </group>
  );
}
