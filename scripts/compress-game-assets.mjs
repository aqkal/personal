import { readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const directory = join(process.cwd(), "public", "assets", "game");
const available = readdirSync(directory).filter((name) => name.endsWith(".glb")).sort();
const requested = process.argv.slice(2);
for (const name of requested) {
  if (!available.includes(name)) throw new Error(`Unknown game GLB: ${name}`);
}
const assets = requested.length ? available.filter((name) => requested.includes(name)) : available;

if (!assets.length) {
  console.error("No game GLBs found to compress.");
  process.exit(1);
}

for (const name of assets) {
  const source = join(directory, name);
  const destination = `${source}.gz`;
  const temporary = `${destination}.tmp`;
  const raw = readFileSync(source);
  const compressed = gzipSync(raw, { level: 9, mtime: 0 });
  writeFileSync(temporary, compressed);
  renameSync(temporary, destination);
  console.log(`✓ ${name}.gz: ${(compressed.length / 1024).toFixed(1)} KiB from ${(raw.length / 1024).toFixed(1)} KiB`);
}
