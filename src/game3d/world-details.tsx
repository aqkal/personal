"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { SIGN_ATLAS, SIGN_FACE, WAYFINDING_SIGNS, signAtlasUV } from "./signage";

/** Human scale, warm timber, planting and consistent wayfinding across every district. */
export function WorldDetails() {
  const { furniture, signFaces, signTexture } = useMemo(() => {
    const wood: THREE.BufferGeometry[] = [], faces: THREE.BufferGeometry[] = [];
    const colored = (g: THREE.BufferGeometry, color: string) => {
      const c = new THREE.Color(color), a = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; }
      g.setAttribute("color", new THREE.BufferAttribute(a, 3)); return g;
    };
    const box = (group: THREE.BufferGeometry[], w: number, h: number, d: number, x: number, y: number, z: number, color: string, ry = 0) => group.push(colored(new THREE.BoxGeometry(w, h, d).rotateY(ry).translate(x, y, z), color));
    const canvas = document.createElement("canvas");
    const { columns, rows, tileWidth, tileHeight } = SIGN_ATLAS;
    canvas.width = columns * tileWidth; canvas.height = rows * tileHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f5eedb"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const [i, sign] of WAYFINDING_SIGNS.entries()) {
      const left = (i % columns) * tileWidth, top = Math.floor(i / columns) * tileHeight;
      ctx.save(); ctx.translate(left, top);
      ctx.fillStyle = "#4d422f"; ctx.fillRect(18, 16, 6, 96);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      // Fit by font size, never Canvas fillText(maxWidth), which squeezes glyphs.
      let fontSize = 40;
      do { ctx.font = `700 ${fontSize}px Arial`; fontSize--; } while (ctx.measureText(sign.title).width > 454);
      ctx.fillText(sign.title, 266, 47);
      ctx.font = "600 23px Arial"; ctx.fillStyle = "#615744";
      ctx.fillText(sign.sub, 266, 94);
      ctx.restore();
      for (const dx of [-1.6, 1.6]) box(wood, 0.09, 2.08, 0.09, sign.x + Math.cos(sign.ry) * dx, 1.04, sign.z - Math.sin(sign.ry) * dx, "#786b52");
      box(wood, 4.5, 0.08, 0.55, sign.x, 0.04, sign.z, "#a99d85", sign.ry);
      box(wood, 4.2, 1.16, 0.16, sign.x, SIGN_FACE.y, sign.z, "#786b52", sign.ry);
      // Each side has outward-facing geometry and normal reading direction.
      for (const side of [-1, 1]) {
        const face = new THREE.PlaneGeometry(SIGN_FACE.width, SIGN_FACE.height);
        const uv = face.attributes.uv;
        for (let j = 0; j < uv.count; j++) {
          const mapped = signAtlasUV(i, uv.getX(j), uv.getY(j));
          uv.setXY(j, mapped.u, mapped.v);
        }
        face.rotateY(side < 0 ? Math.PI : 0).translate(0, SIGN_FACE.y, side * 0.092).rotateY(sign.ry).translate(sign.x, 0, sign.z);
        faces.push(face);
      }
    }
    // Qualia's own site board sits beside the entry path, clear of the doorway.
    for (const x of [12.85, 15.35]) box(wood, .12, 2.2, .12, x, 1.1, -18.25, "#24432f");
    box(wood, 3.45, 1.43, .18, 14.1, 1.65, -18.25, "#143f2c");
    box(wood, 3.58, .10, .25, 14.1, 2.41, -18.25, "#cdbcec");
    box(wood, 3.6, .07, .6, 14.1, .035, -18.25, "#b7ae98");
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
    const merged = (parts: THREE.BufferGeometry[]) => { const result = mergeGeometries(parts); parts.forEach((p) => p.dispose()); return result; };
    return { furniture: merged(wood), signFaces: merged(faces), signTexture: texture };
  }, []);
  useEffect(() => () => {
    furniture.dispose(); signFaces.dispose(); signTexture.dispose();
  }, [furniture, signFaces, signTexture]);
  return <group>
    <mesh geometry={furniture}><meshLambertMaterial vertexColors /></mesh>
    <mesh geometry={signFaces} userData={{ noShadow: true }}><meshBasicMaterial map={signTexture} toneMapped={false} /></mesh>
  </group>;
}
