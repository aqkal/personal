/** World-space sign proportions match each atlas tile so letters stay undistorted. */
export const SIGN_FACE = { width: 4, height: 1, y: 2.2 };
export const SIGN_ATLAS = { columns: 2, rows: 2, tileWidth: 512, tileHeight: 128, gutter: 2 };

export const WAYFINDING_SIGNS = [
  // Gate forecourt, beside the narrow approach rather than across it.
  { x: -31.7, z: -14, title: "GREAT COURT", sub: "FORGAN SMITH · EDUCATION", ry: 0, readSide: 1 },
  // The east edge of the career approach, before the office entrances.
  { x: 14, z: -11, title: "CAREER DISTRICT", sub: "EXPERIENCE & IDEAS", ry: 0, readSide: 1 },
  // Beside the lake path, facing visitors arriving from the amphitheatre.
  { x: 10, z: -51.1, title: "UQ LAKES", sub: "WATER · WILDLIFE · WALKS", ry: 0, readSide: -1 },
  // At the library's front entrance, facing its east-west access path.
  { x: -56.2, z: -2.65, title: "DUHIG TOWER", sub: "LIBRARY & STUDY SPACES", ry: 0, readSide: -1 },
] as const;

export function signReadingPosition(sign: (typeof WAYFINDING_SIGNS)[number], distance = 1.6) {
  return {
    x: sign.x + Math.sin(sign.ry) * distance * sign.readSide,
    z: sign.z + Math.cos(sign.ry) * distance * sign.readSide,
  };
}

export function signAtlasUV(index: number, u: number, v: number) {
  const { columns, rows, tileWidth, tileHeight, gutter } = SIGN_ATLAS;
  const column = index % columns, row = Math.floor(index / columns);
  const horizontalGutter = gutter * tileWidth / tileHeight;
  return {
    u: (column * tileWidth + horizontalGutter + u * (tileWidth - horizontalGutter * 2)) / (columns * tileWidth),
    v: 1 - (row * tileHeight + gutter + (1 - v) * (tileHeight - gutter * 2)) / (rows * tileHeight),
  };
}
