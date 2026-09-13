import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { build } from 'esbuild';

const root=resolve('public/assets/game');
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>UQ asset review</title><style>*{box-sizing:border-box}body{margin:0;background:#e8ede5;color:#352f27;font:14px system-ui}canvas{display:block}header{position:absolute;z-index:1;left:16px;right:16px;top:16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}button,select,output{border:1px solid #c5bcaa;background:#f8f4e8;color:#352f27;border-radius:20px;padding:10px 15px;font:inherit}output{position:absolute;bottom:16px;left:16px}button{cursor:pointer}</style><header><select id="asset" aria-label="Asset"><option value="campus">Assembled campus</option><option value="character">Student rig</option><option value="vehicles:Buggy">Campus buggy</option><option value="vehicles:Ferry">River ferry</option>${['Hull','Services','Rentixe','Game','Health','Qualia','Responsive','Issue'].map(x=>'<option value="exhibits:Exhibit'+x+'">'+x+' exhibit</option>').join('')}</select><select id="pose" aria-label="Animation" hidden></select><button id="court">Great Court</button><button id="bridge">Bridge</button><button id="studios">Studios</button><button id="level">Eye level</button></header><output id="stats" aria-live="off">Loading…</output><script type="module" src="/review.js"></script></html>`;
createServer(async(req,res)=>{
  try{
    const path=new URL(req.url,'http://127.0.0.1').pathname;
    if(path==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
    if(path==='/review.js'){const bundle=await build({entryPoints:['scripts/asset-review.ts'],bundle:true,write:false,format:'esm',target:'es2022'});res.setHeader('Content-Type','text/javascript');res.setHeader('Cache-Control','no-store');res.end(bundle.outputFiles[0].contents);return;}
    if(!path.startsWith('/assets/')){res.writeHead(404);res.end();return;}
    const file=resolve(root,decodeURIComponent(path.slice(8)));
    if(!file.startsWith(root+sep)||extname(file)!=='.glb'){res.writeHead(403);res.end();return;}
    res.setHeader('Content-Type','model/gltf-binary');res.setHeader('Cache-Control','no-store');res.end(await readFile(file));
  }catch{res.writeHead(404);res.end();}
}).listen(3002,'127.0.0.1',()=>console.log('Asset review at http://localhost:3002'));
