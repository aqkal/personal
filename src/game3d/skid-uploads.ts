import type { BufferAttribute, BufferGeometry } from "three";

const DYNAMIC_ATTRIBUTES = ["position", "born", "strength", "ink"] as const;

/** Upload only overwritten ribbon slots, including both ends of a wrapped pool. */
export function queueSkidUpload(geometry: BufferGeometry, first: number, written: number, capacity: number) {
  if (written <= 0) return;
  const start = written >= capacity ? 0 : first;
  const count = Math.min(written, capacity);
  const tail = Math.min(count, capacity - start);
  for (const name of DYNAMIC_ATTRIBUTES) {
    const attribute = geometry.getAttribute(name) as BufferAttribute;
    const stride = attribute.itemSize * 6;
    // Keep earlier pending ranges until Three uploads them. A render can be
    // deferred after an update, so clearing here could leave stale GPU data.
    attribute.addUpdateRange(start * stride, tail * stride);
    if (count > tail) attribute.addUpdateRange(0, (count - tail) * stride);
    attribute.needsUpdate = true;
  }
}
