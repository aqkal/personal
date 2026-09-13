import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

const cli = resolve("node_modules/@opennextjs/cloudflare/dist/cli/index.js");
const env = { ...process.env };
if (process.platform === "win32") {
  const preload = "--require=./scripts/windows-junction-fallback.cjs";
  env.NODE_OPTIONS = [env.NODE_OPTIONS, preload].filter(Boolean).join(" ");
}
const result = spawnSync(process.execPath, [cli, "build", ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env,
  stdio: "inherit",
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

// With a nested NEXT_DIST_DIR, OpenNext currently writes the bundled handler
// below that directory prefix while its worker imports it from the function root.
// Normalize only this generated file after a successful Windows build.
if (process.platform === "win32" && env.NEXT_DIST_DIR) {
  const buildRoot = resolve(env.OPEN_NEXT_BUILD_OUTPUT_PATH || ".", ".open-next");
  const functionRoot = resolve(buildRoot, "server-functions", "default");
  const distPrefix = dirname(env.NEXT_DIST_DIR);
  const nestedHandler = resolve(functionRoot, distPrefix, "handler.mjs");
  const expectedHandler = resolve(functionRoot, "handler.mjs");
  const remainsInside = (candidate, parent) => {
    const value = relative(parent, candidate);
    return value === "" || (!value.startsWith(`..${sep}`) && value !== ".." && !isAbsolute(value));
  };
  if (!existsSync(expectedHandler) && existsSync(nestedHandler) && remainsInside(nestedHandler, functionRoot)) {
    copyFileSync(nestedHandler, expectedHandler);
    const nestedMeta = `${nestedHandler}.meta.json`;
    if (existsSync(nestedMeta)) copyFileSync(nestedMeta, `${expectedHandler}.meta.json`);
  }
  if (existsSync(expectedHandler)) {
    let source = readFileSync(expectedHandler, "utf8");
    for (const wasm of ["resvg.wasm", "yoga.wasm"]) {
      const absoluteModulePath = resolve(functionRoot, "node_modules", "next", "dist", "compiled", "@vercel", "og", wasm);
      if (!existsSync(absoluteModulePath)) throw new Error(`OpenNext handler references missing WASM module: ${absoluteModulePath}`);
      const modulePath = absoluteModulePath.replaceAll("\\", "/");
      const brokenImport = new RegExp(`"[A-Z]:/[^\"]+${wasm.replace(".", "\\.")}"`, "g");
      source = source.replace(brokenImport, `"${modulePath}?module"`);
    }
    writeFileSync(expectedHandler, source);
  }
}
