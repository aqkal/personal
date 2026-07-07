/**
 * The single color palette for every procedurally generated texture.
 * Tweaking these recolors the whole world coherently.
 */
export const PAL = {
  // terrain
  grass: "#2e7d47",
  grassDark: "#256a3b",
  grassLight: "#3a9455",
  path: "#c9a96e",
  pathDark: "#b08f55",
  pathLight: "#dcc088",
  water: "#1d4e89",
  waterDark: "#163d6e",
  waterLight: "#3a77c2",
  foam: "#9cc8f0",

  // flora
  trunk: "#6b4a2f",
  trunkDark: "#523823",
  canopy: "#1f6b38",
  canopyDark: "#174f29",
  canopyLight: "#2f8a4a",
  flowerPink: "#ff8fd0",
  flowerWhite: "#f2f4ff",
  flowerYellow: "#ffd35c",

  // character
  outline: "#10121f",
  hair: "#3b2a1e",
  skin: "#f2c89b",
  eye: "#1b1b29",
  shirt: "#35d977",
  pants: "#26324f",
  boots: "#4a3421",

  // buildings / structures
  wall: "#4b5878",
  wallDark: "#39445e",
  wallLight: "#5d6c92",
  roof: "#8f4a5e",
  roofDark: "#733a4b",
  window: "#ffd97a",
  windowDark: "#b3894a",
  door: "#5a3d28",
  sign: "#d9b26a",

  // arcade
  cabinet: "#2a2f52",
  cabinetDark: "#1e2240",
  screenGlow: "#53d8ff",
  neonPink: "#ff6bd6",
  neonGreen: "#4ef08a",
} as const;

/** Deterministic PRNG (mulberry32) — same seed, same world, every visit. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
