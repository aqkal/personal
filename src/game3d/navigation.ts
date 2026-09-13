import { INTERACTABLES, WORLD_BOUNDS, isBlocked, type WorldInteractable } from "./layout";

export type Waypoint = { x: number; z: number };
export const destinationId = (item: WorldInteractable) =>
  item.payload ? `${item.payload.kind}:${item.payload.id}` : "lookout";

export const DESTINATIONS = INTERACTABLES.filter((item) => item.payload || item.z > 50);
export const navigation = {
  destination: null as WorldInteractable | null,
  points: [] as Waypoint[],
  index: 0,
  arrived: false,
};

export function clearSegment(a: Waypoint, b: Waypoint): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (isBlocked(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
  }
  return true;
}

const { minX: MIN_X, minZ: MIN_Z, maxX: MAX_X, maxZ: MAX_Z } = WORLD_BOUNDS;
const WIDTH = MAX_X - MIN_X + 1;
const HEIGHT = MAX_Z - MIN_Z + 1;
const COUNT = WIDTH * HEIGHT;
let walkable: Uint8Array | null = null;
const point = (id: number): Waypoint => ({ x: MIN_X + id % WIDTH, z: MIN_Z + Math.floor(id / WIDTH) });

function grid() {
  if (!walkable) {
    walkable = new Uint8Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const p = point(i);
      walkable[i] = isBlocked(p.x, p.z) ? 0 : 1;
    }
  }
  return walkable;
}

function closestNode(position: Waypoint, cells: Uint8Array, radius: number, requireSightline: boolean) {
  let best = -1;
  let distance = radius;
  for (let z = Math.max(MIN_Z, Math.floor(position.z - radius)); z <= Math.min(MAX_Z, Math.ceil(position.z + radius)); z++) {
    for (let x = Math.max(MIN_X, Math.floor(position.x - radius)); x <= Math.min(MAX_X, Math.ceil(position.x + radius)); x++) {
      const id = (z - MIN_Z) * WIDTH + x - MIN_X;
      if (!cells[id]) continue;
      const d = Math.hypot(x - position.x, z - position.z);
      if (d >= distance || (requireSightline && !clearSegment(position, { x, z }))) continue;
      distance = d;
      best = id;
    }
  }
  return best;
}

/** A* runs only when a destination is chosen or the visitor leaves its route. */
export function findRoute(from: Waypoint, destination: WorldInteractable): Waypoint[] {
  const cells = grid();
  const start = closestNode(from, cells, 3, true);
  const goal = closestNode(destination, cells, destination.radius - 0.35, false);
  if (start < 0 || goal < 0) return [];
  const costs = new Float64Array(COUNT).fill(Infinity);
  const parents = new Int32Array(COUNT).fill(-1);
  const closed = new Uint8Array(COUNT);
  const open = new Set<number>([start]);
  const target = point(goal);
  costs[start] = 0;
  while (open.size) {
    let current = start;
    let score = Infinity;
    for (const candidate of open) {
      const p = point(candidate);
      const f = costs[candidate] + Math.hypot(p.x - target.x, p.z - target.z);
      if (f < score) { score = f; current = candidate; }
    }
    if (current === goal) {
      const route: Waypoint[] = [];
      for (let id = goal; id !== -1; id = parents[id]) route.push(point(id));
      route.reverse();
      route.unshift({ x: from.x, z: from.z });
      return route;
    }
    open.delete(current);
    closed[current] = 1;
    const p = point(current);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const x = p.x + dx;
      const z = p.z + dz;
      if (x < MIN_X || x > MAX_X || z < MIN_Z || z > MAX_Z) continue;
      const id = current + dz * WIDTH + dx;
      if (!cells[id] || closed[id] || !clearSegment(p, { x, z })) continue;
      const cost = costs[current] + (dx && dz ? Math.SQRT2 : 1);
      if (cost >= costs[id]) continue;
      costs[id] = cost;
      parents[id] = current;
      open.add(id);
    }
  }
  return [];
}
