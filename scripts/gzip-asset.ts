import { gunzipSync } from "node:zlib";

/** Validate the portable gzip contract without assuming one zlib byte stream. */
export function gzipAssetIssue(compressed: Buffer, expected: Buffer): string | null {
  if(compressed.length<18)return "gzip payload is truncated";
  if(compressed[0]!==0x1f||compressed[1]!==0x8b||compressed[2]!==8)return "gzip magic or compression method is invalid";
  if(compressed[3]!==0)return "gzip optional header fields are not deterministic";
  if(compressed.readUInt32LE(4)!==0)return "gzip modification time must be zero";
  if(compressed[8]!==2)return "gzip must use the level-9 maximum-compression header";
  // Byte 9 is the producer OS and legitimately differs across Node platforms.
  try{
    const expanded=gunzipSync(compressed);
    if(!expanded.equals(expected))return "gzip expands to stale GLB content";
  }catch(error){
    return `gzip cannot be decoded or failed CRC validation: ${error instanceof Error?error.message:String(error)}`;
  }
  return null;
}
