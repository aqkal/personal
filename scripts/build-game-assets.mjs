import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const defaultBlender=String.raw`C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`;
const blender=resolve(process.env.BLENDER_PATH||defaultBlender);
if(!existsSync(blender)){
  console.error(`Blender not found at ${blender}. Set BLENDER_PATH to the Blender executable.`);
  process.exit(1);
}

function run(command,args,label){
  console.log(`\n[assets] ${label}`);
  const result=spawnSync(command,args,{cwd:process.cwd(),stdio:"inherit",shell:false});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}

for(const name of ["vehicles","character","environment","exhibits"]){
  run(blender,["--background","--factory-startup","--python",resolve(`scripts/blender/${name}.py`)],`build ${name}`);
  if(name==="character")run(process.execPath,[resolve("scripts/blender/contact-sheet.mjs")],"compose character clip sheet");
}
run(process.execPath,["--import","tsx",resolve("scripts/blender/shore_rails_layout.ts")],"export shoreline layout");
run(blender,["--background","--factory-startup","--python",resolve("scripts/blender/shore_rails.py")],"build shoreline rails");
run(blender,["--background","--factory-startup","--python",resolve("scripts/blender/verify_character.py")],"validate character import and clips");
run(process.execPath,[resolve("scripts/compress-game-assets.mjs")],"precompress game GLBs");
run(process.execPath,["--import","tsx",resolve("scripts/validate-game-assets.ts")],"validate GLB contracts");
