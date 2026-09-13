import * as THREE from "three";

/**
 * Shared shading assets for the stylized look.
 *
 * TOON is a 5-band gradient map: with meshToonMaterial it turns plain
 * Lambert shading into designed-looking cel bands, at the same GPU cost.
 * Single-channel by design: three.js reads only the red channel.
 */
export const TOON = (() => {
  const tex = new THREE.DataTexture(
    new Uint8Array([70, 128, 175, 215, 250]),
    5,
    1,
    THREE.RedFormat,
  );
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
})();

/** The sun's DIRECTION from the origin. The sky shader normalizes it. */
export const SUN_POSITION: [number, number, number] = [45, 60, -35];

/**
 * Where the directional light actually sits. Same direction, pushed far out so
 * the shadow camera's near plane clears the whole campus with depth precision
 * to spare. Nothing else depends on the distance, only the direction.
 */
export const SUN_LIGHT_POSITION: [number, number, number] = (() => {
  const [x, y, z] = SUN_POSITION;
  const len = Math.hypot(x, y, z);
  const d = 150;
  return [(x / len) * d, (y / len) * d, (z / len) * d];
})();

/**
 * Orthonormal basis around the sun direction. The shadow frustum follows the
 * camera, and a moving frustum makes shadow edges crawl unless its centre is
 * snapped to whole shadow-map texels, which needs this basis.
 */
export const SUN_BASIS = (() => {
  const dir = new THREE.Vector3(...SUN_POSITION).normalize();
  const right = new THREE.Vector3()
    .crossVectors(new THREE.Vector3(0, 1, 0), dir)
    .normalize();
  const up = new THREE.Vector3().crossVectors(dir, right).normalize();
  return { dir, right, up };
})();

/**
 * Where shadows fall on the ground, derived from the sun rather than guessed.
 * `angle` lays an elongated quad (rotation [-PI/2, 0, angle]) along that
 * direction, so every blob shadow in the scene points the same way.
 */
export const SUN_GROUND = (() => {
  const x = -SUN_POSITION[0];
  const z = -SUN_POSITION[2];
  const len = Math.hypot(x, z);
  const dx = x / len;
  const dz = z / len;
  return { dx, dz, angle: Math.atan2(-dz, dx) };
})();

/** Ground-plane offset at the given distance along the shadow direction. */
export function sunOffset(distance: number): [number, number] {
  return [SUN_GROUND.dx * distance, SUN_GROUND.dz * distance];
}

/**
 * How far a shadow lands from its caster, per unit of caster height. The sun
 * sits 60 up and 57 out, so very nearly one-to-one. Shadow offsets used to be
 * a fraction of this, which parked every shadow underneath its own object
 * where nothing could see it.
 */
export const SHADOW_REACH =
  Math.hypot(SUN_POSITION[0], SUN_POSITION[2]) / SUN_POSITION[1];

/** Ground offset for a caster of the given height. */
export function shadowOffset(height: number): [number, number] {
  return sunOffset(height * SHADOW_REACH);
}

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return [c, c.getContext("2d")!];
}

let softShadow: THREE.CanvasTexture | null = null;

/** Radial falloff mask: turns a flat-opacity disc into a real soft shadow. */
export function softShadowAlpha(): THREE.CanvasTexture {
  if (softShadow) return softShadow;
  const [c, ctx] = canvas(64);
  // holds near-solid through the middle so the shadow has a readable core,
  // then falls off fast: a slow ramp from the centre just reads as a smudge
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.5, "#f2f2f2");
  g.addColorStop(0.72, "#a8a8a8");
  g.addColorStop(0.9, "#2e2e2e");
  g.addColorStop(1, "#000000");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  softShadow = new THREE.CanvasTexture(c);
  return softShadow;
}

/**
 * Every tiled surface in the scene is viewed at a grazing angle, where
 * anisotropy is the difference between crisp ground and a shimmering mess.
 * three clamps the value to the hardware maximum on upload.
 */
export function tileTexture(
  tex: THREE.Texture,
  repeatX = 1,
  repeatY = repeatX,
): THREE.Texture {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
