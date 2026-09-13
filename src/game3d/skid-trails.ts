export const SKID_CAPACITY = 512;
export const SKID_LIFETIME = 22;

/** Fixed-size reusable ribbons. Each tyre has its own last contact point. */
export class SkidTrailBuffer {
  readonly positions: Float32Array;
  readonly born: Float32Array;
  readonly strengths: Float32Array;
  readonly colors: Float32Array;
  readonly uv: Float32Array;
  readonly contacts = Array.from({ length: 3 }, () => ({ active: false, x: 0, y: 0, z: 0, time: 0 }));
  count = 0;
  cursor = 0;
  version = 0;
  lastWrite = -Infinity;

  constructor(readonly capacity = SKID_CAPACITY) {
    this.positions = new Float32Array(capacity * 18);
    this.born = new Float32Array(capacity * 6);
    this.strengths = new Float32Array(capacity * 6);
    this.colors = new Float32Array(capacity * 18);
    this.uv = new Float32Array(capacity * 12);
    for (let i = 0; i < capacity; i++) this.uv.set([0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1], i * 12);
  }

  end(track?: number) {
    if (track === undefined) for (const contact of this.contacts) contact.active = false;
    else this.contacts[track].active = false;
  }

  stamp(track: number, x: number, y: number, z: number, width: number, time: number, strength: number, color: readonly number[]) {
    const previous = this.contacts[track];
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || !Number.isFinite(time) || !(strength > 0)) {
      previous.active = false;
      return;
    }
    const dx = x - previous.x, dz = z - previous.z;
    const distance = Math.hypot(dx, dz);
    // Break continuity after teleports, raised-floor transitions or a pause.
    if (!previous.active || distance > 2 || Math.abs(y - previous.y) > 0.18 || time - previous.time > 0.3) {
      Object.assign(previous, { active: true, x, y, z, time });
      return;
    }
    if (distance < 0.055) return;
    const nx = -dz / distance * width / 2, nz = dx / distance * width / 2;
    const start = this.cursor * 18;
    this.positions.set([
      previous.x + nx, previous.y, previous.z + nz,
      x + nx, y, z + nz,
      previous.x - nx, previous.y, previous.z - nz,
      previous.x - nx, previous.y, previous.z - nz,
      x + nx, y, z + nz,
      x - nx, y, z - nz,
    ], start);
    for (let vertex = 0; vertex < 6; vertex++) {
      const index = this.cursor * 6 + vertex;
      this.born[index] = time;
      this.strengths[index] = Math.max(0, Math.min(1, strength));
      this.colors.set(color, index * 3);
    }
    this.cursor = (this.cursor + 1) % this.capacity;
    this.count = Math.min(this.capacity, this.count + 1);
    this.lastWrite = time;
    this.version++;
    Object.assign(previous, { x, y, z, time });
  }
}
