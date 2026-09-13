import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GzipGLTFLoader, decodeGzipGLTF, isGzipBuffer } from "../src/game3d/gzip-gltf-loader";

const ASSETS = ["campus", "character", "vehicles", "exhibits", "bonus", "shore-rails"] as const;
const exactBuffer = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

async function main() {
  for (const name of ASSETS) {
    const [rawBytes, gzipBytes] = await Promise.all([
      readFile(`public/assets/game/${name}.glb`),
      readFile(`public/assets/game/${name}.glb.gz`),
    ]);
    const raw = exactBuffer(rawBytes);
    const gzip = exactBuffer(gzipBytes);
    assert.equal(isGzipBuffer(raw), false, `${name} raw GLB must not be decompressed twice`);
    assert.equal(isGzipBuffer(gzip), true, `${name} compressed asset needs gzip magic`);
    assert.equal(await decodeGzipGLTF(raw), raw, `${name} raw GLB should retain its original buffer`);
    assert.deepEqual(new Uint8Array(await decodeGzipGLTF(gzip)), new Uint8Array(raw), `${name} gzip bytes must decode exactly`);
    const [rawGLTF, gzipGLTF] = await Promise.all([
      new GzipGLTFLoader().parseAsync(raw, ""),
      new GzipGLTFLoader().parseAsync(gzip, ""),
    ]);
    assert.equal(gzipGLTF.scene.name, rawGLTF.scene.name, `${name} compressed and raw scene roots must match`);
    assert.equal(gzipGLTF.animations.length, rawGLTF.animations.length, `${name} compressed and raw clips must match`);
  }

  await assert.rejects(
    decodeGzipGLTF(Uint8Array.from([0x1f, 0x8b, 0x08, 0x00, 0xff]).buffer),
  );
  await assert.rejects(
    new GzipGLTFLoader().parseAsync(new TextEncoder().encode("not glTF or JSON").buffer, ""),
  );
  const invalidModel = new TextEncoder().encode("not glTF or JSON");
  const invalidGzipStream = new Blob([invalidModel]).stream().pipeThrough(new CompressionStream("gzip"));
  const invalidGzip = await new Response(invalidGzipStream).arrayBuffer();
  await assert.rejects(
    new GzipGLTFLoader().parseAsync(invalidGzip, ""),
  );

  console.log(`✓ gzip GLTF loader verified ${ASSETS.length} compressed assets, raw passthrough, Meshopt parsing and failures`);
}

void main();
