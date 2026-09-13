import assert from "node:assert/strict";
import { BufferAttribute, BufferGeometry } from "three";
import { WebGLAttributes } from "three/src/renderers/webgl/WebGLAttributes.js";
import { SkidTrailBuffer } from "../src/game3d/skid-trails.ts";
import { queueSkidUpload } from "../src/game3d/skid-uploads.ts";

// Exercise Three's real upload manager against an in-memory GL buffer. Every
// simulated GPU byte must match the full-upload reference, even across wraps
// and several updates queued before a render.
const tracks = new SkidTrailBuffer();
const geometry = new BufferGeometry();
for (const [name, array, size] of [
  ["position", tracks.positions, 3], ["born", tracks.born, 1],
  ["strength", tracks.strengths, 1], ["ink", tracks.colors, 3],
]) geometry.setAttribute(name, new BufferAttribute(array, size));
let bound, transferred = 0;
const manager = WebGLAttributes({
  FLOAT: 5126,
  createBuffer: () => ({}),
  bindBuffer: (_type, buffer) => { bound = buffer; },
  bufferData: (_type, array) => { bound.array = array.slice(); },
  bufferSubData: (_type, offset, array, start = 0, count = array.length) => {
    bound.array.set(array.subarray(start, start + count), offset / array.BYTES_PER_ELEMENT);
    transferred += count * array.BYTES_PER_ELEMENT;
  },
});
const attributes = Object.values(geometry.attributes);
function flush() {
  for (const attribute of attributes) {
    manager.update(attribute, 34962);
    assert.deepEqual(manager.get(attribute).buffer.array, attribute.array, "GPU trail bytes match the complete CPU buffer");
  }
}
flush();
const fullBytes = attributes.reduce((sum, attribute) => sum + attribute.array.byteLength, 0);
const ink = [0.1, 0.2, 0.3];
let sample = 0;
tracks.stamp(0, 0, 0, 0, 0.2, 0, 1, ink);
function write(count) {
  const first = tracks.cursor, version = tracks.version;
  for (let i = 0; i < count; i++) {
    sample++;
    tracks.stamp(0, sample * 0.1, 0, 0, 0.2, sample / 60, 0.4 + sample % 3 * 0.2, ink);
  }
  queueSkidUpload(geometry, first, tracks.version - version, tracks.capacity);
}
write(1); flush();
assert.equal(transferred, 192, "a scooter mark uploads one slot, not the whole pool");
transferred = 0;
write(2); flush();
assert.equal(transferred, 384, "a pair of cart marks uploads two slots");
write(tracks.capacity - 4); flush(); // cursor at final slot
transferred = 0;
write(2); flush();
assert.equal(transferred, 384, "a wrap uploads both ends without the untouched middle");
write(3); write(7); write(2); flush();
write(tracks.capacity + 5); flush();
transferred = 0;
write(0); flush();
assert.equal(transferred, 0, "stationary frames do not upload unchanged buffers");
geometry.dispose();
console.log(`Verified real Three uploads: identical buffer contents after wrap/deferred renders; ${fullBytes} bytes per full update reduced to 192 (scooter) or 384 (cart), with zero stationary uploads.`);
