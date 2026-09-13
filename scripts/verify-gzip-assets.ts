import assert from "node:assert/strict";
import { constants, createGzip, gzipSync } from "node:zlib";
import { gzipAssetIssue } from "./gzip-asset";

async function main() {
const raw=Buffer.from("portable authored asset payload\n".repeat(200));
const windows=gzipSync(raw,{level:9});windows[9]=10;
const linux=Buffer.from(windows);linux[9]=3;
assert.equal(gzipAssetIssue(windows,raw),null,"Windows gzip OS header is valid");
assert.equal(gzipAssetIssue(linux,raw),null,"Linux gzip OS header is valid");

// A flushed stream is valid level-9 gzip but has different DEFLATE blocks
// from a one-shot encoder, independent of the platform's strategy heuristics.
const encoder=createGzip({level:9});
const chunks:Buffer[]=[];
encoder.on("data",(chunk:Buffer)=>chunks.push(chunk));
const encoded=new Promise<Buffer>((resolve,reject)=>{
  encoder.on("end",()=>resolve(Buffer.concat(chunks)));
  encoder.on("error",reject);
});
const midpoint=raw.length/2;
encoder.write(raw.subarray(0,midpoint));
await new Promise<void>(resolve=>encoder.flush(constants.Z_SYNC_FLUSH,resolve));
encoder.end(raw.subarray(midpoint));
const alternative=await encoded;alternative[9]=3;
assert.equal(alternative.equals(linux),false,"fixture uses a different valid level-9 DEFLATE stream");
assert.equal(gzipAssetIssue(alternative,raw),null,"valid compression choices are portable across zlib builds");

const stale=gzipSync(Buffer.from("different asset"),{level:9});
assert.match(gzipAssetIssue(stale,raw)??"",/stale GLB content/,"valid gzip with stale content is rejected");
const corrupted=Buffer.from(windows);corrupted[corrupted.length-8]^=0xff;
assert.match(gzipAssetIssue(corrupted,raw)??"",/cannot be decoded|CRC/,"corrupted gzip is rejected");
const dated=Buffer.from(windows);dated.writeUInt32LE(1,4);
assert.match(gzipAssetIssue(dated,raw)??"",/modification time/,"non-deterministic timestamp is rejected");
console.log("✓ gzip assets: cross-OS headers, alternative level-9 streams, exact content and corruption checks verified");
}

void main();
