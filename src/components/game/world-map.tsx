"use client";

import { useEffect, useRef } from "react";
import {
  BRIDGE,
  LOOKOUT,
  CAMPUS_CLOISTERS,
  CAMPUS_LAKE,
  CAFE,
  CRYSTALS,
  GARDEN,
  GREAT_COURT,
  POST,
  PROJECT_POSITIONS,
  WORLD_BOUNDS,
  WORLD_PATHS,
} from "@/game3d/layout";
import { AUTHORED_SOLIDS, AUTHORED_TREES, PROJECT_GALLERY } from "@/game3d/authored-layout";
import { BUGGY_BAYS, BUGGY_ROADS, FERRY_DOCKS, SCOOTER_START } from "@/game3d/travel-layout";
import { MAINLAND_OUTLINE } from "@/game3d/terrain";
import { cameraOrbit, playerHeading, playerPos, runtime, travelState } from "@/game3d/state";
import { navigation } from "@/game3d/navigation";

/**
 * Top-down schematic of the world, shared by the corner minimap and the
 * full map overlay. Pure canvas 2D drawn from layout data; the player
 * marker updates on rAF without touching React state.
 */

// world window shown on the map
const WX0 = WORLD_BOUNDS.minX - 4;
const WX1 = WORLD_BOUNDS.maxX + 4;
const WZ0 = WORLD_BOUNDS.minZ - 3;
const WZ1 = WORLD_BOUNDS.maxZ + 3;
export const MAP_ASPECT = (WZ1 - WZ0) / (WX1 - WX0);

const MAP_AREAS = [
  { label: "Great Court", x: GREAT_COURT.center.x, z: GREAT_COURT.center.z, radius: 25 },
  { label: "UQ Lakes", x: CAMPUS_LAKE.x, z: CAMPUS_LAKE.z, radius: 13 },
  { label: "Duhig Library", x: -60, z: -10, radius: 11 },
  { label: "Career District", x: 27, z: -28, radius: 20 },
  { label: "Welcome Plaza", x: 0, z: 0, radius: 13 },
  { label: "Blog Café", x: CAFE.x, z: CAFE.z, radius: 9 },
  { label: "Post Office", x: POST.x, z: POST.z, radius: 8 },
  { label: "Skills Garden", x: GARDEN.x, z: GARDEN.z, radius: 11 },
  { label: "Project Gallery", x: (PROJECT_GALLERY.minX + PROJECT_GALLERY.maxX) / 2, z: (PROJECT_GALLERY.minZ + PROJECT_GALLERY.maxZ) / 2, radius: 12 },
  { label: "River Bridge", x: 0, z: 56, radius: 22 },
  { label: "City Lookout", x: 0, z: LOOKOUT.z, radius: 10 },
] as const;

const MAP_LABELS = [
  MAP_AREAS[0],
  MAP_AREAS[1],
  MAP_AREAS[3],
  MAP_AREAS[4],
  MAP_AREAS[7],
  MAP_AREAS[8],
  MAP_AREAS[10],
] as const;

function drawBase(ctx: CanvasRenderingContext2D, w: number, h: number, compact: boolean) {
  const sx = w / (WX1 - WX0);
  const sy = h / (WZ1 - WZ0);
  const X = (x: number) => (x - WX0) * sx;
  const Z = (z: number) => (z - WZ0) * sy;
  const RW = (v: number) => v * sx;
  const RH = (v: number) => v * sy;

  // Water surrounds the single rounded St Lucia island.
  ctx.fillStyle = "#477a7d";
  ctx.fillRect(0, 0, w, h);
  ctx.beginPath();
  MAINLAND_OUTLINE.forEach((point, i) => {
    if (!i) ctx.moveTo(X(point.x), Z(point.z)); else ctx.lineTo(X(point.x), Z(point.z));
  });
  ctx.closePath();
  ctx.strokeStyle = "#8ab5a6";
  ctx.lineWidth = Math.max(2, RW(1.4));
  ctx.stroke();
  ctx.fillStyle = "#6d8652";
  ctx.fill();

  // Softly light the island toward the plaza.
  ctx.save();
  ctx.clip();
  const glow = ctx.createRadialGradient(X(0), Z(0), 0, X(0), Z(0), w * 0.7);
  glow.addColorStop(0, "rgba(255,244,222,0.14)");
  glow.addColorStop(1, "rgba(255,244,222,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // The same path footprints feed the 3D paving and cartography.
  ctx.fillStyle = "#c6bca9";
  ctx.strokeStyle = "rgba(30,45,30,0.2)";
  ctx.lineWidth = 0.6;
  for (const path of WORLD_PATHS) {
    ctx.fillRect(X(path.x - path.w / 2), Z(path.z - path.d / 2), RW(path.w), RH(path.d));
    ctx.strokeRect(X(path.x - path.w / 2), Z(path.z - path.d / 2), RW(path.w), RH(path.d));
  }
  // The road loop and branches come from the same contract as buggy physics.
  ctx.fillStyle = "#a79d8b";
  for (const road of BUGGY_ROADS) {
    ctx.fillRect(X(road.x - road.w / 2), Z(road.z - road.d / 2), RW(road.w), RH(road.d));
  }
  // bridge + lookout
  ctx.fillStyle = "#c6bca9";
  ctx.fillRect(X(-2.3), Z(BRIDGE.from), RW(4.6), RH(BRIDGE.to - BRIDGE.from));
  ctx.beginPath();
  ctx.ellipse(X(0), Z(LOOKOUT.z), RW(LOOKOUT.r), RH(LOOKOUT.r), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // The two boarding jetties mirror the raised walkable surfaces.
  ctx.fillRect(X(-15.6), Z(39), RW(3.2), RH(7.5));
  ctx.fillRect(X(-17.5), Z(45.3), RW(7), RH(2.4));
  ctx.fillRect(X(-14.2), Z(82.9), RW(11.2), RH(2.2));
  ctx.fillRect(X(-14.2), Z(81), RW(2.4), RH(6));

  // plaza
  ctx.fillStyle = "#c6bca9";
  ctx.beginPath();
  ctx.arc(X(0), Z(0), RW(9.5), 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#4e94d4";
  ctx.beginPath();
  ctx.arc(X(0), Z(0), RW(2.4), 0, Math.PI * 2);
  ctx.fill();

  // Authored tree trunks are the source of truth for scenery and collisions.
  for (const [x, z] of AUTHORED_TREES) {
    ctx.fillStyle = "#47734d";
    ctx.beginPath();
    ctx.arc(X(x), Z(z), Math.max(1.2, RW(0.9)), 0, Math.PI * 2);
    ctx.fill();
  }

  // Ground-level authored building masses. Small arch and roof colliders stay off the map.
  const architecture = AUTHORED_SOLIDS.filter((solid) =>
    solid.type === "box" && solid.baseY <= 2.1 && solid.height >= 4 &&
    (solid.half?.[0] ?? 0) * (solid.half?.[1] ?? 0) >= 3,
  );
  for (const solid of architecture) {
    const half = solid.half!;
    const heritage = /Court|Forgan|Duhig/.test(solid.id);
    ctx.save(); ctx.translate(X(solid.center[0]), Z(solid.center[1])); ctx.rotate(-solid.rotation);
    ctx.fillStyle = heritage ? "#d6c3a3" : "#b7b7aa";
    ctx.fillRect(-RW(half[0]), -RH(half[1]), RW(half[0] * 2), RH(half[1] * 2));
    ctx.strokeStyle = heritage ? "#8b7964" : "#706653"; ctx.lineWidth = 0.7;
    ctx.strokeRect(-RW(half[0]), -RH(half[1]), RW(half[0] * 2), RH(half[1] * 2));
    ctx.restore();
  }
  ctx.strokeStyle = "#e1ccaa"; ctx.lineWidth = Math.max(2, RW(2.6));
  ctx.beginPath();
  CAMPUS_CLOISTERS.forEach((c, i) => { if (!i) ctx.moveTo(X(c.x), Z(c.z)); else ctx.lineTo(X(c.x), Z(c.z)); }); ctx.stroke();
  ctx.fillStyle = "#497e83";
  ctx.beginPath(); ctx.ellipse(X(CAMPUS_LAKE.x), Z(CAMPUS_LAKE.z), RW(CAMPUS_LAKE.rx), RH(CAMPUS_LAKE.rz), 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#cfbf9b"; ctx.lineWidth = Math.max(1, RW(1.2));
  ctx.beginPath(); ctx.ellipse(X(CAMPUS_LAKE.x), Z(CAMPUS_LAKE.z), RW(12.5), RH(10), 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#e0d4b9"; ctx.fillRect(X(-2), Z(-44), RW(10), RH(5));

  // A single footprint keeps the open gallery readable among its five displays.
  ctx.fillStyle = "rgba(246,239,223,0.82)";
  ctx.strokeStyle = "#8a6110";
  ctx.lineWidth = compact ? 0.8 : 1.2;
  ctx.fillRect(X(PROJECT_GALLERY.minX), Z(PROJECT_GALLERY.minZ), RW(PROJECT_GALLERY.maxX - PROJECT_GALLERY.minX), RH(PROJECT_GALLERY.maxZ - PROJECT_GALLERY.minZ));
  ctx.strokeRect(X(PROJECT_GALLERY.minX), Z(PROJECT_GALLERY.minZ), RW(PROJECT_GALLERY.maxX - PROJECT_GALLERY.minX), RH(PROJECT_GALLERY.maxZ - PROJECT_GALLERY.minZ));

  // Project description stops share the Engineering frontage.
  for (const project of PROJECT_POSITIONS) {
    ctx.fillStyle = "#8a6110";
    ctx.beginPath();
    ctx.arc(X(project.x), Z(project.z), Math.max(1.8, RW(.8)), 0, Math.PI * 2);
    ctx.fill();
  }
  // Skills Garden stations use their category accent and remain distinct from buildings.
  for (const station of CRYSTALS) {
    const x = X(station.x);
    const z = Z(station.z);
    const r = Math.max(2.2, RW(.95));
    ctx.save();
    ctx.translate(x, z);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = station.accent;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.strokeStyle = "rgba(54,47,37,0.7)";
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  }
  // Ferry boarding anchors are shown without creating direct-travel shortcuts.
  for (const dock of FERRY_DOCKS) {
    ctx.fillStyle = "#f6df9c";
    ctx.strokeStyle = "#72571e";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(X(dock.x), Z(dock.z), Math.max(1.6, RW(.75)), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Buggy bays are transport pickup points rather than destination stops.
  for (const bay of BUGGY_BAYS) {
    const r = compact ? 2 : 3.2;
    ctx.fillStyle = "#415866";
    ctx.fillRect(X(bay.x) - r, Z(bay.z) - r, r * 2, r * 2);
  }
  ctx.fillStyle = "#47734d";
  ctx.strokeStyle = "#f7efdd";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(X(SCOOTER_START.x), Z(SCOOTER_START.z), compact ? 2.2 : 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (!compact) {
    ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const area of MAP_LABELS) {
      const x = X(area.x);
      const z = Z(area.z);
      const width = ctx.measureText(area.label).width + 10;
      ctx.fillStyle = "rgba(251,246,233,0.88)";
      ctx.fillRect(x - width / 2, z - 7, width, 14);
      ctx.fillStyle = "#51483a";
      ctx.fillText(area.label, x, z);
    }
  }
}

function mapPoint(x: number, z: number, w: number, h: number) {
  return {
    x: (x - WX0) / (WX1 - WX0) * w,
    y: (z - WZ0) / (WZ1 - WZ0) * h,
  };
}

function drawDestination(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, compact: boolean) {
  const destination = navigation.destination;
  if (!destination) return;
  const point = mapPoint(destination.x, destination.z, w, h);
  const pulse = runtime.reducedMotion ? 0.35 : (t % 1.4) / 1.4;
  const radius = compact ? 4 : 6;
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.strokeStyle = `rgba(138,97,16,${0.8 * (1 - pulse)})`;
  ctx.lineWidth = compact ? 1.2 : 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, radius + pulse * radius * 1.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = navigation.arrived ? "#47734d" : "#d49a2a";
  ctx.strokeStyle = "#fffaf0";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawTransport(ctx: CanvasRenderingContext2D, w: number, h: number, compact: boolean) {
  const buggy = mapPoint(travelState.buggy.x, travelState.buggy.z, w, h);
  const ferry = mapPoint(travelState.ferry.x, travelState.ferry.z, w, h);
  const scooter = mapPoint(travelState.scooter.x, travelState.scooter.z, w, h);
  const size = compact ? 2.8 : 4.2;

  ctx.save();
  ctx.translate(buggy.x, buggy.y);
  ctx.rotate(-travelState.buggy.heading);
  if (travelState.mode === "driving") {
    ctx.strokeStyle = "#fffaf0";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-size - 1, -size * 0.65 - 1, size * 2 + 2, size * 1.3 + 2);
  }
  ctx.fillStyle = "#263d49";
  ctx.fillRect(-size, -size * 0.65, size * 2, size * 1.3);
  ctx.restore();

  ctx.save();
  ctx.translate(ferry.x, ferry.y);
  ctx.rotate(-travelState.ferry.heading);
  ctx.fillStyle = "#f4cf71";
  ctx.strokeStyle = travelState.mode === "ferry" ? "#fffaf0" : "#72571e";
  ctx.lineWidth = travelState.mode === "ferry" ? 2.5 : 1;
  ctx.beginPath();
  ctx.moveTo(0, size * 1.4);
  ctx.lineTo(-size, -size);
  ctx.lineTo(size, -size);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(scooter.x, scooter.y);
  ctx.rotate(-travelState.scooter.heading);
  ctx.fillStyle = "#3d7a53";
  ctx.strokeStyle = travelState.mode === "scooter" ? "#fffaf0" : "#24442f";
  ctx.lineWidth = travelState.mode === "scooter" ? 2.5 : 1;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -size * 1.7);
  ctx.stroke();
  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
) {
  const sx = w / (WX1 - WX0);
  const sy = h / (WZ1 - WZ0);
  const px = (playerPos.x - WX0) * sx;
  const pz = (playerPos.z - WZ0) * sy;
  const r = Math.max(4, w * 0.02);
  ctx.save();
  ctx.translate(px, pz);

  // camera view cone: world forward is (-sin yaw, -cos yaw), map is x-right z-down
  const yaw = cameraOrbit.yaw;
  const look = Math.atan2(-Math.cos(yaw), -Math.sin(yaw));
  const coneR = Math.max(20, w * 0.16);
  const cone = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, coneR);
  cone.addColorStop(0, "rgba(167,139,250,0.3)");
  cone.addColorStop(1, "rgba(167,139,250,0)");
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, coneR, look - 0.55, look + 0.55);
  ctx.closePath();
  ctx.fill();

  // expanding locator pulse
  const pulse = runtime.reducedMotion ? 0.3 : (t % 1.6) / 1.6;
  ctx.strokeStyle = `rgba(167,139,250,${0.5 * (1 - pulse)})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, r * (1.2 + pulse * 1.8), 0, Math.PI * 2);
  ctx.stroke();

  // facing wedge; heading = atan2(vx, vz) and map y equals world z,
  // so screen rotation is the NEGATED heading (rotate(a) mirrors east/west)
  ctx.rotate(-playerHeading.value);
  ctx.fillStyle = "#a78bfa";
  ctx.shadowColor = "#a78bfa";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(0, r * 1.5);
  ctx.lineTo(-r * 0.8, -r);
  ctx.lineTo(0, -r * 0.4);
  ctx.lineTo(r * 0.8, -r);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(8,18,12,0.9)";
  ctx.lineWidth = 1.25;
  ctx.stroke();
  ctx.restore();
}

export function useMapCanvas(size: number, compact = false) {
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
    drawBase(bctx, w, h, compact);

    let raf = 0;
    let last = 0;
    const loop = (time: number) => {
      raf = requestAnimationFrame(loop);
      if (time - last < 50 || document.hidden) return;
      last = time;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(base, 0, 0, w, h);
      if (navigation.points.length && !navigation.arrived) {
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = "rgba(64,48,22,0.55)";
        ctx.lineWidth = compact ? 3.5 : 5;
        const route = [playerPos, ...navigation.points.slice(navigation.index)];
        route.forEach((p, i) => {
          const point = mapPoint(p.x, p.z, w, h);
          if (!i) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
        ctx.strokeStyle = "#ffe3a3";
        ctx.lineWidth = compact ? 1.6 : 2.4;
        ctx.setLineDash(compact ? [3, 2] : [5, 4]);
        ctx.stroke();
        ctx.restore();
      }
      drawDestination(ctx, w, h, time / 1000, compact);
      drawTransport(ctx, w, h, compact);
      drawPlayer(ctx, w, h, time / 1000);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [size, compact]);
  return canvasRef;
}

export function Minimap({ onExpand }: { onExpand: () => void }) {
  const width = 132;
  const ref = useMapCanvas(width, true);
  return (
    <button type="button" onClick={onExpand} aria-label="Open campus map and destinations" title="Open map (M)" className="campus-minimap game-glass block w-[92px] overflow-hidden md:w-[148px]">
      <span className="campus-minimap-canvas block">
        <canvas ref={ref} aria-hidden style={{ width, height: Math.round(width * MAP_ASPECT) }} className="block" />
      </span>
      <span className="campus-minimap-footer flex"><span aria-hidden>N ↑</span><span>Map <kbd>M</kbd></span></span>
    </button>
  );
}
