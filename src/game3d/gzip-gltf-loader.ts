import type { LoadingManager } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const GZIP_MAGIC_0 = 0x1f;
const GZIP_MAGIC_1 = 0x8b;

export function isGzipBuffer(data: ArrayBuffer): boolean {
  if (data.byteLength < 2) return false;
  const bytes = new Uint8Array(data, 0, 2);
  return bytes[0] === GZIP_MAGIC_0 && bytes[1] === GZIP_MAGIC_1;
}

/** Decode explicit gzip asset content while leaving HTTP-decoded GLBs untouched. */
export async function decodeGzipGLTF(data: ArrayBuffer): Promise<ArrayBuffer> {
  if (!isGzipBuffer(data)) return data;
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot decompress the campus model.");
  }
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(stream).arrayBuffer();
}

/** One loader class gives R3F a shared cache across the game and portrait canvases. */
export class GzipGLTFLoader extends GLTFLoader {
  constructor(manager?: LoadingManager) {
    super(manager);
    this.setMeshoptDecoder(MeshoptDecoder);
  }

  override parse(
    data: ArrayBuffer | string,
    path: string,
    onLoad: (gltf: GLTF) => void,
    onError?: (event: ErrorEvent) => void,
  ): void {
    if (typeof data === "string" || !isGzipBuffer(data)) {
      super.parse(data, path, onLoad, onError);
      return;
    }
    void decodeGzipGLTF(data)
      .then((decoded) => super.parse(decoded, path, onLoad, onError))
      .catch((error: unknown) => {
        if (onError) onError(error as ErrorEvent);
        else console.error(error);
      });
  }
}
