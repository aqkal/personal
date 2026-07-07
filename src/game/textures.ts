import type Phaser from "phaser";
import { PAL, seededRandom } from "./palette";

/**
 * Every texture in the game is generated here at boot, in code, on a canvas.
 * No image files: nothing to download, nothing to license, and the loading
 * screen is over in milliseconds. Swap this module for real sprite sheets
 * later if you want hand-drawn art (see docs/ARCHITECTURE.md).
 */

export const TILE = 16;

/** Tileset indices (one 16px tile each, laid out horizontally). */
export const T = {
  GRASS_A: 0,
  GRASS_B: 1,
  GRASS_C: 2,
  PATH: 3,
  WATER_A: 4,
  WATER_B: 5,
  FLOWERS: 6,
  TUFT: 7,
  PLAZA: 8,
} as const;

const TILE_COUNT = 9;

function ctx2d(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
): [CanvasRenderingContext2D, () => void] {
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) throw new Error(`could not create canvas texture ${key}`);
  const c = tex.getContext();
  c.imageSmoothingEnabled = false;
  return [c, () => tex.refresh()];
}

function speckle(
  c: CanvasRenderingContext2D,
  ox: number,
  rng: () => number,
  color: string,
  count: number,
) {
  c.fillStyle = color;
  for (let i = 0; i < count; i++) {
    c.fillRect(ox + Math.floor(rng() * 16), Math.floor(rng() * 16), 1, 1);
  }
}

function drawTileset(scene: Phaser.Scene) {
  const [c, refresh] = ctx2d(scene, "tiles", TILE_COUNT * TILE, TILE);
  const rng = seededRandom(1337);

  const base = (i: number, color: string) => {
    c.fillStyle = color;
    c.fillRect(i * TILE, 0, TILE, TILE);
  };

  // grass variants
  base(T.GRASS_A, PAL.grass);
  speckle(c, T.GRASS_A * TILE, rng, PAL.grassDark, 5);
  base(T.GRASS_B, PAL.grass);
  speckle(c, T.GRASS_B * TILE, rng, PAL.grassLight, 4);
  speckle(c, T.GRASS_B * TILE, rng, PAL.grassDark, 3);
  base(T.GRASS_C, PAL.grass);
  // tiny grass blades
  c.fillStyle = PAL.grassLight;
  for (let i = 0; i < 3; i++) {
    const x = T.GRASS_C * TILE + 2 + Math.floor(rng() * 12);
    const y = 3 + Math.floor(rng() * 10);
    c.fillRect(x, y, 1, 2);
    c.fillRect(x + 1, y + 1, 1, 1);
  }

  // path
  base(T.PATH, PAL.path);
  speckle(c, T.PATH * TILE, rng, PAL.pathDark, 6);
  speckle(c, T.PATH * TILE, rng, PAL.pathLight, 4);

  // water frames (waves shift between frames)
  for (const [idx, off] of [
    [T.WATER_A, 0],
    [T.WATER_B, 2],
  ] as const) {
    base(idx, PAL.water);
    c.fillStyle = PAL.waterDark;
    c.fillRect(idx * TILE, 12, TILE, 4);
    c.fillStyle = PAL.waterLight;
    c.fillRect(idx * TILE + ((2 + off) % 16), 3, 4, 1);
    c.fillRect(idx * TILE + ((9 + off) % 16), 7, 4, 1);
    c.fillRect(idx * TILE + ((5 + off) % 16), 11, 3, 1);
    c.fillStyle = PAL.foam;
    c.fillRect(idx * TILE + ((11 + off) % 16), 4, 2, 1);
  }

  // flowers on grass
  base(T.FLOWERS, PAL.grass);
  speckle(c, T.FLOWERS * TILE, rng, PAL.grassDark, 3);
  const flowers: Array<[number, number, string]> = [
    [3, 4, PAL.flowerPink],
    [10, 3, PAL.flowerWhite],
    [6, 10, PAL.flowerYellow],
    [12, 11, PAL.flowerPink],
  ];
  for (const [fx, fy, color] of flowers) {
    c.fillStyle = color;
    c.fillRect(T.FLOWERS * TILE + fx, fy, 2, 2);
    c.fillStyle = PAL.flowerYellow;
    c.fillRect(T.FLOWERS * TILE + fx, fy, 1, 1);
  }

  // tall grass tufts
  base(T.TUFT, PAL.grass);
  c.fillStyle = PAL.grassDark;
  for (const [tx, ty] of [
    [3, 6],
    [8, 4],
    [12, 8],
  ] as const) {
    c.fillRect(T.TUFT * TILE + tx, ty, 1, 4);
    c.fillRect(T.TUFT * TILE + tx + 2, ty + 1, 1, 3);
    c.fillRect(T.TUFT * TILE + tx + 1, ty + 2, 1, 2);
  }

  // plaza stone
  base(T.PLAZA, "#5a6482");
  c.fillStyle = "#4c5570";
  c.fillRect(T.PLAZA * TILE, 7, TILE, 1);
  c.fillRect(T.PLAZA * TILE + 7, 0, 1, 7);
  c.fillRect(T.PLAZA * TILE + 3, 8, 1, 8);
  c.fillStyle = "#6b7694";
  speckle(c, T.PLAZA * TILE, rng, "#6b7694", 3);

  refresh();
}

function drawTree(scene: Phaser.Scene) {
  const w = 20;
  const h = 26;
  const [c, refresh] = ctx2d(scene, "tree", w, h);
  const rng = seededRandom(42);

  // trunk
  c.fillStyle = PAL.trunkDark;
  c.fillRect(8, 18, 5, 8);
  c.fillStyle = PAL.trunk;
  c.fillRect(9, 18, 3, 8);

  // canopy — stacked rows to fake a rounded blob
  const rows: Array<[number, number, number]> = [
    // [y, x, width]
    [1, 6, 8],
    [2, 4, 12],
    [3, 3, 14],
    [4, 2, 16],
    [6, 1, 18],
    [10, 2, 16],
    [13, 3, 14],
    [15, 4, 12],
    [17, 6, 8],
  ];
  c.fillStyle = PAL.canopyDark;
  for (const [y, x, width] of rows) c.fillRect(x, y, width, 2);
  c.fillStyle = PAL.canopy;
  c.fillRect(3, 4, 14, 12);
  // dithered highlights
  c.fillStyle = PAL.canopyLight;
  for (let i = 0; i < 14; i++) {
    c.fillRect(3 + Math.floor(rng() * 12), 4 + Math.floor(rng() * 8), 2, 1);
  }
  refresh();
}

/**
 * Character sprite sheet, drawn frame by frame.
 * 16x20 frames: [down x3, up x3, right x3] (left = right flipped).
 * Frame layout per direction: [step, stand, step-alt].
 */
const HEAD_TORSO_DOWN = [
  "....OOOOOOOO....",
  "...OHHHHHHHHO...",
  "..OHHHHHHHHHHO..",
  "..OHHHHHHHHHHO..",
  "..OHSSSSSSSSHO..",
  "..OSESSSSSSESO..",
  "..OSSSSSSSSSSO..",
  "...OSSSSSSSSO...",
  "....OSSSSSSO....",
  "...OTTTTTTTTO...",
  "..OSTTTTTTTTSO..",
  "..OSTTTTTTTTSO..",
  "...OTTTTTTTTO...",
  "...OTTTTTTTTO...",
];
const HEAD_TORSO_UP = [
  "....OOOOOOOO....",
  "...OHHHHHHHHO...",
  "..OHHHHHHHHHHO..",
  "..OHHHHHHHHHHO..",
  "..OHHHHHHHHHHO..",
  "..OHHHHHHHHHHO..",
  "..OHHHHHHHHHHO..",
  "...OHHHHHHHHO...",
  "....OHHHHHHO....",
  "...OTTTTTTTTO...",
  "..OSTTTTTTTTSO..",
  "..OSTTTTTTTTSO..",
  "...OTTTTTTTTO...",
  "...OTTTTTTTTO...",
];
const HEAD_TORSO_RIGHT = [
  "....OOOOOOOO....",
  "...OHHHHHHHHO...",
  "..OHHHHHHHHHHO..",
  "..OHHHHHHHHHHO..",
  "..OHHHSSSSSSHO..",
  "..OHHSSSSSESSO..",
  "..OHHSSSSSSSSO..",
  "...OHSSSSSSSO...",
  "....OSSSSSSO....",
  "...OTTTTTTTTO...",
  "...OTTTTTTTSO...",
  "...OTTTTTTTSO...",
  "...OTTTTTTTTO...",
  "...OTTTTTTTTO...",
];

const CHAR_COLORS: Record<string, string> = {
  O: PAL.outline,
  H: PAL.hair,
  S: PAL.skin,
  E: PAL.eye,
  T: PAL.shirt,
};

export const FRAME_W = 16;
export const FRAME_H = 20;

function drawCharFrame(
  c: CanvasRenderingContext2D,
  ox: number,
  headTorso: string[],
  legs: "stand" | "apart",
) {
  // head + torso (rows 0-13)
  for (let y = 0; y < headTorso.length; y++) {
    const row = headTorso[y];
    for (let x = 0; x < row.length; x++) {
      const color = CHAR_COLORS[row[x]];
      if (!color) continue;
      c.fillStyle = color;
      c.fillRect(ox + x, y, 1, 1);
    }
  }
  // legs (rows 14-19)
  const legCols = legs === "stand" ? [5, 9] : [4, 10];
  for (const lx of legCols) {
    c.fillStyle = PAL.pants;
    c.fillRect(ox + lx, 14, 2, 4);
    c.fillStyle = PAL.boots;
    c.fillRect(ox + lx, 18, 2, 2);
  }
}

function drawCharacter(scene: Phaser.Scene) {
  const dirs = [
    ["down", HEAD_TORSO_DOWN],
    ["up", HEAD_TORSO_UP],
    ["right", HEAD_TORSO_RIGHT],
  ] as const;
  const framesPerDir = 3;
  const [c, refresh] = ctx2d(
    scene,
    "player",
    dirs.length * framesPerDir * FRAME_W,
    FRAME_H,
  );

  const legCycle: Array<"apart" | "stand" | "apart"> = [
    "apart",
    "stand",
    "apart",
  ];
  dirs.forEach(([, art], d) => {
    legCycle.forEach((legs, f) => {
      drawCharFrame(c, (d * framesPerDir + f) * FRAME_W, art, legs);
    });
  });
  refresh();

  // register named frames on the canvas texture
  const tex = scene.textures.get("player");
  dirs.forEach(([name], d) => {
    for (let f = 0; f < framesPerDir; f++) {
      tex.add(`${name}-${f}`, 0, (d * framesPerDir + f) * FRAME_W, 0, FRAME_W, FRAME_H);
    }
  });
}

export function generateBaseTextures(scene: Phaser.Scene) {
  if (scene.textures.exists("tiles")) return; // hot-reload / re-entry guard
  drawTileset(scene);
  drawTree(scene);
  drawCharacter(scene);
}
