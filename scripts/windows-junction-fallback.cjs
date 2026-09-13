"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

// OpenNext copies traced package-directory links. Creating directory symlinks
// requires an elevated Windows token, while an equivalent junction does not.
if (process.platform === "win32") {
  const fs = require("node:fs");
  const path = require("node:path");
  const { syncBuiltinESMExports } = require("node:module");
  const originalSymlinkSync = fs.symlinkSync;
  const originalCopyFileSync = fs.copyFileSync;
  const workspace = path.resolve(process.cwd());
  const sourceRoot = path.join(workspace, "node_modules");

  const inside = (candidate, parent) => {
    const relative = path.relative(parent, candidate);
    return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
  };
  const configuredBuildRoot = path.resolve(workspace, process.env.OPEN_NEXT_BUILD_OUTPUT_PATH || ".");
  const outputRoot = inside(configuredBuildRoot, workspace)
    ? path.join(configuredBuildRoot, ".open-next")
    : path.join(workspace, ".open-next-output-outside-workspace-is-not-authorized");

  fs.symlinkSync = function safeSymlinkSync(target, destination, type) {
    try {
      return originalSymlinkSync(target, destination, type);
    } catch (error) {
      if (!error || error.code !== "EPERM") throw error;
      const absoluteDestination = path.resolve(destination);
      const absoluteTarget = path.resolve(path.dirname(absoluteDestination), target);
      const targetIsPackageDirectory = inside(absoluteTarget, sourceRoot) && fs.statSync(absoluteTarget).isDirectory();
      const destinationIsBuildPackage = inside(absoluteDestination, outputRoot) && absoluteDestination.split(path.sep).includes("node_modules");
      if (!targetIsPackageDirectory || !destinationIsBuildPackage) throw error;
      return originalSymlinkSync(absoluteTarget, absoluteDestination, "junction");
    }
  };
  fs.copyFileSync = function safeCopyFileSync(source, destination, mode) {
    try {
      return originalCopyFileSync(source, destination, mode);
    } catch (error) {
      if (!error || !["EISDIR", "EPERM", "EACCES"].includes(error.code)) throw error;
      const absoluteSource = path.resolve(source);
      const absoluteDestination = path.resolve(destination);
      const sourceIsPackageDirectory = inside(absoluteSource, sourceRoot) && fs.statSync(absoluteSource).isDirectory();
      const destinationIsBuildPackage = inside(absoluteDestination, outputRoot) && absoluteDestination.split(path.sep).includes("node_modules");
      if (!sourceIsPackageDirectory || !destinationIsBuildPackage) throw error;
      return originalSymlinkSync(absoluteSource, absoluteDestination, "junction");
    }
  };
  syncBuiltinESMExports();
}
