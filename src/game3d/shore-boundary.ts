import { MAINLAND } from "./terrain";
import { FERRY_DOCKS } from "./travel-layout";

export type ShorePoint = Readonly<{ x: number; z: number }>;

export type ShoreRailSegment = Readonly<{
  id: string;
  runId: string;
  start: ShorePoint;
  end: ShorePoint;
  centre: ShorePoint;
  length: number;
  ry: number;
  y: number;
}>;

/** A box footprint ready for layout, camera and Rapier integration. */
export type ShoreRailPanel = Readonly<{
  id: string;
  x: number;
  z: number;
  y: number;
  h: number;
  hw: number;
  hd: number;
  ry: number;
}>;

export type ShoreRailPost = Readonly<{
  id: string;
  runId: string;
  x: number;
  z: number;
  y: number;
  endpoint: boolean;
}>;

export const SHORE_RAIL_STYLE = {
  inset: 0.6,
  targetPanelLength: 3.05,
  curbWidth: 0.34,
  curbHeight: 0.16,
  postRadius: 0.052,
  endPostRadius: 0.074,
  postHeight: 1.12,
  railRadius: 0.04,
  railHeights: [0.49, 0.98],
  collisionHalfWidth: 0.17,
} as const;

/** Deliberately generous arrivals keep the border clear of boarding paths. */
export const SHORE_ACCESS_GAPS = [
  {
    id: "ferry-pier",
    edge: "positive-z",
    from: FERRY_DOCKS[0].x - 2.3,
    to: FERRY_DOCKS[0].x + 2.3,
  },
  { id: "pedestrian-bridge", edge: "positive-z", from: -3.2, to: 3.2 },
] as const;

function appendPoint(points: ShorePoint[], x: number, z: number) {
  const last = points.at(-1);
  if (!last || Math.hypot(x - last.x, z - last.z) > 0.0001) points.push({ x, z });
}

function appendArc(
  points: ShorePoint[],
  cx: number,
  cz: number,
  radius: number,
  from: number,
  to: number,
) {
  const steps = 10;
  for (let index = 0; index <= steps; index += 1) {
    const angle = from + (to - from) * index / steps;
    appendPoint(points, cx + Math.cos(angle) * radius, cz + Math.sin(angle) * radius);
  }
}

function resample(points: readonly ShorePoint[], targetLength: number) {
  const lengths: number[] = [0];
  for (let index = 1; index < points.length; index += 1) {
    lengths.push(lengths[index - 1] + Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].z - points[index - 1].z,
    ));
  }

  const total = lengths.at(-1) ?? 0;
  const panelCount = Math.max(1, Math.ceil(total / targetLength));
  const result: ShorePoint[] = [];
  let sourceIndex = 1;
  for (let index = 0; index <= panelCount; index += 1) {
    const distance = index === panelCount ? total : index / panelCount * total;
    while (sourceIndex < lengths.length - 1 && lengths[sourceIndex] < distance) sourceIndex += 1;
    const startDistance = lengths[sourceIndex - 1];
    const span = lengths[sourceIndex] - startDistance;
    const t = span > 0 ? (distance - startDistance) / span : 0;
    const a = points[sourceIndex - 1];
    const b = points[sourceIndex];
    result.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
  }
  return result;
}

function mainlandRuns() {
  const inset = SHORE_RAIL_STYLE.inset;
  const left = MAINLAND.minX + inset;
  const right = MAINLAND.maxX - inset;
  const bottom = MAINLAND.minZ + inset;
  const top = MAINLAND.maxZ - inset;
  const radius = MAINLAND.radius - inset;
  const leftCentre = left + radius;
  const rightCentre = right - radius;
  const bottomCentre = bottom + radius;
  const topCentre = top - radius;
  const ferry = SHORE_ACCESS_GAPS[0];
  const bridge = SHORE_ACCESS_GAPS[1];

  // This long run starts at the bridge, follows the east, south and west
  // shores, then finishes at the ferry pier. Its ends read as intentional
  // arrival markers instead of arbitrary missing fence panels.
  const perimeter: ShorePoint[] = [];
  appendPoint(perimeter, bridge.to, top);
  appendPoint(perimeter, rightCentre, top);
  appendArc(perimeter, rightCentre, topCentre, radius, Math.PI / 2, 0);
  appendPoint(perimeter, right, bottomCentre);
  appendArc(perimeter, rightCentre, bottomCentre, radius, 0, -Math.PI / 2);
  appendPoint(perimeter, leftCentre, bottom);
  appendArc(perimeter, leftCentre, bottomCentre, radius, -Math.PI / 2, -Math.PI);
  appendPoint(perimeter, left, topCentre);
  appendArc(perimeter, leftCentre, topCentre, radius, Math.PI, Math.PI / 2);
  appendPoint(perimeter, ferry.from, top);

  const betweenArrivals: ShorePoint[] = [
    { x: ferry.to, z: top },
    { x: bridge.from, z: top },
  ];

  return [
    { id: "mainland-perimeter", points: resample(perimeter, SHORE_RAIL_STYLE.targetPanelLength) },
    { id: "mainland-arrivals", points: resample(betweenArrivals, SHORE_RAIL_STYLE.targetPanelLength) },
  ] as const;
}

const RAIL_RUNS = mainlandRuns();

export const SHORE_RAIL_SEGMENTS: readonly ShoreRailSegment[] = RAIL_RUNS.flatMap((run) =>
  run.points.slice(0, -1).map((start, index) => {
    const end = run.points[index + 1];
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    return {
      id: `${run.id}-panel-${index}`,
      runId: run.id,
      start,
      end,
      centre: { x: (start.x + end.x) / 2, z: (start.z + end.z) / 2 },
      length: Math.hypot(dx, dz),
      ry: Math.atan2(dx, dz),
      y: 0,
    };
  }),
);

export const SHORE_RAIL_PANELS: readonly ShoreRailPanel[] = SHORE_RAIL_SEGMENTS.map((segment) => ({
  id: `shore-rail-${segment.id}`,
  x: segment.centre.x,
  z: segment.centre.z,
  y: segment.y,
  h: SHORE_RAIL_STYLE.postHeight,
  hw: SHORE_RAIL_STYLE.collisionHalfWidth,
  hd: segment.length / 2,
  ry: segment.ry,
}));

export const SHORE_RAIL_POSTS: readonly ShoreRailPost[] = RAIL_RUNS.flatMap((run) =>
  run.points.map((point, index) => ({
    id: `${run.id}-post-${index}`,
    runId: run.id,
    x: point.x,
    z: point.z,
    y: 0,
    endpoint: index === 0 || index === run.points.length - 1,
  })),
);
