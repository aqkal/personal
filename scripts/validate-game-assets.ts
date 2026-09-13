import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { Box3, Matrix4, Quaternion, Vector3 } from "three";
import { gzipAssetIssue } from "./gzip-asset";

type Gltf = {
  accessors?: Array<{ count:number; min?:number[]; max?:number[] }>;
  animations?: Array<{ name?:string; samplers:Array<{ input:number; output:number }> }>;
  buffers?: Array<{ uri?:string; byteLength:number }>;
  images?: Array<{ uri?:string }>;
  extensionsUsed?: string[]; extensionsRequired?: string[];
  materials?: Array<{ name?:string; pbrMetallicRoughness?:{ baseColorFactor?:number[] } }>;
  meshes?: Array<{ primitives:Array<{ attributes:Record<string,number>; indices?:number; extensions?:Record<string,unknown> }> }>;
  nodes?: Array<{ name?:string; mesh?:number; skin?:number; children?:number[]; matrix?:number[]; translation?:number[]; rotation?:number[]; scale?:number[] }>;
  scene?:number; scenes?:Array<{nodes?:number[]}>;
  skins?: unknown[];
};

const files=["campus.glb","character.glb","vehicles.glb","exhibits.glb","bonus.glb","shore-rails.glb"];
let failed=false;
const failedFiles=new Set<string>();
function fail(file:string,message:string){failed=true;failedFiles.add(file);console.error(`✗ ${file}: ${message}`)}
function jsonChunk(path:string):Gltf{
  const bytes=readFileSync(path);
  if(bytes.toString("ascii",0,4)!=="glTF"||bytes.readUInt32LE(4)!==2)throw new Error("not a GLB 2.0 file");
  if(bytes.readUInt32LE(8)!==bytes.length)throw new Error("declared length does not match file length");
  const length=bytes.readUInt32LE(12),type=bytes.toString("ascii",16,20);
  if(type!=="JSON")throw new Error("first chunk is not JSON");
  return JSON.parse(bytes.subarray(20,20+length).toString("utf8").replace(/\0+$/,"")) as Gltf;
}

function transformedBounds(gltf:Gltf){
  const box=new Box3(),nodes=gltf.nodes??[],accessors=gltf.accessors??[],meshes=gltf.meshes??[];
  const visit=(index:number,parent:Matrix4)=>{const node=nodes[index],local=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(new Vector3(...(node.translation??[0,0,0]) as [number,number,number]),new Quaternion(...(node.rotation??[0,0,0,1]) as [number,number,number,number]),new Vector3(...(node.scale??[1,1,1]) as [number,number,number]));const world=parent.clone().multiply(local);if(node.mesh!==undefined)for(const primitive of meshes[node.mesh]?.primitives??[]){const a=accessors[primitive.attributes.POSITION];if(a?.min&&a.max)for(const x of [a.min[0],a.max[0]])for(const y of [a.min[1],a.max[1]])for(const z of [a.min[2],a.max[2]])box.expandByPoint(new Vector3(x,y,z).applyMatrix4(world))}(node.children??[]).forEach(child=>visit(child,world))};
  for(const root of gltf.scenes?.[gltf.scene??0]?.nodes??[])visit(root,new Matrix4());return box;
}

function validateMetadata(file:string,path:string,gltf:Gltf){
  const metadataPath=path.replace(/\.glb$/,".metadata.json");if(!exists(metadataPath))return;
  const data=JSON.parse(readFileSync(metadataPath,"utf8")) as Record<string,unknown>;
  const walk=(value:unknown,key:string)=>{if(typeof value==="number"&&!Number.isFinite(value))fail(file,`${key} is non-finite`);else if(Array.isArray(value))value.forEach((item,i)=>walk(item,`${key}[${i}]`));else if(value&&typeof value==="object")for(const [name,item] of Object.entries(value))walk(item,`${key}.${name}`)};walk(data,"metadata");
  if(file==="campus.glb"){
    const campus=data.campus as Record<string,unknown>|undefined,layout=data.authoredLayout as {landmarks?:Array<{center?:number[];footprint?:number[]}>}|undefined;
    if(campus?.meshes!==gltf.meshes?.length||campus?.materials!==gltf.materials?.length)fail(file,"metadata mesh/material counts differ from GLB");
    for(const landmark of layout?.landmarks??[])if(landmark.center?.length!==2||landmark.footprint?.length!==2)fail(file,"authored landmark center/footprint must be 2D pairs");
  }
  if(file==="vehicles.glb"&&data.assetBytes!==statSync(path).size)fail(file,"metadata assetBytes differs from GLB");
  if(file==="exhibits.glb"&&data.bytes!==statSync(path).size)fail(file,"metadata bytes differs from GLB");
}

function exists(path:string){try{return statSync(path).isFile()}catch{return false}}

for(const file of files){
  const path=join(process.cwd(),"public","assets","game",file);
  try{
    const gltf=jsonChunk(path), used=new Set(gltf.extensionsUsed??[]), required=new Set(gltf.extensionsRequired??[]);
    for(const uri of [...(gltf.buffers??[]),...(gltf.images??[])].map(x=>x.uri).filter(Boolean))fail(file,`external URI is not allowed: ${uri}`);
    if(used.has("KHR_draco_mesh_compression"))fail(file,"Draco compression is not supported by the site loader");
    for(const primitive of gltf.meshes?.flatMap(x=>x.primitives)??[])for(const extension of Object.keys(primitive.extensions??{}))if(!used.has(extension))fail(file,`${extension} is used but absent from extensionsUsed`);
    for(const extension of used)if(extension.includes("compression")&&!required.has(extension))fail(file,`${extension} must also appear in extensionsRequired`);
    const positions=(gltf.meshes??[]).flatMap(x=>x.primitives).map(x=>gltf.accessors?.[x.attributes.POSITION]).filter(Boolean);
    if(!positions.length)fail(file,"no POSITION accessor found");
    for(const accessor of positions)if(!accessor?.min||!accessor.max||![...accessor.min,...accessor.max].every(Number.isFinite))fail(file,"POSITION bounds are missing or non-finite");
    for(const animation of gltf.animations??[])for(const sampler of animation.samplers){const input=gltf.accessors?.[sampler.input],output=gltf.accessors?.[sampler.output];if(!input||!output||!input.count||!output.count||![...(input.min??[]),...(input.max??[])].every(Number.isFinite))fail(file,`animation ${animation.name??"unnamed"} has invalid accessors`)}
    const names=(gltf.nodes??[]).map(x=>x.name??"");
    if(file==="character.glb"){
      if(!(gltf.skins?.length)&&!names.some(x=>/rig|armature/i.test(x)))fail(file,"character has no rig");
      for(const clip of ["Idle","Jump","Land","Run","Seated","TurnLeft","TurnRight","Walk","Wave"])if(!(gltf.animations??[]).some(x=>x.name===clip))fail(file,`missing ${clip} clip`);
    }
    if(file==="campus.glb"){
      for(const materialName of ["Sandstone","Foliage"]){
        const material=gltf.materials?.find(item=>item.name===materialName),color=material?.pbrMetallicRoughness?.baseColorFactor;
        if(!color||color.length<3||color.slice(0,3).every(channel=>channel>.97))fail(file,`${materialName} must export a non-white baseColorFactor`);
      }
    }
    if(file==="vehicles.glb"){
      for(const root of ["Buggy","Ferry"])if(!names.includes(root))fail(file,`missing ${root} root`);
      if(names.filter(x=>/^BuggyWheel(?:FL|FR|RL|RR)(?:\.|$)/.test(x)).length!==4)fail(file,"expected four named buggy wheels");
      if((gltf.meshes?.length??0)!==6||gltf.materials?.length!==1)fail(file,"expected six meshes and one shared material");
    }
    if(file==="exhibits.glb"){
      for(const root of ["ExhibitHull","ExhibitServices","ExhibitRentixe","ExhibitGame","ExhibitHealth","ExhibitQualia","ExhibitResponsive","ExhibitIssue"])if(!names.includes(root))fail(file,`missing ${root} root`);
      for(const control of ["DeployPacket","FixturePuck","ResourcePacket","ReasoningBallLight","ReasoningBallHeavy"])if(!names.some(x=>x===control||x.startsWith(`${control}.`)))fail(file,`missing ${control} response mesh`);
      if(gltf.materials?.length!==1)fail(file,"expected one shared palette material");
    }
    if(file==="bonus.glb"&&(!names.includes("BonusSnake")||gltf.meshes?.length!==1||gltf.materials?.length!==1))fail(file,"expected isolated BonusSnake root with one mesh and one material");
    if(file==="shore-rails.glb"&&((gltf.meshes?.length??0)!==3||gltf.materials?.length!==3||(gltf.animations?.length??0)!==0))fail(file,"shoreline rails must remain three static material batches");
    const bounds=transformedBounds(gltf);if(bounds.isEmpty()||![...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite))fail(file,"transformed scene bounds are empty or non-finite");
    validateMetadata(file,path,gltf);
    const triangles=(gltf.meshes??[]).flatMap(x=>x.primitives).reduce((sum,p)=>sum+Math.floor((gltf.accessors?.[p.indices??p.attributes.POSITION]?.count??0)/3),0);
    const bytes=readFileSync(path),gzipPath=`${path}.gz`;
    let compressedBytes=0;
    if(!exists(gzipPath))fail(file,"precompressed .glb.gz is missing");
    else {
      const compressed=readFileSync(gzipPath);
      compressedBytes=compressed.length;
      const issue=gzipAssetIssue(compressed,bytes);
      if(issue)fail(file,issue);
    }
    if(file==="shore-rails.glb"&&(triangles>50_000||compressedBytes>160*1024))fail(file,"shoreline geometry exceeds its triangle or compressed transfer budget");
    if(!failedFiles.has(file))console.log(`✓ ${file}: ${(statSync(path).size/1024).toFixed(1)} KiB raw, ${(compressedBytes/1024).toFixed(1)} KiB gzip, ${triangles.toLocaleString()} triangles, ${gltf.materials?.length??0} materials, ${gltf.animations?.length??0} clips`);
  }catch(error){fail(file,error instanceof Error?error.message:String(error))}
}
if(failed)process.exitCode=1;
