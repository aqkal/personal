import type { Collider } from "./layout";

type CompiledCollider =
  | { kind: "circle"; x: number; z: number; radiusSquared: number }
  | { kind: "ellipse"; x: number; z: number; rx: number; rz: number }
  | { kind: "box"; x: number; z: number; hw: number; hd: number; cos: number; sin: number };

/** Static broad phase. Bounds include the same local padding as the exact test. */
export function createPointCollisionQuery(colliders: readonly Collider[], radius: number) {
  const cellSize = 4;
  const columns = new Map<number, Map<number, CompiledCollider[]>>();
  for (const collider of colliders) {
    let compiled: CompiledCollider;
    let extentX: number, extentZ: number;
    if ("r" in collider) {
      extentX = extentZ = collider.r + radius;
      compiled = { kind: "circle", x: collider.x, z: collider.z, radiusSquared: extentX * extentX };
    } else if ("rx" in collider) {
      extentX = collider.rx + radius;
      extentZ = collider.rz + radius;
      compiled = { kind: "ellipse", x: collider.x, z: collider.z, rx: extentX, rz: extentZ };
    } else {
      const cos = Math.cos(collider.ry ?? 0), sin = Math.sin(collider.ry ?? 0);
      const hw = collider.hw + radius, hd = collider.hd + radius;
      extentX = Math.abs(cos) * hw + Math.abs(sin) * hd;
      extentZ = Math.abs(sin) * hw + Math.abs(cos) * hd;
      compiled = { kind: "box", x: collider.x, z: collider.z, hw, hd, cos, sin };
    }
    // Expand only the broad phase to keep floating-point boundary cells safe.
    const minX = Math.floor((collider.x - extentX - 1e-9) / cellSize);
    const maxX = Math.floor((collider.x + extentX + 1e-9) / cellSize);
    const minZ = Math.floor((collider.z - extentZ - 1e-9) / cellSize);
    const maxZ = Math.floor((collider.z + extentZ + 1e-9) / cellSize);
    for (let x = minX; x <= maxX; x++) {
      let column = columns.get(x);
      if (!column) columns.set(x, column = new Map());
      for (let z = minZ; z <= maxZ; z++) {
        const cell = column.get(z);
        if (cell) cell.push(compiled);
        else column.set(z, [compiled]);
      }
    }
  }

  return (x: number, z: number): boolean => {
    const nearby = columns.get(Math.floor(x / cellSize))?.get(Math.floor(z / cellSize));
    if (!nearby) return false;
    for (const collider of nearby) {
      const dx = x - collider.x, dz = z - collider.z;
      if (collider.kind === "circle") {
        if (dx * dx + dz * dz < collider.radiusSquared) return true;
      } else if (collider.kind === "ellipse") {
        if ((dx / collider.rx) ** 2 + (dz / collider.rz) ** 2 < 1) return true;
      } else if (Math.abs(dx * collider.cos - dz * collider.sin) < collider.hw
        && Math.abs(dx * collider.sin + dz * collider.cos) < collider.hd) {
        return true;
      }
    }
    return false;
  };
}
