"use client";

import { Html, Instance, Instances, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { playerPos } from "./state";
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

/* ---------------------------------- shared ---------------------------------- */

const SANDSTONE = "#d3bc8d";
const SANDSTONE_DARK = "#b09a6b";

function Label({
  position,
  children,
  accent = "#4ef08a",
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
        className="pointer-events-none select-none whitespace-nowrap rounded-full border bg-black/60 px-3 py-1 font-pixel text-[9px] tracking-wider backdrop-blur-sm"
        style={{ borderColor: `${accent}66`, color: accent }}
      >
        {children}
      </div>
    </Html>
  );
}

function useLitWindows(cols: number, rows: number, litColor: string, density = 0.45) {
  return useMemo(() => {
    const rng = lcg(cols * 131 + rows * 31 + Math.round(density * 100));
    const c = document.createElement("canvas");
    c.width = cols * 6;
    c.height = rows * 6;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#0a0d16";
    ctx.fillRect(0, 0, c.width, c.height);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (rng() < density) {
          ctx.fillStyle = litColor;
          ctx.globalAlpha = 0.5 + rng() * 0.5;
          ctx.fillRect(x * 6 + 1, y * 6 + 1, 4, 3);
        }
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [cols, rows, litColor, density]);
}

/* ---------------------------------- UQ Great Court ---------------------------------- */

/** Sandstone brickwork: coursed blocks with tint variation, like the real thing. */
function useSandstoneTexture() {
  return useMemo(() => {
    const rng = lcg(1911);
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    const tints = ["#d3bc8d", "#c9b183", "#dcc79b", "#c2a878", "#d8c294"];
    const courseH = 16;
    const blockW = 32;
    for (let row = 0; row < 128 / courseH; row++) {
      const off = row % 2 === 0 ? 0 : blockW / 2;
      for (let x = -1; x < 5; x++) {
        ctx.fillStyle = tints[Math.floor(rng() * tints.length)];
        ctx.fillRect(x * blockW + off, row * courseH, blockW - 1.5, courseH - 1.5);
      }
    }
    // mortar shows through the gaps
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#a8916a";
    ctx.fillRect(0, 0, 128, 128);
    ctx.globalCompositeOperation = "source-over";
    // weathering speckle
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = rng() < 0.5 ? "#b49a6e" : "#e2d0a6";
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

/** Warm arched cloister windows (arch tops, some dim) for court facades. */
function useArchedWindows(count: number) {
  return useMemo(() => {
    const rng = lcg(count * 7 + 13);
    const c = document.createElement("canvas");
    c.width = count * 24;
    c.height = 48;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#171310";
    ctx.fillRect(0, 0, c.width, 48);
    for (let i = 0; i < count; i++) {
      const lit = rng() < 0.7;
      ctx.fillStyle = lit ? "#ffd98a" : "#3a3024";
      ctx.globalAlpha = lit ? 0.65 + rng() * 0.35 : 0.8;
      const x = i * 24 + 6;
      // arch = rect + semicircle top
      ctx.fillRect(x, 18, 12, 24);
      ctx.beginPath();
      ctx.arc(x + 6, 18, 6, Math.PI, 0);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [count]);
}

/**
 * The UQ signature: an enclosed sandstone Great Court with cloister
 * colonnades, arched lit windows, a south entrance gate, and the clock
 * tower glowing over everything.
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
    ctx.fillStyle = "#2c2416";
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

  // cloister columns line the inner (court-facing) edges
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
          <mesh position={[w.x, w.h / 2, w.z]} castShadow receiveShadow>
            <boxGeometry args={[w.hw * 2, w.h, w.hd * 2]} />
            <meshStandardMaterial map={wingTexture(w.hw, w.h)} roughness={0.92} />
          </mesh>
          {/* roofline parapet */}
          <mesh position={[w.x, w.h + 0.35, w.z]} castShadow>
            <boxGeometry args={[w.hw * 2 + 0.6, 0.7, w.hd * 2 + 0.6]} />
            <meshStandardMaterial color={SANDSTONE_DARK} roughness={0.95} />
          </mesh>
        </group>
      ))}

      {/* arched lit windows on the court-facing facades */}
      <mesh
        position={[northWing.x, northWing.h * 0.6, northWing.z + northWing.hd + 0.03]}
      >
        <planeGeometry args={[northWing.hw * 2 - 1.5, northWing.h * 0.45]} />
        <meshStandardMaterial
          color="#171310"
          emissiveMap={archesWide}
          emissive="#ffffff"
          emissiveIntensity={1.7}
          roughness={0.9}
        />
      </mesh>
      <mesh
        position={[westWing.x + westWing.hw + 0.03, westWing.h * 0.6, westWing.z]}
        rotation-y={Math.PI / 2}
      >
        <planeGeometry args={[westWing.hd * 2 - 1.5, westWing.h * 0.45]} />
        <meshStandardMaterial
          color="#171310"
          emissiveMap={archesSide}
          emissive="#ffffff"
          emissiveIntensity={1.7}
          roughness={0.9}
        />
      </mesh>
      <mesh
        position={[eastWing.x - eastWing.hw - 0.03, eastWing.h * 0.6, eastWing.z]}
        rotation-y={-Math.PI / 2}
      >
        <planeGeometry args={[eastWing.hd * 2 - 1.5, eastWing.h * 0.45]} />
        <meshStandardMaterial
          color="#171310"
          emissiveMap={archesSide}
          emissive="#ffffff"
          emissiveIntensity={1.7}
          roughness={0.9}
        />
      </mesh>

      {/* cloister colonnade: columns + capitals + lintel + warm glow behind */}
      <Instances limit={columns.length} castShadow>
        <cylinderGeometry args={[0.2, 0.25, 3, 8]} />
        <meshStandardMaterial color={SANDSTONE} roughness={0.9} />
        {columns.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>
      <Instances limit={columns.length}>
        <boxGeometry args={[0.55, 0.22, 0.55]} />
        <meshStandardMaterial color={SANDSTONE_DARK} roughness={0.9} />
        {columns.map((p, i) => (
          <Instance key={i} position={[p[0], 3.05, p[2]]} />
        ))}
      </Instances>
      {/* lintel beams over the colonnades */}
      <mesh position={[GREAT_COURT.center.x, 3.35, northWing.z + northWing.hd + 0.7]} castShadow>
        <boxGeometry args={[northWing.hw * 2 - 1, 0.4, 0.8]} />
        <meshStandardMaterial color={SANDSTONE} roughness={0.9} />
      </mesh>
      {[westWing.x + westWing.hw + 0.7, eastWing.x - eastWing.hw - 0.7].map((x) => (
        <mesh key={x} position={[x, 3.35, westWing.z]} castShadow>
          <boxGeometry args={[0.8, 0.4, westWing.hd * 2 - 1]} />
          <meshStandardMaterial color={SANDSTONE} roughness={0.9} />
        </mesh>
      ))}
      {/* warm cloister glow strips behind the columns */}
      <mesh position={[GREAT_COURT.center.x, 1.4, northWing.z + northWing.hd + 0.08]}>
        <planeGeometry args={[northWing.hw * 2 - 1.5, 2.6]} />
        <meshStandardMaterial color="#241a10" emissive="#ff9d4a" emissiveIntensity={0.55} />
      </mesh>

      {/* south entrance gate: pillars + arch lintel */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[gate.x + side * gate.halfOpening, gate.h / 2, gate.z]}
          castShadow
        >
          <boxGeometry args={[1, gate.h, 1.4]} />
          <meshStandardMaterial map={wingTexture(1, gate.h)} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[gate.x, gate.h - 0.5, gate.z]} castShadow>
        <boxGeometry args={[gate.halfOpening * 2 + 1, 1.2, 1.6]} />
        <meshStandardMaterial color={SANDSTONE_DARK} roughness={0.9} />
      </mesh>
      {/* gate lanterns */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[gate.x + side * gate.halfOpening, gate.h + 0.35, gate.z]}>
          <sphereGeometry args={[0.16, 10, 10]} />
          <meshBasicMaterial color={[2.4, 1.9, 1.1]} toneMapped={false} />
        </mesh>
      ))}

      {/* clock tower */}
      <group position={[tower.x, 0, tower.z]}>
        <mesh position={[0, tower.h / 2, 0]} castShadow>
          <boxGeometry args={[tower.w, tower.h, tower.w]} />
          <meshStandardMaterial map={wingTexture(tower.w / 2, tower.h)} roughness={0.9} />
        </mesh>
        {/* stepped cap + belfry openings */}
        <mesh position={[0, tower.h + 0.3, 0]} castShadow>
          <boxGeometry args={[tower.w + 0.7, 0.6, tower.w + 0.7]} />
          <meshStandardMaterial color={SANDSTONE_DARK} roughness={0.95} />
        </mesh>
        {[0, Math.PI / 2].map((ry) => (
          <mesh key={ry} position={[0, tower.h - 5.2, 0]} rotation-y={ry}>
            <boxGeometry args={[tower.w + 0.06, 1.6, 1.1]} />
            <meshStandardMaterial color="#1c1408" emissive="#ffca7a" emissiveIntensity={0.8} />
          </mesh>
        ))}
        <mesh position={[0, tower.h + 1.7, 0]} castShadow>
          <coneGeometry args={[tower.w * 0.78, 2.6, 4]} />
          <meshStandardMaterial color="#5d4a7a" roughness={0.95} />
        </mesh>
        {/* clock faces, gently lit */}
        {[0, Math.PI].map((ry) => (
          <mesh key={ry} position={[Math.sin(ry) * (tower.w / 2 + 0.02) * 0, tower.h - 2.2, ry === 0 ? tower.w / 2 + 0.02 : -(tower.w / 2 + 0.02)]} rotation-y={ry}>
            <planeGeometry args={[2, 2]} />
            <meshStandardMaterial map={clockFace} emissiveMap={clockFace} emissive="#fff6d8" emissiveIntensity={0.55} />
          </mesh>
        ))}
        {/* tower uplight glow */}
        <pointLight position={[0, 3, 3]} intensity={26} distance={17} color="#ffd9a0" />
      </group>

      {/* scholarship plaque */}
      <group position={[GREAT_COURT.plaque.x, 0, GREAT_COURT.plaque.z]}>
        <mesh position={[0, 0.55, 0]} rotation-x={-0.25} castShadow>
          <boxGeometry args={[1, 0.8, 0.14]} />
          <meshStandardMaterial color="#6b7694" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[0.5, 0.36, 0.3]} />
          <meshStandardMaterial color="#3d4354" roughness={0.9} />
        </mesh>
      </group>

      {/* court lantern light */}
      <pointLight position={[GREAT_COURT.center.x, 4, GREAT_COURT.center.z + 2]} intensity={34} distance={24} color="#ffd0a3" />
    </group>
  );
}

/* ---------------------------------- career towers ---------------------------------- */

export function CareerDistrict() {
  return (
    <group>
      {OFFICES.map((o, i) => (
        <OfficeTower key={o.payload.id} spec={o} seed={i} />
      ))}
      <pointLight position={[28, 5, -18]} intensity={30} distance={26} color="#a8ccff" />
    </group>
  );
}

function OfficeTower({
  spec,
  seed,
}: {
  spec: (typeof OFFICES)[number];
  seed: number;
}) {
  const windows = useLitWindows(8, 14, seed % 2 === 0 ? "#ffd98a" : "#bfe3ff", 0.5);
  return (
    <group position={[spec.x, 0, spec.z]}>
      <mesh position={[0, spec.h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[spec.w, spec.h, spec.d]} />
        <meshStandardMaterial
          color="#131a2c"
          emissiveMap={windows}
          emissive="#ffffff"
          emissiveIntensity={1.5}
          roughness={0.55}
          metalness={0.35}
        />
      </mesh>
      {/* roof trim + accent beacon */}
      <mesh position={[0, spec.h + 0.25, 0]}>
        <boxGeometry args={[spec.w + 0.4, 0.5, spec.d + 0.4]} />
        <meshStandardMaterial color="#0c1120" roughness={0.8} />
      </mesh>
      <mesh position={[0, spec.h + 0.8, 0]}>
        <sphereGeometry args={[0.22, 10, 10]} />
        <meshBasicMaterial color={new THREE.Color(spec.accent).multiplyScalar(2.4)} toneMapped={false} />
      </mesh>
      {/* entrance */}
      <mesh position={[0, 1.1, spec.d / 2 + 0.02]}>
        <planeGeometry args={[1.8, 2.2]} />
        <meshStandardMaterial color="#0a0d16" emissive="#ffe9c4" emissiveIntensity={0.7} />
      </mesh>
      <Label position={[0, spec.h + 2.2, 0]} accent={spec.accent}>
        {spec.label.toUpperCase()}
      </Label>
    </group>
  );
}

/* ---------------------------------- café + post office ---------------------------------- */

export function Cafe() {
  return (
    <group position={[CAFE.x, 0, CAFE.z]}>
      <mesh position={[0, 1.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[CAFE.w, 3.2, CAFE.d]} />
        <meshStandardMaterial color="#6d4a33" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.5, 0]} castShadow>
        <coneGeometry args={[CAFE.w * 0.78, 1.6, 4]} />
        <meshStandardMaterial color="#42291c" roughness={0.95} />
      </mesh>
      {/* awning stripes over the door (east side, facing the path) */}
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[CAFE.w / 2 + 0.5, 2.35, -1.5 + i]}
          rotation-z={-0.5}
        >
          <boxGeometry args={[1.3, 0.06, 0.98]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#4ef08a" : "#f2f4ff"} roughness={0.8} />
        </mesh>
      ))}
      {/* warm doorway + window */}
      <mesh position={[CAFE.w / 2 + 0.02, 1.2, 1.4]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[1.4, 2.2]} />
        <meshStandardMaterial color="#141008" emissive="#ffc885" emissiveIntensity={1.7} />
      </mesh>
      <mesh position={[CAFE.w / 2 + 0.02, 1.7, -1.4]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[1.7, 1.1]} />
        <meshStandardMaterial color="#141008" emissive="#ffc885" emissiveIntensity={1.4} />
      </mesh>
      {/* steam over the roof vent */}
      <Sparkles count={8} position={[0.8, 4.6, 0]} scale={[0.8, 1.6, 0.8]} size={1.6} speed={0.5} color="#cfd8e6" />
      <pointLight position={[CAFE.w / 2 + 1.6, 2.2, 0]} intensity={20} distance={13} color="#ffb46b" />
    </group>
  );
}

export function PostOffice() {
  return (
    <group position={[POST.x, 0, POST.z]}>
      <mesh position={[0, 1.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[POST.w, 3.4, POST.d]} />
        <meshStandardMaterial color="#5a6a8f" roughness={0.85} />
      </mesh>
      <mesh position={[0, 3.75, 0]} castShadow>
        <boxGeometry args={[POST.w + 0.5, 0.7, POST.d + 0.5]} />
        <meshStandardMaterial color="#b03e3e" roughness={0.85} />
      </mesh>
      {/* door on the west side, facing the path */}
      <mesh position={[-POST.w / 2 - 0.02, 1.2, 0]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[1.5, 2.3]} />
        <meshStandardMaterial color="#100c08" emissive="#ffe1b0" emissiveIntensity={1.5} />
      </mesh>
      {/* red mailbox by the door */}
      <mesh position={[-POST.w / 2 - 1.4, 0.55, 1.6]} castShadow>
        <cylinderGeometry args={[0.28, 0.28, 1.1, 10]} />
        <meshStandardMaterial color="#c74b4b" roughness={0.6} />
      </mesh>
      <pointLight position={[-POST.w / 2 - 1.6, 2.4, 0]} intensity={20} distance={13} color="#ffd9a8" />
    </group>
  );
}

/* ---------------------------------- arcade ---------------------------------- */

export function Arcade() {
  return (
    <group>
      {/* pavilion canopy */}
      <mesh position={[ARCADE.x, 4.4, ARCADE.z - 1]} castShadow>
        <boxGeometry args={[ARCADE.hw * 2 + 1.5, 0.35, 5.5]} />
        <meshStandardMaterial color="#141828" roughness={0.85} />
      </mesh>
      {[ARCADE.x - ARCADE.hw - 0.4, ARCADE.x + ARCADE.hw + 0.4].map((x) => (
        <mesh key={x} position={[x, 2.2, ARCADE.z + 0.8]} castShadow>
          <cylinderGeometry args={[0.14, 0.14, 4.4, 8]} />
          <meshStandardMaterial color="#2a3048" roughness={0.7} />
        </mesh>
      ))}
      {/* neon strip under the canopy */}
      <mesh position={[ARCADE.x, 4.05, ARCADE.z + 1.4]}>
        <boxGeometry args={[ARCADE.hw * 2 + 1.2, 0.1, 0.1]} />
        <meshBasicMaterial color={[2.6, 0.7, 2.2]} toneMapped={false} />
      </mesh>
      {CABINETS.map((c) => (
        <ArcadeCabinet key={c.payload.id} spec={c} />
      ))}
      <pointLight position={[ARCADE.x, 3.4, ARCADE.z + 3]} intensity={26} distance={20} color="#ff8fd9" />
    </group>
  );
}

function ArcadeCabinet({ spec }: { spec: (typeof CABINETS)[number] }) {
  const accent = new THREE.Color(spec.accent);
  return (
    <group position={[spec.x, 0, spec.z]}>
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[1.15, 1.9, 0.95]} />
        <meshStandardMaterial color="#1c2138" roughness={0.6} />
      </mesh>
      {/* marquee */}
      <mesh position={[0, 1.98, 0.1]}>
        <boxGeometry args={[1.15, 0.28, 0.75]} />
        <meshBasicMaterial color={accent.clone().multiplyScalar(1.9)} toneMapped={false} />
      </mesh>
      {/* screen faces the walkway (south) */}
      <mesh position={[0, 1.35, 0.49]} rotation-x={-0.12}>
        <planeGeometry args={[0.8, 0.62]} />
        <meshBasicMaterial color={[0.35, 1.5, 1.9]} toneMapped={false} />
      </mesh>
      {/* control deck */}
      <mesh position={[0, 0.92, 0.55]} rotation-x={0.5} castShadow>
        <boxGeometry args={[1.05, 0.1, 0.5]} />
        <meshStandardMaterial color="#262c48" roughness={0.7} />
      </mesh>
      <Label
        position={[0, 2.6, 0]}
        accent={spec.accent}
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
      <pointLight position={[-27, 3, 22]} intensity={22} distance={20} color="#9fffc9" />
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
  const glow = new THREE.Color(spec.accent).multiplyScalar(1.7);
  return (
    <group position={[spec.x, 0, spec.z]}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.75, 0.6, 6]} />
        <meshStandardMaterial color="#3d4354" roughness={0.9} />
      </mesh>
      <mesh ref={ref} position={[0, 1.5, 0]} castShadow>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial
          color={spec.accent}
          emissive={glow}
          emissiveIntensity={1}
          roughness={0.25}
          metalness={0.1}
        />
      </mesh>
      <Label
        position={[0, 2.7, 0]}
        accent={spec.accent}
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
  const water = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (water.current) {
      (water.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.35 + Math.sin(clock.elapsedTime * 1.6) * 0.12;
    }
  });
  return (
    <group>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.7, 2.9, 0.8, 24]} />
        <meshStandardMaterial color="#4a5064" roughness={0.85} />
      </mesh>
      <mesh ref={water} position={[0, 0.72, 0]}>
        <cylinderGeometry args={[2.35, 2.35, 0.14, 24]} />
        <meshStandardMaterial color="#1d4e89" emissive="#3a77c2" emissiveIntensity={0.4} roughness={0.15} />
      </mesh>
      <mesh position={[0, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.42, 1, 12]} />
        <meshStandardMaterial color="#4a5064" roughness={0.85} />
      </mesh>
      <Sparkles count={22} position={[0, 1.6, 0]} scale={[2.4, 1.2, 2.4]} size={2} speed={0.8} color="#bfe3ff" />
      <pointLight position={[0, 2.6, 0]} intensity={30} distance={17} color="#bcd9ff" />
    </group>
  );
}

/* ---------------------------------- street lamps ---------------------------------- */

export function StreetLamps() {
  return (
    <group>
      {/* poles + heads: 2 instanced draw calls */}
      <Instances limit={LAMPS.length} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 3.1, 6]} />
        <meshStandardMaterial color="#232838" roughness={0.7} />
        {LAMPS.map((l, i) => (
          <Instance key={i} position={[l.x, 1.55, l.z]} />
        ))}
      </Instances>
      <Instances limit={LAMPS.length}>
        <sphereGeometry args={[0.17, 10, 10]} />
        <meshBasicMaterial color={[2.5, 2, 1.15]} toneMapped={false} />
        {LAMPS.map((l, i) => (
          <Instance key={i} position={[l.x, 3.18, l.z]} />
        ))}
      </Instances>
      {/* soft pools of light on the ground below (cheap, no real lights) */}
      <Instances limit={LAMPS.length}>
        <circleGeometry args={[2.3, 20]} />
        <meshBasicMaterial color="#8a7448" transparent opacity={0.14} depthWrite={false} />
        {LAMPS.map((l, i) => (
          <Instance key={i} position={[l.x, 0.045, l.z]} rotation={[-Math.PI / 2, 0, 0]} />
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
          <div className="pointer-events-none select-none whitespace-nowrap rounded border border-line bg-black/45 px-3 py-1 font-pixel text-[9px] tracking-widest text-ink/80 backdrop-blur-sm">
            {z.label}
          </div>
        </Html>
      ))}
    </group>
  );
}
