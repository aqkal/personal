import metadata from "../../public/assets/game/campus.metadata.json";

export type AuthoredSolid = { id:string; type:string; center:number[]; baseY:number; height:number; rotation:number; half?:number[]; radius?:number };
/** Exported from the same Blender objects that produce the visible architecture. */
export const AUTHORED_SOLIDS = metadata.authoredLayout.colliders as AuthoredSolid[];
export const AUTHORED_TREES = metadata.authoredLayout.trees;

/** Shared gallery bounds keep its floor, displays, collision and approach aisle aligned. */
export const PROJECT_GALLERY = {
  minX: 15.9,
  maxX: 38.1,
  minZ: 17.9,
  maxZ: 26.1,
  floorY: 0.12,
  approachOffset: 2.2,
} as const;
export const GALLERY_FLOOR_Y = PROJECT_GALLERY.floorY;
export const GALLERY_EXHIBIT_SCALE = 0.76;

/** Exhibit plinths face the shared public aisle inside the open-front gallery. */
export const EXHIBIT_PLACEMENTS = [
  {id:"hull-ship-inspector",node:"ExhibitHull",x:18.6,y:GALLERY_FLOOR_Y,z:23.35,ry:Math.PI},
  {id:"microservices-architecture",node:"ExhibitServices",x:22.8,y:GALLERY_FLOOR_Y,z:23.35,ry:Math.PI},
  {id:"rentixe",node:"ExhibitRentixe",x:27,y:GALLERY_FLOOR_Y,z:23.35,ry:Math.PI},
  {id:"team-game-project",node:"ExhibitGame",x:31.2,y:GALLERY_FLOOR_Y,z:23.35,ry:Math.PI},
  {id:"digital-health-fhir",node:"ExhibitHealth",x:35.4,y:GALLERY_FLOOR_Y,z:23.35,ry:Math.PI},
] as const;
