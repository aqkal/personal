"use client";

import { useEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { experience, projects, worldSigns } from "@content";
import { EXHIBIT_PLACEMENTS, GALLERY_EXHIBIT_SCALE } from "./authored-layout";
import { BUCKLER } from "./layout";

type Sign = {
  text: string; sub?: string; number?: string;
  x: number; y: number; z: number; ry: number; w: number; h: number;
  style: "project" | "plinth" | "qualia" | "dsr" | "buckler" | "gallery" | "cubo" | "mbr" | "polar";
  accent?: string;
};
const PROJECT_COLORS = ["#66d1d4", "#cdbcec", "#f5bc41", "#cfa5b4", "#8bcc98"];

function fit(ctx: CanvasRenderingContext2D, text: string, width: number, size: number, family = "Arial", weight = "700") {
  let font = size;
  do { ctx.font = `${weight} ${font}px ${family}`; font -= 1; } while (font > 10 && ctx.measureText(text).width > width);
}

function paint(ctx: CanvasRenderingContext2D, sign: Sign, w: number, h: number, cuboPoster: HTMLImageElement) {
  const pad = w * .055;
  ctx.fillStyle = sign.style === "qualia" ? "#0d1812" : sign.style === "cubo" ? "#f36c32" : sign.style === "polar" ? "#102e54" : "#171b19";
  ctx.fillRect(0, 0, w, h); ctx.textBaseline = "middle"; ctx.textAlign = "left";
  if (sign.style === "cubo") {
    ctx.fillStyle = "#e64a0e"; ctx.fillRect(0, 0, w, h);
    const imageH = w*cuboPoster.naturalHeight/cuboPoster.naturalWidth;
    ctx.drawImage(cuboPoster, 0, (h-imageH)/2, w, imageH);
    ctx.fillStyle = "#fffdf6";
    fit(ctx, worldSigns.folioCredit, w-pad*2, w*.031);
    ctx.fillText(worldSigns.folioCredit, pad, h*.075);
    fit(ctx, worldSigns.folios[0].detail, w-pad*2, w*.038, "Arial", "400");
    ctx.fillText(worldSigns.folios[0].detail, pad, h*.92);
    return;
  }
  if (sign.style === "mbr" || sign.style === "polar") {
    const folio = worldSigns.folios[sign.style === "mbr" ? 1 : 2];
    ctx.fillStyle = sign.style === "polar" ? "#8bacf7" : "#fffdf6";
    fit(ctx, worldSigns.folioCredit, w-pad*2, w*.031); ctx.fillText(worldSigns.folioCredit, pad, h*.075);
    if (sign.style === "mbr") {
      const aurora = ctx.createLinearGradient(0, h*.25, w, h*.80);
      aurora.addColorStop(0, "#1c2c29"); aurora.addColorStop(.40, "#105849"); aurora.addColorStop(.72, "#477caa"); aurora.addColorStop(1, "#22272e");
      ctx.fillStyle = aurora; ctx.fillRect(0, h*.27, w, h*.57);
      ctx.fillStyle = "#f3f0e7"; fit(ctx, folio.name, w-pad*2, w*.35, "Georgia", "400"); ctx.fillText(folio.name, pad, h*.49);
      fit(ctx, folio.sub, w-pad*2, w*.075, "Arial", "400"); ctx.fillText(folio.sub, pad, h*.68);
    } else {
      ctx.fillStyle = "#8cacfb"; ctx.fillRect(pad, h*.24, w-pad*2, h*.012);
      ctx.fillStyle = "#eaf2ff"; fit(ctx, folio.name, w-pad*2, w*.245, "Impact, Arial", "900"); ctx.fillText(folio.name, pad, h*.47);
      fit(ctx, folio.sub, w-pad*2, w*.21, "Impact, Arial", "900"); ctx.fillText(folio.sub, pad, h*.65);
      ctx.fillStyle = "#8cacfb"; ctx.fillRect(pad, h*.80, w-pad*2, h*.012);
    }
    ctx.fillStyle = "#fffdf6"; fit(ctx, folio.detail, w-pad*2, w*.038, "Arial", "400"); ctx.fillText(folio.detail, pad, h*.92);
    return;
  }
  if (sign.style === "project") {
    ctx.fillStyle = sign.accent!; ctx.fillRect(0, 0, w*.017, h);
    fit(ctx, sign.number!, w*.15, h*.17); ctx.fillText(sign.number!, pad, h*.19);
    ctx.fillStyle = "#faf9f3";
    let line = ""; const lines: string[] = [];
    ctx.font = `700 ${h*.17}px Arial`;
    for (const word of sign.text.split(" ")) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > w-pad*2 && line) { lines.push(line); line = word; } else line = next;
    }
    lines.push(line);
    lines.slice(0, 2).forEach((text, i) => { fit(ctx, text, w-pad*2, h*.17); ctx.fillText(text, pad, h*(.43+i*.20)); });
    ctx.fillStyle = sign.accent!; fit(ctx, sign.sub ?? "", w-pad*2, h*.075, "Arial", "400"); ctx.fillText(sign.sub ?? "", pad, h*.88);
    return;
  }
  ctx.textAlign = "center"; ctx.fillStyle = sign.style === "qualia" ? "#e6f1e9" : "#faf9f3";
  fit(ctx, sign.text, w-pad*2, h*(sign.sub ? .46 : .51), "Arial", sign.style === "qualia" ? "600" : "700");
  ctx.fillText(sign.text, w/2, h*(sign.sub ? .37 : .50));
  if (sign.sub) {
    ctx.fillStyle = sign.style === "qualia" ? "#cdbcec" : sign.style === "dsr" ? "#f3f1e9" : "#a9c8c0";
    fit(ctx, sign.sub, w-pad*2, h*.20, sign.style === "dsr" ? "Georgia" : "Arial", "400"); ctx.fillText(sign.sub, w/2, h*.79);
  }
}

/** Fitted, content-specific facade and exhibition signage shares one atlas. */
export function ExhibitLabels() {
  const cuboPoster = useTexture("/assets/branding/cubo-poster.png");
  const { geometry, texture } = useMemo(() => {
    const labels: Sign[] = EXHIBIT_PLACEMENTS.flatMap((p, i) => {
      const project = projects.find(item => item.id === p.id)!;
      return [
        { text: project.name, x: p.x, z: p.z-.612*GALLERY_EXHIBIT_SCALE, y: p.y+.43*GALLERY_EXHIBIT_SCALE, ry: Math.PI, w: 2.85*GALLERY_EXHIBIT_SCALE, h: .31*GALLERY_EXHIBIT_SCALE, style: "plinth" as const },
        { text: project.name, sub: project.tech.slice(0, 3).join(" / "), number: String(i+1).padStart(2, "0"), x: p.x, z: 25.59, y: 3.42, ry: Math.PI, w: 3.55, h: 1.4, style: "project" as const, accent: PROJECT_COLORS[i] },
      ];
    });
    labels.push(
      { text: worldSigns.gallery, sub: worldSigns.gallerySub, x: 27, y: 5.85, z: 25.75, ry: Math.PI, w: 12, h: .68, style: "gallery" },
      { text: worldSigns.qualia, sub: worldSigns.qualiaSub, x: 18, y: 3.95, z: -21.50, ry: 0, w: 7.3, h: .55, style: "qualia" },
      { text: worldSigns.qualiaConstruction, sub: worldSigns.qualiaConstructionSub, x: 14.1, y: 1.65, z: -18.155, ry: 0, w: 3.25, h: 1.24, style: "qualia" },
      { text: worldSigns.qualiaConstruction, sub: worldSigns.qualiaConstructionSub, x: 14.1, y: 1.65, z: -18.345, ry: Math.PI, w: 3.25, h: 1.24, style: "qualia" },
      { text: worldSigns.dsr, sub: worldSigns.dsrSub, x: 31, y: 4.55, z: -18.98, ry: 0, w: 7.7, h: 1.1, style: "dsr" },
      { text: experience[2].company, sub: worldSigns.bucklerSub, x: BUCKLER.x, y: 3.7, z: BUCKLER.z+3.57, ry: 0, w: 3.8, h: .7, style: "buckler" },
      { text: "", x: 28.45, y: 2.65, z: -18.96, ry: 0, w: 2.05, h: 2.65, style: "cubo" },
      { text: "", x: 33.55, y: 2.65, z: -18.96, ry: 0, w: 2.05, h: 2.65, style: "mbr" },
      { text: "", x: 35.28, y: 2.65, z: -23.1, ry: Math.PI/2, w: 2.5, h: 2.65, style: "polar" },
    );
    const pixelSize = (sign: Sign) => {
      const w = sign.style === "plinth" || sign.style === "project" ? 480 : Math.round(Math.min(1000, 512*sign.w/sign.h));
      return { w, h: Math.round(w*sign.h/sign.w) };
    };
    // Tall folios pack together; small facade strips fill the remaining shelves.
    labels.sort((a, b) => pixelSize(b).h - pixelSize(a).h);
    const canvas = document.createElement("canvas"); canvas.width = 2048; canvas.height = 2048;
    const ctx = canvas.getContext("2d")!; const parts: THREE.BufferGeometry[] = [];
    let x = 4, y = 4, rowHeight = 0;
    for (const sign of labels) {
      const { w: pixelW, h: pixelH } = pixelSize(sign);
      if (x+pixelW+4 > canvas.width) { x = 4; y += rowHeight+8; rowHeight = 0; }
      if (y+pixelH+4 > canvas.height) throw new Error("Campus signage atlas is full");
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, pixelW, pixelH); ctx.clip(); ctx.translate(x, y); paint(ctx, sign, pixelW, pixelH, cuboPoster.image as HTMLImageElement); ctx.restore();
      const plane = new THREE.PlaneGeometry(sign.w, sign.h), uv = plane.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (x+uv.getX(i)*pixelW)/canvas.width, 1-(y+(1-uv.getY(i))*pixelH)/canvas.height);
      plane.rotateY(sign.ry).translate(sign.x, sign.y, sign.z); parts.push(plane);
      x += pixelW+8; rowHeight = Math.max(rowHeight, pixelH);
    }
    const geometry = mergeGeometries(parts); parts.forEach(part => part.dispose());
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
    return { geometry, texture };
  }, [cuboPoster]);
  useEffect(() => () => { geometry.dispose(); texture.dispose(); }, [geometry, texture]);
  return <mesh geometry={geometry} userData={{ noShadow: true }}><meshBasicMaterial map={texture} toneMapped={false} polygonOffset polygonOffsetFactor={-2} /></mesh>;
}
