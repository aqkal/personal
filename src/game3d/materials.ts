import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/**
 * Shared shading assets for the stylized look.
 *
 * TOON is a 3-band gradient map: with meshToonMaterial it turns plain
 * Lambert shading into designed-looking cel bands, at the same GPU cost.
 */
export const TOON = (() => {
  const tex = new THREE.DataTexture(
    new Uint8Array([115, 195, 255]),
    3,
    1,
    THREE.RedFormat,
  );
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();

/** Soft-edged box: the difference between "cube" and "designed object". */
export function roundedBox(
  w: number,
  h: number,
  d: number,
  radius = 0.12,
): THREE.BufferGeometry {
  return new RoundedBoxGeometry(w, h, d, 3, Math.min(radius, w / 3, h / 3, d / 3));
}
