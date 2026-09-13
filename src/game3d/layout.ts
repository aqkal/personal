import { campus, education, experience, projects, skills } from "@content";
import type { PanelPayload } from "@/game/bus";
import { WAYFINDING_SIGNS } from "./signage";
import { isMainland, PEDESTRIAN_BOLLARDS } from "./terrain";
import { createPointCollisionQuery } from "./point-collision";
import { AUTHORED_SOLIDS, AUTHORED_TREES, EXHIBIT_PLACEMENTS, GALLERY_EXHIBIT_SCALE, PROJECT_GALLERY } from "./authored-layout";
import { SHORE_RAIL_PANELS } from "./shore-boundary";

/**
 * World layout: every position in the 3D campus, plus the content -> world
 * mapping. Adding an entry to content/*.ts automatically adds its building,
 * cabinet, or crystal here (see docs/ADDING_CONTENT.md).
 *
 * Axes: x = east, z = south, y = up. Units are meters-ish.
 * The map reads like Brisbane's St Lucia bend: campus in the north-west,
 * the river wrapping the south and east edges, city skyline across the water.
 */

export const ACCENTS = [
  "#ff8f7a",
  "#5fd4c8",
  "#a78bfa",
  "#f0c46a",
  "#a78bfa",
  "#ff8f6b",
] as const;

/** Circle (r) or axis-aligned rect (hw/hd = half extents) blocker. */
export type Collider =
  | { x: number; z: number; r: number }
  | { x: number; z: number; rx: number; rz: number }
  | { x: number; z: number; hw: number; hd: number; ry?: number };

export interface WorldInteractable {
  x: number;
  z: number;
  radius: number;
  /** Camera direction from the arrival point, applied only during explicit travel. */
  arrivalYaw?: number;
  /** null = hint-only marker */
  payload: PanelPayload | null;
  hint: string;
}

/* ---------------------------------- player area ---------------------------------- */

export const PLAYER_START = { x: 0, z: 8 };
export const WORLD_BOUNDS = { minX: -72, maxX: 44, minZ: -78, maxZ: 92 };

/** The lookout platform: a disc, so the walkable test is one too. */
export const LOOKOUT = { z: 85, r: 7, walkR: 6.3 };
export const LOOKOUT_TOP = 0.14;
export const BRIDGE = { from: 32, to: 80, top: 4.8, base: 0.185, riseEnd: 46, fallStart: 65, halfWalk: 1.62 };
export const LOOKOUT_BENCHES = [-4.2, 4.2].map((x) => ({ x, z: LOOKOUT.z + 0.66, hw: 1.05, hd: 0.42 }));
export function bridgeDeckHeight(z: number) {
  const t = z < BRIDGE.riseEnd ? (z - BRIDGE.from) / (BRIDGE.riseEnd - BRIDGE.from)
    : z > BRIDGE.fallStart ? (BRIDGE.to - z) / (BRIDGE.to - BRIDGE.fallStart) : 1;
  const clamped = Math.max(0, Math.min(1, t));
  return BRIDGE.base + (BRIDGE.top - BRIDGE.base) * clamped * clamped * (3 - 2 * clamped);
}

/** Shared walking surface for the character, camera, shadows and route markers. */
export function groundHeight(x: number, z: number): number {
  if ((x >= -14.2 && x <= -6 && z >= 82.9 && z <= 85.1) || (x >= -14.2 && x <= -11.8 && z >= 81 && z <= 87)) return 0.36;
  if ((x >= -15.6 && x <= -12.4 && z >= 40 && z <= 46.5) || (x >= -17.5 && x <= -10.5 && z >= 45.3 && z <= 47.7)) return 0.36;
  if (Math.abs(x) <= 2.3 && z >= BRIDGE.from && z <= BRIDGE.to) return bridgeDeckHeight(z);
  if (x * x + (z - LOOKOUT.z) ** 2 <= LOOKOUT.r ** 2) return LOOKOUT_TOP;
  if (x >= PROJECT_GALLERY.minX && x <= PROJECT_GALLERY.maxX && z >= PROJECT_GALLERY.minZ && z <= PROJECT_GALLERY.maxZ) return PROJECT_GALLERY.floorY;
  if (Math.abs(x-3)<=6.5 && Math.abs(z+53.8)<=.9) return .32;
  if (Math.abs(x-3)<=4.75 && Math.abs(z+49.1)<=1.65) return .28;
  return 0;
}

/** Walkable union: main field + bridge corridor + river lookout deck. */
export function isInsideWorld(x: number, z: number): boolean {
  if ((x >= -14.2 && x <= -3 && z >= 82.9 && z <= 85.1) || (x >= -14.2 && x <= -11.8 && z >= 81 && z <= 87)) return true;
  if ((x >= -15.6 && x <= -12.4 && z >= 39 && z <= 46.5) || (x >= -17.5 && x <= -10.5 && z >= 45.3 && z <= 47.7)) return true;
  if (isMainland(x,z)) return true;
  if (Math.abs(x) <= BRIDGE.halfWalk && z > BRIDGE.from && z <= BRIDGE.to) return true;
  const dz = z - LOOKOUT.z;
  if (z > LOOKOUT.z - LOOKOUT.walkR && x * x + dz * dz <= LOOKOUT.walkR * LOOKOUT.walkR) return true;
  return false;
}

/* ---------------------------------- structures ---------------------------------- */

/** A compact, rotated interpretation of St Lucia's D-shaped Great Court. */
export const GREAT_COURT = {
  center: { x: -36, z: -40 },
  arc: { x: -36, z: -26, rx: 26, rz: 29 },
  gate: { x: -36, z: -23, halfOpening: 2.8, pillarR: 0.5, h: 5 },
  tower: { x: -36, z: -23, w: 6.6, h: 19 },
  door: { x: -36, z: -17.8 },
  plaque: { x: -32, z: -30 },
};
export const CAMPUS_WINGS = [
  { x: -50.7, z: -23, hw: 11.9, hd: 3.3, h: 8.2, ry: 0 },
  { x: -21.3, z: -23, hw: 11.9, hd: 3.3, h: 8.2, ry: 0 },
  { x: -60, z: -52, hw: 7, hd: 3.7, h: 7.2, ry: 0.65 },
  { x: -36, z: -61, hw: 9, hd: 3.5, h: 7.6, ry: 0 },
  { x: -12, z: -52, hw: 7, hd: 3.7, h: 7.2, ry: -0.65 },
];
export const CAMPUS_CLOISTERS = Array.from({ length: 14 }, (_, i) => {
  const angle = Math.PI + (i + 0.5) / 14 * Math.PI;
  return { x: GREAT_COURT.arc.x + Math.cos(angle) * GREAT_COURT.arc.rx, z: GREAT_COURT.arc.z + Math.sin(angle) * GREAT_COURT.arc.rz, ry: Math.atan2(-Math.cos(angle), -Math.sin(angle)) };
});
export const CAMPUS_LIBRARY = { x: -60, z: -10, hw: 5.5, hd: 4, h: 13.5, ry: 0 };
export const CAMPUS_LAKE = { x: 3, z: -63, rx: 10, rz: 7.5 };
export const CAMPUS_STOPS = [
  { id: "duhig-tower", x: -60, z: -4.5 },
  { id: "uq-lakes", x: 3, z: -53 },
  { id: "amphitheatre", x: 3, z: -46 },
];

export interface OfficeSpec {
  x: number;
  z: number;
  h: number;
  w: number;
  d: number;
  accent: string;
  label: string;
  door: { x: number; z: number };
  payload: PanelPayload;
}

export const BUCKLER = { x: 25, z: -37, h: 5.8, w: 8, d: 7, door: { x: 25, z: -33.4 } } as const;

const OFFICE_SLOTS = [
  { x: 31, z: -23, h: 6.5, w: 9, d: 9 },
  BUCKLER,
  { x: 23, z: -14, h: 8, w: 6, d: 6 },
];

/**
 * Qualia: an experience entry that is still being built, so it spawns a
 * construction site (scaffolding, crane, workers) north of the plaza instead
 * of a finished office tower in the Career District.
 */
export const QUALIA_ENTRY = experience.find(
  (e) => e.world.sprite === "construction",
);

export const QUALIA = {
  x: 18,
  z: -25,
  w: 10,
  d: 10,
  floors: 3,
  floorH: 3.15,
  /** local offset of the tower crane from the site centre */
  crane: { x: 6.5, z: 1.5, h: 20, jib: 17 },
  door: { x: 18, z: -18.8 },
};
export const QUALIA_BOARD = { x: 14.1, z: -18.25, hw: 1.8, hd: 0.32, y: 0, h: 2.35 };

/** Finished towers only: the construction entry is placed by hand. */
const TOWER_EXPERIENCE = experience.filter(
  (e) => e.world.sprite !== "construction",
);

export const OFFICES: OfficeSpec[] = TOWER_EXPERIENCE.map((job, i) => {
  const slot = OFFICE_SLOTS[i % OFFICE_SLOTS.length];
  return {
    ...slot,
    accent: ACCENTS[i % ACCENTS.length],
    label: job.company,
    door: "door" in slot ? slot.door : { x: slot.x, z: slot.z + slot.d / 2 + 1.2 },
    payload: {
      kind: "experience",
      id: job.id,
      dialog: job.world.dialog,
      title: job.company,
    },
  };
});

export interface CabinetSpec {
  x: number;
  z: number;
  accent: string;
  label: string;
  payload: PanelPayload;
}

export const ARCADE = { x: 27, z: 22, hw: 10.5, hd: 4.5 };

const cabinetSlot = (i: number) => ({
  x: ARCADE.x - 8.75 + i * 3.5,
  z: ARCADE.z - 1.2,
});

export const PROJECT_POSITIONS = EXHIBIT_PLACEMENTS.slice(0,5);

export const CABINETS: CabinetSpec[] = [
  ...projects.map((p, i) => ({
    ...(PROJECT_POSITIONS[i] ?? cabinetSlot(i)),
    accent: ACCENTS[i % ACCENTS.length],
    label: p.name,
    payload: {
      kind: "project" as const,
      id: p.id,
      dialog: p.world.dialog,
      title: p.name,
    },
  })),
  // the secret playable cabinet takes the next slot
  {
    x: 19,
    z: 10,
    accent: "#a78bfa",
    label: "???",
    payload: {
      kind: "snake" as const,
      id: "snake",
      dialog: ["A dusty cabinet hums to life…", "INSERT COIN?"],
      title: "SNAKE '84",
    },
  },
];

export interface CrystalSpec {
  x: number;
  z: number;
  accent: string;
  label: string;
  payload: PanelPayload;
}

export const GARDEN = { x: -27, z: 22 };
const CRYSTAL_SLOTS = [
  { x: -32, z: 18.5 },
  { x: -22, z: 18.5 },
  { x: -32, z: 26 },
  { x: -22, z: 26 },
  { x: -27, z: 30 },
];

export const CRYSTALS: CrystalSpec[] = skills.map((cat, i) => ({
  ...CRYSTAL_SLOTS[i % CRYSTAL_SLOTS.length],
  accent: ACCENTS[(i + 2) % ACCENTS.length],
  label: cat.title,
  payload: {
    kind: "skills",
    id: cat.id,
    dialog: cat.world.dialog,
    title: cat.title,
  },
}));

export const CAFE = { x: -35, z: 1, w: 13.5, d: 5.5, door: { x: -35, z: 5.3 } };
export const POST = { x: 35, z: 4, w: 7, d: 6, door: { x: 35, z: 8.6 } };

export const WORLD_PATHS = [
  { x: 0, z: 0, w: 3.6, d: 84 },
  { x: 0, z: 0, w: 84, d: 3.6 },
  { x: -36, z: -9, w: 3.6, d: 18 },
  { x: -48, z: -4.7, w: 24, d: 2.6 },
  { x: -1, z: -30, w: 3, d: 50 },
  { x: 6, z: -53, w: 14, d: 2.6 },
  { x: -70, z: -38, w: 2.6, d: 70 },
  { x: -36, z: -72, w: 68, d: 2.6 },
  { x: 27, z: -10, w: 3, d: 16 },
  // A narrow lane passes between Qualia and DSR to the BucklerX entrance.
  { x: BUCKLER.x, z: (-18 + BUCKLER.door.z) / 2, w: 2.8, d: -18 - BUCKLER.door.z },
  { x: -27, z: 12, w: 3, d: 16 },
  { x: 27, z: 12, w: 3, d: 16 },
];

/* ---------------------------------- flora & lights ---------------------------------- */

export interface TreeSpec {
  x: number;
  z: number;
  s: number;
  kind: "jacaranda" | "fig";
}

export const TREES: TreeSpec[] = AUTHORED_TREES.map(([x,z],i)=>({x,z,s:1,kind:i%3===0?"jacaranda":"fig"}));

/* ---------------------------------- colliders ---------------------------------- */

export const COLLIDERS: Collider[] = [
  ...SHORE_RAIL_PANELS.map(({ x, z, hw, hd, ry }) => ({ x, z, hw, hd, ry })),
  ...LOOKOUT_BENCHES,
  ...PEDESTRIAN_BOLLARDS.map(p=>({x:p.x,z:p.z,r:.15})),
  ...AUTHORED_SOLIDS.filter(s => s.baseY < 1.75 && s.baseY+s.height > .34).map(s => s.type === "box"
    ? {x:s.center[0],z:s.center[1],hw:s.half![0],hd:s.half![1],ry:s.rotation}
    : {x:s.center[0],z:s.center[1],r:s.radius!}),
  QUALIA_BOARD,
  CAMPUS_LAKE,
  ...EXHIBIT_PLACEMENTS.map(p=>({x:p.x,z:p.z,hw:1.95*GALLERY_EXHIBIT_SCALE,hd:.875*GALLERY_EXHIBIT_SCALE})),
  {x:19,z:10,hw:.65,hd:.55},
  ...CRYSTALS.map(s=>({x:s.x,z:s.z,hw:.6,hd:.6})),
  ...[-2.14,2.14].map(x=>({x,z:56,hw:.12,hd:23})),
  ...WAYFINDING_SIGNS.flatMap(s=>[-1.6,1.6].map(dx=>({x:s.x+Math.cos(s.ry)*dx,z:s.z-Math.sin(s.ry)*dx,r:.08}))),
];
export const CAMERA_BLOCKS = [
  ...AUTHORED_SOLIDS.map(s=>({x:s.center[0],z:s.center[1],hw:s.half?.[0]??s.radius!,hd:s.half?.[1]??s.radius!,ry:s.rotation,minY:s.baseY,h:s.baseY+s.height})),
  ...SHORE_RAIL_PANELS.map(s=>({x:s.x,z:s.z,hw:s.hw,hd:s.hd,ry:s.ry,minY:s.y,h:s.y+s.h})),
];

export function cameraBlocked(x: number, y: number, z: number): boolean {
  if (z >= BRIDGE.from && z <= BRIDGE.to) {
    const deck = bridgeDeckHeight(z);
    if (Math.abs(x) < 2.35 && y > deck - 0.3 && y < deck + 0.06) return true;
    if (Math.abs(Math.abs(x) - 2.14) < 0.16 && y > deck && y < deck + 1.04) return true;
    if (Math.abs(z - 46) < 0.25 && y >= 4.8 && y <= 11.8 && Math.abs(Math.abs(x) - (2.4 + (y - 4.8) / 6.8 * 0.8)) < 0.25) return true;
  }
  if (z >= -44.3 && z <= -39.7 && Math.abs(x - 3) < 5.3) {
    const roof = 0.4 + Math.sqrt(Math.max(0, 5.18 ** 2 - (x - 3) ** 2));
    if (Math.abs(y - roof) < 0.35) return true;
  }
  for (const t of TREES) {
    const r = 2.4 * t.s;
    if ((t.x - x) ** 2 + (t.z - z) ** 2 + (y - 3.5 * t.s) ** 2 < r * r) return true;
  }
  for (const b of CAMERA_BLOCKS) {
    if (y > b.h || y < (b.minY ?? 0)) continue;
    if (insideRect(x, z, b)) return true;
  }
  return false;
}

function insideRect(x: number, z: number, box: { x: number; z: number; hw: number; hd: number; ry?: number }, pad = 0): boolean {
  const dx = x - box.x, dz = z - box.z;
  const c = Math.cos(box.ry ?? 0), sn = Math.sin(box.ry ?? 0);
  return Math.abs(dx * c - dz * sn) < box.hw + pad && Math.abs(dx * sn + dz * c) < box.hd + pad;
}
const PLAYER_RADIUS = 0.45;
const pointHitsCollider = createPointCollisionQuery(COLLIDERS, PLAYER_RADIUS);

export function isBlocked(x: number, z: number): boolean {
  return !isInsideWorld(x, z) || pointHitsCollider(x, z);
}

/* ---------------------------------- interactables ---------------------------------- */

export const INTERACTABLES: WorldInteractable[] = [
  // education: the Great Court gate
  ...education.map((edu) => ({
    x: GREAT_COURT.door.x,
    z: GREAT_COURT.door.z,
    radius: 4.5,
    hint: edu.institution,
    payload: {
      kind: "education" as const,
      id: edu.id,
      dialog: edu.world.dialog,
      title: edu.institution,
    },
  })),
  // scholarship plaque
  {
    x: GREAT_COURT.plaque.x,
    z: GREAT_COURT.plaque.z,
    radius: 2.4,
    payload: null,
    hint: "25% academic scholarship, renewed every semester ★",
  },
  ...OFFICES.map((o) => ({
    x: o.door.x,
    z: o.door.z,
    arrivalYaw: 0,
    radius: 3.6,
    hint: o.label,
    payload: o.payload,
  })),
  ...(QUALIA_ENTRY
    ? [
        {
          x: QUALIA.door.x,
          z: QUALIA.door.z,
          radius: 4,
          hint: `${QUALIA_ENTRY.company} (${QUALIA_ENTRY.role})`,
          payload: {
            kind: "experience" as const,
            id: QUALIA_ENTRY.id,
            dialog: QUALIA_ENTRY.world.dialog,
            title: QUALIA_ENTRY.company,
          },
        },
      ]
    : []),
  ...CRYSTALS.map(c=>({
    x:c.x+(c.x<GARDEN.x?1.42:-1.42),
    z:c.z,
    arrivalYaw:c.x<GARDEN.x?Math.PI/2:-Math.PI/2,
    radius:1.8,
    hint:c.label,
    payload:c.payload,
  })),
  ...CABINETS.map((c) => ({
    x: c.x,
    z: c.payload.kind === "project" ? c.z - PROJECT_GALLERY.approachOffset : c.z - 1.7,
    arrivalYaw: Math.PI,
    radius: 2,
    hint: c.payload.kind === "snake" ? "??? it still has power…" : c.label,
    payload: c.payload,
  })),
  {
    x: CAFE.door.x,
    z: CAFE.door.z,
    radius: 3.4,
    hint: "Blog Café",
    payload: {
      kind: "blog",
      id: "blog",
      dialog: [
        "The Blog Café, open late like every good Brisbane café isn't.",
        "Want to read the build logs?",
      ],
      title: "Blog Café",
    },
  },
  {
    x: POST.door.x,
    z: POST.door.z,
    radius: 3.4,
    hint: "Meet and collaborate",
    payload: {
      kind: "contact",
      id: "contact",
      dialog: [
        "A place to start the next collaboration.",
        "Want to send one?",
      ],
      title: "Meet and collaborate",
    },
  },
  ...CAMPUS_STOPS.map((stop) => {
    const entry = campus.find((item) => item.id === stop.id)!;
    return { x: stop.x, z: stop.z, radius: 3.2, hint: entry.title, payload: { kind: "landmark" as const, id: entry.id, title: entry.title, dialog: [entry.description] } };
  }),
  // lookout over the river
  {
    x: 0,
    z: LOOKOUT.z,
    radius: 3.5,
    payload: null,
    hint: "Brisbane city lights across the river ★",
  },
];
