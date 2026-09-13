"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { CAMPUS_CLOISTERS, CAMPUS_WINGS, GREAT_COURT } from "./layout";
import { TOON, tileTexture } from "./materials";
import { mergeSceneGeometry } from "./geometry";

type Parts = THREE.BufferGeometry[];
const stoneColors = ["#d5bea2", "#d9c4a5", "#c5ad99", "#e3ccab", "#ccb6b2", "#dbc6af"];
function paint(geometry: THREE.BufferGeometry, color: string) {
  const c = new THREE.Color(color);
  const colors = new Float32Array(geometry.attributes.position.count * 3);
  for (let i = 0; i < colors.length; i += 3) { colors[i] = c.r; colors[i + 1] = c.g; colors[i + 2] = c.b; }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}
function box(parts: Parts, w: number, h: number, d: number, x: number, y: number, z: number, color: string, ry = 0) {
  parts.push(paint(new THREE.BoxGeometry(w, h, d).rotateY(ry).translate(x, y, z), color));
}
function merge(parts: Parts) {
  return mergeSceneGeometry(parts);
}
function arch(inner: number, outer: number, depth: number) {
  const shape = new THREE.Shape();
  shape.moveTo(outer, 0);
  shape.absarc(0, 0, outer, 0, Math.PI, false);
  shape.lineTo(-inner, 0);
  shape.absarc(0, 0, inner, Math.PI, 0, true);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 12 }).translate(0, 0, -depth / 2);
}
function dShape(rx: number, rz: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-rx, 0);
  shape.absellipse(0, 0, rx, rz, Math.PI, 0, true, 0);
  shape.closePath();
  return new THREE.ShapeGeometry(shape, 48);
}
function inscription(text: string, subtitle = "", dark = false) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 160;
  const ctx = canvas.getContext("2d")!;
  if (dark) { ctx.fillStyle = "#f2ead8"; ctx.fillRect(0, 0, 1024, 160); }
  ctx.fillStyle = dark ? "#183c36" : "#645344";
  ctx.textAlign = "center";
  let size = dark ? 72 : 48;
  do { ctx.font = `700 ${size}px ${dark ? "Arial" : "Georgia"}`; size--; } while (size > 20 && ctx.measureText(text).width > 960);
  ctx.fillText(text, 512, subtitle ? 79 : 107);
  if (subtitle) { ctx.font = "600 29px Arial"; ctx.fillText(subtitle, 512, 130); }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
function useFacadeTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#d5c0a4"; ctx.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 8; row++) {
      for (let column = 0; column < 4; column++) {
        const x = column * 80 - (row % 2) * 40;
        ctx.fillStyle = stoneColors[(row * 3 + column) % stoneColors.length];
        ctx.fillRect(x + 1, row * 32 + 1, 78, 30);
      }
    }
    ctx.fillStyle = "#f0debd"; ctx.fillRect(67, 25, 122, 205);
    const glass = ctx.createLinearGradient(0, 32, 0, 218);
    glass.addColorStop(0, "#638085"); glass.addColorStop(0.5, "#344e50"); glass.addColorStop(1, "#1e3739");
    ctx.fillStyle = glass; ctx.fillRect(77, 34, 102, 182);
    ctx.fillStyle = "#bca987"; ctx.fillRect(125, 34, 6, 184); ctx.fillRect(77, 100, 102, 6);
    ctx.fillStyle = "#b3c8be"; ctx.globalAlpha = 0.4; ctx.fillRect(81, 38, 39, 57); ctx.globalAlpha = 1;
    ctx.fillStyle = "#9e876a"; ctx.fillRect(64, 231, 128, 6);
    return tileTexture(new THREE.CanvasTexture(canvas), 1, 1);
  }, []);
}

/** The flat-topped Forgan Smith tower and an open, D-shaped sandstone arcade. */
export function GreatCourt() {
  const facade = useFacadeTexture();
  const name = useMemo(() => inscription("THE UNIVERSITY OF QUEENSLAND", "FORGAN SMITH · ST LUCIA"), []);
  const { stone, trim, openings, windows, lawn, paving } = useMemo(() => {
    const walls: Parts = [], details: Parts = [], arcades: Parts = [], panes: Parts = [];
    for (const [index, w] of CAMPUS_WINGS.entries()) {
      box(walls, w.hw * 2, w.h, w.hd * 2, w.x, w.h / 2, w.z, stoneColors[index], w.ry);
      box(details, w.hw * 2 + 0.6, 0.42, w.hd * 2 + 0.6, w.x, w.h + 0.15, w.z, "#ede0c4", w.ry);
      box(details, w.hw * 2 + 0.25, 0.18, w.hd * 2 + 0.2, w.x, 0.25, w.z, "#a58f76", w.ry);
      for (const side of [-1, 1]) {
        const geometry = new THREE.PlaneGeometry(w.hw * 2 - 0.8, w.h - 1.15);
        const uv = geometry.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w.hw * 2 - 0.8) / 2.6, uv.getY(i) * 3);
        geometry.rotateY(side < 0 ? Math.PI : 0).translate(0, w.h / 2, side * (w.hd + 0.012)).rotateY(w.ry).translate(w.x, 0, w.z);
        panes.push(geometry);
      }
    }
    const tower = GREAT_COURT.tower;
    box(walls, tower.w, 14, 6.6, tower.x, 12, tower.z, "#d7c0a2");
    box(details, tower.w + 0.8, 0.55, 7.3, tower.x, 19.15, tower.z, "#eddbba");
    box(details, tower.w - 0.65, 0.7, 5.8, tower.x, 19.7, tower.z, "#cdb798");
    for (const side of [-1, 1]) {
      box(walls, 1, 5, 6.6, tower.x + side * 3.3, 2.5, tower.z, "#c8af8e");
      for (const x of [-1.8, 0, 1.8]) {
        box(details, 0.48, 5.8, 0.09, tower.x + x, 14.75, tower.z + side * 3.32, "#3f524c");
        box(details, 0.74, 0.18, 0.16, tower.x + x, 11.8, tower.z + side * 3.34, "#f0dfbf");
      }
      for (const x of [-2.7, 2.7]) box(details, 0.2, 13.5, 0.2, tower.x + x, 11.8, tower.z + side * 3.37, "#e9d4b2");
    }
    arcades.push(paint(arch(2.8, 3.35, 6.65).translate(tower.x, 1.8, tower.z), "#e4cdb0"));
    // True arch openings and shaded walks. Repeated parts are baked into two meshes.
    for (const [i, segment] of CAMPUS_CLOISTERS.entries()) {
      const local = (g: THREE.BufferGeometry) => g.rotateY(segment.ry).translate(segment.x, 0, segment.z);
      for (const x of [-3.15, 0, 3.15]) {
        arcades.push(paint(local(new THREE.CylinderGeometry(0.22, 0.29, 2.15, 8).translate(x, 1.075, 0)), stoneColors[i % 6]));
        arcades.push(paint(local(new THREE.BoxGeometry(0.65, 0.2, 0.65).translate(x, 2.15, 0)), "#e7d2b0"));
      }
      for (const x of [-1.575, 1.575]) arcades.push(paint(local(arch(1.34, 1.58, 0.7).translate(x, 2.12, 0)), stoneColors[(i + 2) % 6]));
      box(details, 6.9, 0.45, 3.4, segment.x, 4.08, segment.z, "#d8c4a5", segment.ry);
      box(details, 6.8, 0.15, 3.3, segment.x, 0.03, segment.z, "#b6aa94", segment.ry);
      // A small projecting stone accent suggests the carved cloister details.
      arcades.push(paint(local(new THREE.IcosahedronGeometry(0.24, 0).translate(0, 3.68, 0.44)), "#aa9076"));
    }
    return { stone: merge(walls), trim: merge(details), openings: merge(arcades), windows: merge(panes), lawn: dShape(22.5, 25.3), paving: dShape(26.4, 29.4) };
  }, []);
  return <group>
    <mesh geometry={stone}><meshToonMaterial gradientMap={TOON} vertexColors /></mesh>
    <mesh geometry={trim}><meshToonMaterial gradientMap={TOON} vertexColors /></mesh>
    <mesh geometry={openings}><meshToonMaterial gradientMap={TOON} vertexColors /></mesh>
    <mesh geometry={windows}><meshToonMaterial gradientMap={TOON} map={facade} /></mesh>
    <mesh geometry={paving} position={[-36, 0.012, -26]} rotation-x={-Math.PI / 2}><meshToonMaterial gradientMap={TOON} color="#c9bd9f" /></mesh>
    <mesh geometry={lawn} position={[-36, 0.025, -26]} rotation-x={-Math.PI / 2}><meshToonMaterial gradientMap={TOON} color="#84a56d" /></mesh>
    <mesh position={[-36, 0.038, -38.5]} rotation-x={-Math.PI / 2}><planeGeometry args={[2.6, 25]} /><meshToonMaterial gradientMap={TOON} color="#d8cbb0" /></mesh>
    <mesh position={[-36, 0.02, -12.6]} rotation-x={-Math.PI / 2}><planeGeometry args={[54, 13.5]} /><meshToonMaterial gradientMap={TOON} color="#d1c4a9" /></mesh>
    <mesh position={[-36, 6.65, -19.66]} userData={{ noShadow: true }}><planeGeometry args={[21, 3.2]} /><meshBasicMaterial map={name} transparent depthWrite={false} toneMapped={false} /></mesh>
  </group>;
}
