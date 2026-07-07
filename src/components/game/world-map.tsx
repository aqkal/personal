"use client";

import { useEffect, useRef } from "react";
import {
  ARCADE,
  CABINETS,
  CAFE,
  CRYSTALS,
  GREAT_COURT,
  OFFICES,
  POST,
  TREES,
} from "@/game3d/layout";
import { playerHeading, playerPos } from "@/game3d/state";

/**
 * Top-down schematic of the world, shared by the corner minimap and the
 * full map overlay. Pure canvas 2D drawn from layout data; the player
 * marker updates on rAF without touching React state.
 */

// world window shown on the map
const WX0 = -48;
const WX1 = 48;
const WZ0 = -42;
const WZ1 = 66;
export const MAP_ASPECT = (WZ1 - WZ0) / (WX1 - WX0);

function drawBase(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const sx = w / (WX1 - WX0);
  const sy = h / (WZ1 - WZ0);
  const X = (x: number) => (x - WX0) * sx;
  const Z = (z: number) => (z - WZ0) * sy;
  const RW = (v: number) => v * sx;
  const RH = (v: number) => v * sy;

  // ground
  ctx.fillStyle = "#0c1810";
  ctx.fillRect(0, 0, w, h);

  // river
  ctx.fillStyle = "#14335c";
  ctx.fillRect(0, Z(41), w, h - Z(41)); // south
  ctx.fillRect(X(44), 0, w - X(44), h); // east
  ctx.fillRect(0, Z(0), X(-44), h - Z(0)); // west reach

  // roads
  ctx.fillStyle = "#4a5168";
  ctx.fillRect(X(-1.8), Z(-42), RW(3.6), RH(84)); // NS
  ctx.fillRect(X(-42), Z(-1.8), RW(84), RH(3.6)); // EW
  for (const px of [-27, 27]) {
    ctx.fillRect(X(px - 1.5), Z(-18), RW(3), RH(16));
    ctx.fillRect(X(px - 1.5), Z(4), RW(3), RH(16));
  }
  // bridge + lookout
  ctx.fillRect(X(-2.3), Z(42), RW(4.6), RH(16));
  ctx.beginPath();
  ctx.arc(X(0), Z(58.5), RW(7), 0, Math.PI * 2);
  ctx.fill();

  // plaza
  ctx.fillStyle = "#565f78";
  ctx.beginPath();
  ctx.arc(X(0), Z(0), RW(9.5), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a5f8f";
  ctx.beginPath();
  ctx.arc(X(0), Z(0), RW(2.4), 0, Math.PI * 2);
  ctx.fill();

  // trees (tiny dots)
  for (const t of TREES) {
    ctx.fillStyle = t.kind === "jacaranda" ? "#7a5cc4" : "#1f4a30";
    ctx.beginPath();
    ctx.arc(X(t.x), Z(t.z), Math.max(1.2, RW(0.9)), 0, Math.PI * 2);
    ctx.fill();
  }

  // Great Court (sandstone ring)
  ctx.fillStyle = "#d3bc8d";
  const wings = [
    GREAT_COURT.northWing,
    GREAT_COURT.westWing,
    GREAT_COURT.eastWing,
    GREAT_COURT.southWest,
    GREAT_COURT.southEast,
  ];
  for (const wg of wings) {
    ctx.fillRect(X(wg.x - wg.hw), Z(wg.z - wg.hd), RW(wg.hw * 2), RH(wg.hd * 2));
  }
  ctx.fillStyle = "#f2e3bb";
  ctx.fillRect(X(GREAT_COURT.tower.x - 1.2), Z(GREAT_COURT.tower.z - 1.2), RW(2.4), RH(2.4));

  // career towers
  for (const [i, o] of OFFICES.entries()) {
    ctx.fillStyle = "#1b2438";
    ctx.strokeStyle = o.accent;
    ctx.lineWidth = Math.max(1, RW(0.5));
    ctx.fillRect(X(o.x - o.w / 2), Z(o.z - o.d / 2), RW(o.w), RH(o.d));
    ctx.strokeRect(X(o.x - o.w / 2), Z(o.z - o.d / 2), RW(o.w), RH(o.d));
    void i;
  }

  // café + post office
  ctx.fillStyle = "#8a6248";
  ctx.fillRect(X(CAFE.x - CAFE.w / 2), Z(CAFE.z - CAFE.d / 2), RW(CAFE.w), RH(CAFE.d));
  ctx.fillStyle = "#5a6a8f";
  ctx.fillRect(X(POST.x - POST.w / 2), Z(POST.z - POST.d / 2), RW(POST.w), RH(POST.d));

  // arcade
  ctx.fillStyle = "#1c2138";
  ctx.strokeStyle = "#ff6bd6";
  ctx.lineWidth = Math.max(1, RW(0.5));
  ctx.fillRect(X(ARCADE.x - ARCADE.hw), Z(ARCADE.z - ARCADE.hd), RW(ARCADE.hw * 2), RH(ARCADE.hd * 2));
  ctx.strokeRect(X(ARCADE.x - ARCADE.hw), Z(ARCADE.z - ARCADE.hd), RW(ARCADE.hw * 2), RH(ARCADE.hd * 2));
  for (const c of CABINETS) {
    ctx.fillStyle = c.accent;
    ctx.fillRect(X(c.x - 0.6), Z(c.z - 0.6), Math.max(2, RW(1.2)), Math.max(2, RH(1.2)));
  }

  // skill crystals
  for (const c of CRYSTALS) {
    ctx.fillStyle = c.accent;
    ctx.beginPath();
    ctx.arc(X(c.x), Z(c.z), Math.max(1.6, RW(0.9)), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const sx = w / (WX1 - WX0);
  const sy = h / (WZ1 - WZ0);
  const px = (playerPos.x - WX0) * sx;
  const pz = (playerPos.z - WZ0) * sy;
  const a = playerHeading.value;
  const r = Math.max(4, w * 0.02);
  ctx.save();
  ctx.translate(px, pz);
  // heading = atan2(vx, vz): rotate so the wedge points along movement
  ctx.rotate(Math.atan2(Math.sin(a), Math.cos(a)));
  ctx.fillStyle = "#4ef08a";
  ctx.shadowColor = "#4ef08a";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(0, r * 1.5);
  ctx.lineTo(-r * 0.8, -r);
  ctx.lineTo(0, -r * 0.4);
  ctx.lineTo(r * 0.8, -r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function useMapCanvas(size: number) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = size;
    const h = Math.round(size * MAP_ASPECT);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const base = document.createElement("canvas");
    base.width = w * dpr;
    base.height = h * dpr;
    const bctx = base.getContext("2d")!;
    bctx.scale(dpr, dpr);
    drawBase(bctx, w, h);

    let raf = 0;
    const loop = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(base, 0, 0, w, h);
      drawPlayer(ctx, w, h);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [size]);
  return canvasRef;
}

export function Minimap({ onExpand }: { onExpand: () => void }) {
  const ref = useMapCanvas(132);
  return (
    <button
      type="button"
      onClick={onExpand}
      title="Open map (M)"
      className="group absolute left-3 top-14 z-30 overflow-hidden rounded-lg border border-line bg-black/55 p-1 backdrop-blur-sm transition-colors hover:border-neon/50"
    >
      <canvas ref={ref} style={{ width: 132, height: Math.round(132 * MAP_ASPECT) }} />
      <span className="pointer-events-none absolute bottom-1 right-1.5 font-pixel text-[7px] text-muted group-hover:text-neon">
        M · MAP
      </span>
      <span className="pointer-events-none absolute left-1.5 top-1 font-pixel text-[7px] text-muted">
        N ↑
      </span>
    </button>
  );
}

const LEGEND = [
  { color: "#d3bc8d", label: "UQ Campus (education)" },
  { color: "#53d8ff", label: "Career District (experience)" },
  { color: "#ff6bd6", label: "Project Arcade (projects)" },
  { color: "#4ef08a", label: "Skills Garden" },
  { color: "#8a6248", label: "Blog Café" },
  { color: "#5a6a8f", label: "Post Office" },
  { color: "#14335c", label: "Brisbane River + lookout" },
];

const MAP_LABELS = [
  { x: -27, z: -24, label: "UQ CAMPUS" },
  { x: 27, z: -20, label: "CAREER" },
  { x: -27, z: 22, label: "GARDEN" },
  { x: 27, z: 22, label: "ARCADE" },
  { x: -35, z: 4, label: "CAFÉ" },
  { x: 35, z: 4, label: "POST" },
  { x: 0, z: 58, label: "LOOKOUT" },
];

export function MapOverlay({ onClose }: { onClose: () => void }) {
  const size = Math.min(
    440,
    typeof window !== "undefined" ? window.innerWidth - 80 : 440,
  );
  const ref = useMapCanvas(size);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "m" || e.key === "M") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="World map"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-full flex-col items-center gap-4 overflow-y-auto rounded-xl border-2 border-neon/40 bg-[#0b1120f5] p-5 sm:flex-row sm:items-start">
        <div className="relative shrink-0">
          <canvas
            ref={ref}
            style={{ width: size, height: Math.round(size * MAP_ASPECT) }}
            className="rounded border border-line"
          />
          {MAP_LABELS.map((l) => (
            <span
              key={l.label}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded bg-black/65 px-1.5 py-0.5 font-pixel text-[8px] text-ink/90"
              style={{
                left: `${((l.x + 48) / 96) * 100}%`,
                top: `${((l.z + 42) / 108) * 100}%`,
              }}
            >
              {l.label}
            </span>
          ))}
        </div>
        <div className="min-w-[190px]">
          <h2 className="font-pixel text-[10px] text-neon">CAMPUS MAP</h2>
          <ul className="mt-3 space-y-2">
            {LEGEND.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-xs text-muted">
                <span
                  className="inline-block size-3 rounded-sm border border-black/40"
                  style={{ background: item.color }}
                />
                {item.label}
              </li>
            ))}
            <li className="flex items-center gap-2 text-xs text-neon">
              <span className="inline-block size-3 rotate-45 rounded-sm bg-neon" />
              You are here
            </li>
          </ul>
          <p className="mt-4 font-pixel text-[8px] leading-relaxed text-muted">
            M / ESC · CLOSE
          </p>
        </div>
      </div>
    </div>
  );
}
