import type { ZoneId } from "@content";
import { seededRandom } from "../palette";
import { T, TILE } from "../textures";

/**
 * The overworld, carved in code — deterministic (seeded), so every visitor
 * sees the same world. Distances are in TILES (16px); multiply by TILE for
 * world pixels.
 *
 * Layout (60x40 tiles):
 *   NW: UQ Campus        NE: Career District
 *   W:  Blog Café        E:  Post Office
 *   center: plaza + fountain (spawn)
 *   SW: Skills Garden    SE: Project Arcade
 */
export const MAP_W = 60;
export const MAP_H = 40;

export interface ZoneDef {
  id: ZoneId;
  label: string;
  /** Rect kept clear of trees, in tiles. */
  rect: { x: number; y: number; w: number; h: number };
  /** Anchor points (tile coords) where content entries spawn, in order. */
  anchors: Array<{ x: number; y: number }>;
  /** Where the zone label sign is placed. */
  sign: { x: number; y: number };
}

export const ZONES: ZoneDef[] = [
  {
    id: "campus",
    label: "UQ CAMPUS",
    rect: { x: 3, y: 3, w: 16, h: 11 },
    anchors: [{ x: 9, y: 6 }, { x: 15, y: 6 }],
    sign: { x: 11, y: 12 },
  },
  {
    id: "career",
    label: "CAREER DISTRICT",
    rect: { x: 38, y: 3, w: 19, h: 11 },
    anchors: [
      { x: 43, y: 6 },
      { x: 50, y: 6 },
      { x: 46, y: 11 },
    ],
    sign: { x: 47, y: 12 },
  },
  {
    id: "cafe",
    label: "BLOG CAFÉ",
    rect: { x: 3, y: 16, w: 12, h: 8 },
    anchors: [{ x: 8, y: 18 }],
    sign: { x: 8, y: 22 },
  },
  {
    id: "post",
    label: "POST OFFICE",
    rect: { x: 46, y: 16, w: 11, h: 8 },
    anchors: [{ x: 51, y: 18 }],
    sign: { x: 51, y: 22 },
  },
  {
    id: "garden",
    label: "SKILLS GARDEN",
    rect: { x: 3, y: 27, w: 15, h: 10 },
    anchors: [
      { x: 6, y: 30 },
      { x: 11, y: 30 },
      { x: 6, y: 34 },
      { x: 11, y: 34 },
      { x: 15, y: 32 },
    ],
    sign: { x: 10, y: 27 },
  },
  {
    id: "arcade",
    label: "PROJECT ARCADE",
    rect: { x: 40, y: 27, w: 17, h: 10 },
    anchors: [
      { x: 43, y: 30 },
      { x: 47, y: 30 },
      { x: 51, y: 30 },
      { x: 45, y: 34 },
      { x: 49, y: 34 },
      { x: 53, y: 34 },
    ],
    sign: { x: 48, y: 27 },
  },
];

export const PLAYER_SPAWN = { x: 30 * TILE, y: 22 * TILE };

export interface WorldData {
  /** terrain[y][x] = tileset index */
  terrain: number[][];
  /** Tile coords of animated water tiles. */
  waterTiles: Array<{ x: number; y: number }>;
  /** Tree positions in world px (bottom-center of trunk). */
  trees: Array<{ x: number; y: number }>;
}

function inRect(
  x: number,
  y: number,
  r: { x: number; y: number; w: number; h: number },
  pad = 0,
) {
  return (
    x >= r.x - pad && x < r.x + r.w + pad && y >= r.y - pad && y < r.y + r.h + pad
  );
}

export function buildWorld(): WorldData {
  const rng = seededRandom(20260707);
  const terrain: number[][] = [];

  // 1. base grass with variation
  for (let y = 0; y < MAP_H; y++) {
    const row: number[] = [];
    for (let x = 0; x < MAP_W; x++) {
      const r = rng();
      row.push(
        r < 0.62
          ? T.GRASS_A
          : r < 0.78
            ? T.GRASS_B
            : r < 0.88
              ? T.GRASS_C
              : r < 0.95
                ? T.TUFT
                : T.FLOWERS,
      );
    }
    terrain.push(row);
  }

  const setRect = (x: number, y: number, w: number, h: number, t: number) => {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (xx >= 0 && xx < MAP_W && yy >= 0 && yy < MAP_H) terrain[yy][xx] = t;
      }
    }
  };

  // 2. roads — a main cross + spurs into each zone
  setRect(2, 19, 56, 2, T.PATH); // main east-west road
  setRect(29, 2, 2, 36, T.PATH); // main north-south road
  setRect(10, 13, 2, 6, T.PATH); // campus spur
  setRect(46, 13, 2, 6, T.PATH); // career spur
  setRect(8, 21, 2, 3, T.PATH); // café connects from main road
  setRect(50, 21, 2, 3, T.PATH); // post office spur
  setRect(10, 27, 2, 4, T.PATH); // garden spur (from road down)
  setRect(10, 21, 2, 6, T.PATH);
  setRect(47, 21, 2, 7, T.PATH); // arcade spur
  setRect(41, 28, 14, 8, T.PLAZA); // arcade floor
  setRect(26, 17, 8, 6, T.PLAZA); // central plaza
  setRect(29, 17, 2, 6, T.PLAZA);

  // 3. water — pond south-center-west + fountain in plaza
  const pond = { cx: 21.5, cy: 33, rx: 4.5, ry: 3.2 };
  const waterTiles: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const dx = (x - pond.cx) / pond.rx;
      const dy = (y - pond.cy) / pond.ry;
      if (dx * dx + dy * dy <= 1) {
        terrain[y][x] = T.WATER_A;
        waterTiles.push({ x, y });
      }
    }
  }
  // fountain (2x2) in the central plaza
  setRect(29, 18, 2, 2, T.WATER_A);
  waterTiles.push({ x: 29, y: 18 }, { x: 30, y: 18 }, { x: 29, y: 19 }, { x: 30, y: 19 });

  // 4. trees — border forest + scattered clusters, kept out of zones/roads/water
  const trees: Array<{ x: number; y: number }> = [];
  const isBlocked = (x: number, y: number) => {
    if (terrain[y]?.[x] === undefined) return true;
    const t = terrain[y][x];
    if (t === T.PATH || t === T.PLAZA || t === T.WATER_A) return true;
    if (ZONES.some((z) => inRect(x, y, z.rect, 1))) return true;
    return false;
  };
  const addTree = (tx: number, ty: number) => {
    if (isBlocked(tx, ty) || isBlocked(tx, ty - 1)) return;
    trees.push({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE });
  };
  // border ring (double row, jittered)
  for (let x = 0; x < MAP_W; x += 2) {
    addTree(x, 1 + Math.floor(rng() * 2));
    addTree(x + 1, MAP_H - 2 + Math.floor(rng() * 2) - 1);
  }
  for (let y = 0; y < MAP_H; y += 2) {
    addTree(1 + Math.floor(rng() * 2), y);
    addTree(MAP_W - 2 - Math.floor(rng() * 2), y + 1);
  }
  // interior scatter
  for (let i = 0; i < 90; i++) {
    addTree(
      2 + Math.floor(rng() * (MAP_W - 4)),
      2 + Math.floor(rng() * (MAP_H - 4)),
    );
  }

  return { terrain, waterTiles, trees };
}
