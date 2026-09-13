import type { BufferGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Three's extruded arches and indexed primitives must use the same representation. */
export function mergeSceneGeometry(parts: BufferGeometry[]): BufferGeometry {
  const mixedIndices = parts.some((part) => !!part.index !== !!parts[0]?.index);
  const compatible = mixedIndices ? parts.map((part) => part.index ? part.toNonIndexed() : part) : parts;
  const geometry = mergeGeometries(compatible);
  for (const part of new Set([...parts, ...compatible])) part.dispose();
  if (!geometry) throw new Error("Scene geometry has incompatible vertex attributes.");
  return geometry;
}
