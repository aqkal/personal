import { education, experience, projects, skills } from "@content";
import type { PanelPayload } from "@/game/bus";

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
  "#ff6bd6",
  "#53d8ff",
  "#4ef08a",
  "#ffc857",
  "#b18cff",
  "#ff8f6b",
] as const;

function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Circle (r) or axis-aligned rect (hw/hd = half extents) blocker. */
export type Collider =
  | { x: number; z: number; r: number }
  | { x: number; z: number; hw: number; hd: number };

export interface WorldInteractable {
  x: number;
  z: number;
  radius: number;
  /** null = hint-only marker */
  payload: PanelPayload | null;
  hint: string;
}

/* ---------------------------------- player area ---------------------------------- */

export const PLAYER_START = { x: 0, z: 8 };

/** Walkable union: main field + bridge corridor + river lookout deck. */
export function isInsideWorld(x: number, z: number): boolean {
  if (Math.abs(x) <= 44 && Math.abs(z) <= 42) return true; // main field
  if (Math.abs(x) <= 2.1 && z > 42 && z <= 56) return true; // bridge deck
  if (Math.abs(x) <= 7.5 && z > 56 && z <= 61) return true; // lookout
  return false;
}

/* ---------------------------------- structures ---------------------------------- */

/**
 * UQ Great Court: an enclosed ring of sandstone wings with cloisters, a
 * clock tower on the north wing, and an arched south gate (like the real
 * Forgan Smith entrance axis).
 */
export const GREAT_COURT = {
  center: { x: -27, z: -24 },
  northWing: { x: -27, z: -31, hw: 13, hd: 3, h: 7.5 },
  westWing: { x: -38, z: -22, hw: 3, hd: 9, h: 6.5 },
  eastWing: { x: -16, z: -22, hw: 3, hd: 9, h: 6.5 },
  southWest: { x: -34.5, z: -13.5, hw: 3.5, hd: 2, h: 5.5 },
  southEast: { x: -19.5, z: -13.5, hw: 3.5, hd: 2, h: 5.5 },
  gate: { x: -27, z: -13.5, halfOpening: 3.2, pillarR: 0.45, h: 6.5 },
  tower: { x: -27, z: -30.4, w: 4.4, h: 15 },
  /** interaction spot at the south gate */
  door: { x: -27, z: -11 },
  plaque: { x: -22.5, z: -18 },
};

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

const OFFICE_SLOTS = [
  { x: 23, z: -26, h: 14, w: 8, d: 8 },
  { x: 33, z: -18, h: 10, w: 7, d: 7 },
  { x: 23, z: -14, h: 8, w: 6, d: 6 },
];

export const OFFICES: OfficeSpec[] = experience.map((job, i) => {
  const slot = OFFICE_SLOTS[i % OFFICE_SLOTS.length];
  return {
    ...slot,
    accent: ACCENTS[i % ACCENTS.length],
    label: job.company,
    door: { x: slot.x, z: slot.z + slot.d / 2 + 1.2 },
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

export const CABINETS: CabinetSpec[] = [
  ...projects.map((p, i) => ({
    ...cabinetSlot(i),
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
    ...cabinetSlot(projects.length),
    accent: "#4ef08a",
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

export const CAFE = { x: -35, z: 4, w: 7, d: 6, door: { x: -31, z: 4 } };
export const POST = { x: 35, z: 4, w: 7, d: 6, door: { x: 31, z: 4 } };

/* ---------------------------------- flora & lights ---------------------------------- */

export interface TreeSpec {
  x: number;
  z: number;
  s: number;
  kind: "jacaranda" | "fig";
}

export const TREES: TreeSpec[] = (() => {
  const rng = seededRandom(4207);
  const out: TreeSpec[] = [];
  // jacarandas ring the Great Court (the UQ signature)
  const jacSpots = [
    [-40, -12], [-33, -13], [-21, -13], [-14, -12],
    [-42, -30], [-12, -30], [-27, -36.5], [-38, -35],
    [-16, -36], [-8, -20],
  ];
  for (const [x, z] of jacSpots) {
    out.push({ x, z, s: 0.9 + rng() * 0.5, kind: "jacaranda" });
  }
  // fig trees scattered around the rest of the field
  const figSpots = [
    [-8, -8], [8, -9], [14, -25], [40, -28], [40, -8],
    [-40, 12], [-14, 10], [14, 10], [40, 12], [-38, 32],
    [-14, 30], [-8, 38], [8, 38], [16, 30], [38, 32],
    [12, 22], [-12, 20], [7, -32], [-4, -38], [36, 38],
  ];
  for (const [x, z] of figSpots) {
    out.push({ x, z, s: 0.85 + rng() * 0.6, kind: "fig" });
  }
  return out;
})();

export interface LampSpec {
  x: number;
  z: number;
}

/** Street lamps along the paths (bulbs bloom; a few carry real lights). */
export const LAMPS: LampSpec[] = (() => {
  const out: LampSpec[] = [];
  for (let z = -36; z <= 40; z += 12) out.push({ x: z % 24 === 0 ? 2.4 : -2.4, z });
  for (let x = -40; x <= 40; x += 12) {
    if (Math.abs(x) < 4) continue;
    out.push({ x, z: x % 24 === 0 ? 2.4 : -2.4 });
  }
  // plaza ring
  out.push({ x: 7, z: 7 }, { x: -7, z: 7 }, { x: 7, z: -7 }, { x: -7, z: -7 });
  // lookout
  out.push({ x: -6, z: 57 }, { x: 6, z: 57 });
  return out;
})();

/* ---------------------------------- colliders ---------------------------------- */

export const COLLIDERS: Collider[] = [
  // Great Court wings + gate pillars + tower
  { x: GREAT_COURT.northWing.x, z: GREAT_COURT.northWing.z, hw: GREAT_COURT.northWing.hw, hd: GREAT_COURT.northWing.hd },
  { x: GREAT_COURT.westWing.x, z: GREAT_COURT.westWing.z, hw: GREAT_COURT.westWing.hw, hd: GREAT_COURT.westWing.hd },
  { x: GREAT_COURT.eastWing.x, z: GREAT_COURT.eastWing.z, hw: GREAT_COURT.eastWing.hw, hd: GREAT_COURT.eastWing.hd },
  { x: GREAT_COURT.southWest.x, z: GREAT_COURT.southWest.z, hw: GREAT_COURT.southWest.hw, hd: GREAT_COURT.southWest.hd },
  { x: GREAT_COURT.southEast.x, z: GREAT_COURT.southEast.z, hw: GREAT_COURT.southEast.hw, hd: GREAT_COURT.southEast.hd },
  { x: GREAT_COURT.gate.x - GREAT_COURT.gate.halfOpening, z: GREAT_COURT.gate.z, r: GREAT_COURT.gate.pillarR },
  { x: GREAT_COURT.gate.x + GREAT_COURT.gate.halfOpening, z: GREAT_COURT.gate.z, r: GREAT_COURT.gate.pillarR },
  // offices
  ...OFFICES.map((o) => ({ x: o.x, z: o.z, hw: o.w / 2, hd: o.d / 2 })),
  // arcade cabinets row (block behind the pavilion too)
  { x: ARCADE.x, z: ARCADE.z - 1.2, hw: ARCADE.hw, hd: 1.2 },
  // café + post office
  { x: CAFE.x, z: CAFE.z, hw: CAFE.w / 2, hd: CAFE.d / 2 },
  { x: POST.x, z: POST.z, hw: POST.w / 2, hd: POST.d / 2 },
  // fountain
  { x: 0, z: 0, r: 3.1 },
  // crystals
  ...CRYSTALS.map((c) => ({ x: c.x, z: c.z, r: 0.9 })),
  // trees + lamps
  ...TREES.map((t) => ({ x: t.x, z: t.z, r: 0.55 * t.s })),
  ...LAMPS.map((l) => ({ x: l.x, z: l.z, r: 0.22 })),
];

const PLAYER_RADIUS = 0.45;

export function isBlocked(x: number, z: number): boolean {
  if (!isInsideWorld(x, z)) return true;
  for (const c of COLLIDERS) {
    if ("r" in c) {
      const d2 = (c.x - x) ** 2 + (c.z - z) ** 2;
      const rr = c.r + PLAYER_RADIUS;
      if (d2 < rr * rr) return true;
    } else if (
      Math.abs(x - c.x) < c.hw + PLAYER_RADIUS &&
      Math.abs(z - c.z) < c.hd + PLAYER_RADIUS
    ) {
      return true;
    }
  }
  return false;
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
    radius: 3.6,
    hint: o.label,
    payload: o.payload,
  })),
  ...CABINETS.map((c) => ({
    x: c.x,
    z: c.z + 1.4,
    radius: 2,
    hint: c.payload.kind === "snake" ? "??? it still has power…" : c.label,
    payload: c.payload,
  })),
  ...CRYSTALS.map((c) => ({
    x: c.x,
    z: c.z,
    radius: 2.6,
    hint: c.label,
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
    hint: "Post Office",
    payload: {
      kind: "contact",
      id: "contact",
      dialog: [
        "The Post Office. Messages cross the river fast from here.",
        "Want to send one?",
      ],
      title: "Post Office",
    },
  },
  // lookout over the river
  {
    x: 0,
    z: 59,
    radius: 3.5,
    payload: null,
    hint: "Brisbane city lights across the river ★",
  },
];

/** Floating zone labels (rendered as HTML chips in 3D space). */
export const ZONE_LABELS: Array<{ x: number; y: number; z: number; label: string }> = [
  { x: -27, y: 10, z: -24, label: "UQ CAMPUS" },
  { x: 28, y: 12, z: -20, label: "CAREER DISTRICT" },
  { x: 27, y: 6.5, z: 22, label: "PROJECT ARCADE" },
  { x: -27, y: 6, z: 22, label: "SKILLS GARDEN" },
  { x: -35, y: 5.5, z: 4, label: "BLOG CAFÉ" },
  { x: 35, y: 5.5, z: 4, label: "POST OFFICE" },
];
