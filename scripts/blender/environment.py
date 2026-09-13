"""Build the authored UQ campus and vehicle GLBs.

Run with Blender 5.2:
  blender --background --python scripts/blender/environment.py

The scene is deliberately assembled from original low-poly primitives. Source
objects remain organised in collections in campus.blend; campus export objects
are batched by material to keep runtime draw calls bounded.
"""

from __future__ import annotations

import json
import hashlib
import gzip
import math
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Vector, Matrix
sys.path.insert(0, str(Path(__file__).resolve().parent))
import studios


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets-source"
PUBLIC = ROOT / "public" / "assets" / "game"
SOURCE.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)

COLORS = {
    "Sandstone": (0.64, 0.46, 0.27, 1),
    "SandstoneCream": (0.76, 0.62, 0.43, 1),
    "SandstoneViolet": (0.49, 0.38, 0.39, 1),
    "Concrete": (0.72, 0.69, 0.61, 1),
    "Metal": (0.28, 0.31, 0.30, 1),
    "Foliage": (0.22, 0.39, 0.24, 1),
    "Jacaranda": (0.43, 0.28, 0.58, 1),
    "Bronze": (0.45, 0.28, 0.08, 1),
    "Dark": (0.075, 0.068, 0.058, 1),
    "RiverBlue": (0.12, 0.32, 0.36, 1),
}


def reset():
    bpy.context.preferences.filepaths.file_preview_type = "NONE"
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in bpy.data.materials:
        bpy.data.materials.remove(block)


def material(name):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = COLORS[name]
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = COLORS[name]
    bsdf.inputs["Roughness"].default_value = 0.74 if name not in {"Metal", "Bronze"} else 0.48
    bsdf.inputs["Metallic"].default_value = 0.75 if name in {"Metal", "Bronze"} else 0.0
    return mat


def collection(name):
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    return c


def move_to(obj, coll):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    coll.objects.link(obj)


def gpos(loc):
    """Game/Three (x, y-up, z) to Blender (x, -z, z-up)."""
    return (loc[0], -loc[2], loc[1])


def finish(obj, name, mat, coll, bevel=0.08):
    obj.name = name
    obj.data.materials.append(MATS[mat])
    move_to(obj, coll)
    # Apply authored dimensions before beveling so edge radii are in metres.
    obj.data.transform(Matrix.Diagonal((*obj.scale,1.0)))
    obj.scale=(1,1,1)
    if bevel > .025:
        bm=bmesh.new(); bm.from_mesh(obj.data)
        bmesh.ops.bevel(bm,geom=list(bm.edges),offset=bevel,segments=1,affect='EDGES',clamp_overlap=True)
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
        bm.to_mesh(obj.data);bm.free()
    return obj


COLLIDERS=[]
SOLID_BOX_NAMES={"CourtSouth","CourtWest","CourtEast","CourtNorthWest","CourtNorthEast","ForganGatePier","ForganSmithTower","DuhigPlinth","DuhigStack","RiverCafe","CafeGlass","WritingPavilionCore","WritingPavilionRoof","WritingSideGlass","EngineeringCore","EngineeringGlassBay","EngineeringRoof","EngineeringCanopy","StudioQualiaPlinth","StudioQualiaBody","StudioQualiaGlass","StudioQualiaDoor","StudioQualiaFrontMullion","StudioQualiaUpperSlab","StudioQualiaVeranda","StudioDSRPlinth","StudioDSRBody","StudioDSRFrontGlass","StudioDSRDoor","StudioDSRDoorJamb","StudioBucklerLab","StudioBucklerGlass","StudioBucklerDoor","StudioBucklerCourtyardCanopy","AmphitheatreSeat","AmphitheatreStage","FountainBasin"}
SOLID_SUFFIXES=("Pier","BenchSeat","BenchBack","ChairSeat","ChairBack","Table","PergolaPost","VerandaPost","CanopyPost","ScaffoldUpright","CraneMast")

def box(name, loc, size, mat, coll, rot=0, bevel=0.08):
    if name in SOLID_BOX_NAMES or name.endswith(SOLID_SUFFIXES) or name.startswith(("BenchSeat","BenchBack","WritingBench")):
        COLLIDERS.append({"id":name+"-"+str(len(COLLIDERS)),"type":"box","center":[loc[0],loc[2]],"baseY":round(loc[1]-size[1]/2,4),"height":size[1],"half":[size[0]/2,size[2]/2],"rotation":rot})
    hx,hy,hz=size[0]/2,size[1]/2,size[2]/2
    verts=[gpos((x,y,z)) for x,y,z in [(-hx,-hy,-hz),(hx,-hy,-hz),(hx,-hy,hz),(-hx,-hy,hz),(-hx,hy,-hz),(hx,hy,-hz),(hx,hy,hz),(-hx,hy,hz)]]
    mesh=bpy.data.meshes.new(name+"Mesh")
    mesh.from_pydata(verts,[],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)])
    o=bpy.data.objects.new(name,mesh);coll.objects.link(o)
    o.location=gpos(loc);o.rotation_euler[2]=rot
    return finish(o, name, mat, coll, bevel)


def cyl(name, loc, radius, depth, mat, coll, vertices=10, rot=(0, 0, 0), bevel=0.04):
    if name in ("TreeTrunk","LampPost","CafeColumn","WritingColumn","EngineeringColumn","BridgePier","BridgePylon","FountainStem","FountainBasin") or name.endswith(SOLID_SUFFIXES):
        COLLIDERS.append({"id":name+"-"+str(len(COLLIDERS)),"type":"cylinder","center":[loc[0],loc[2]],"baseY":round(loc[1]-depth/2,4),"height":depth,"radius":radius,"rotation":0})
    bm=bmesh.new();bmesh.ops.create_cone(bm,cap_ends=True,cap_tris=False,segments=vertices,radius1=radius,radius2=radius,depth=depth)
    mesh=bpy.data.meshes.new(name+"Mesh");bm.to_mesh(mesh);bm.free()
    o=bpy.data.objects.new(name,mesh);coll.objects.link(o);o.location=gpos(loc);o.rotation_euler=rot
    return finish(o, name, mat, coll, bevel)


def cable_between(name, start, end, radius, mat, coll):
    a,b=Vector(gpos(start)),Vector(gpos(end)); delta=b-a
    mid=(a+b)/2
    o=cyl(name,(mid.x,mid.z,-mid.y),radius,delta.length,mat,coll,vertices=6,bevel=0)
    o.rotation_mode="QUATERNION"
    o.rotation_quaternion=Vector((0,0,1)).rotation_difference(delta.normalized())
    return o


def sphere(name, loc, scale, mat, coll, subdivisions=1):
    bm=bmesh.new();bmesh.ops.create_icosphere(bm,subdivisions=subdivisions,radius=1)
    mesh=bpy.data.meshes.new(name+"Mesh");bm.to_mesh(mesh);bm.free()
    o=bpy.data.objects.new(name,mesh);coll.objects.link(o);o.location=gpos(loc)
    o.scale = (scale[0], scale[2], scale[1])
    return finish(o, name, mat, coll, 0.04)


def torus(name, loc, major, minor, mat, coll, scale=(1,1,1), vertices=32):
    bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=vertices,minor_segments=6,location=gpos(loc))
    o=bpy.context.object; o.scale=(scale[0],scale[2],scale[1])
    return finish(o,name,mat,coll,0)


def wedge(name, loc, size, mat, coll, rot=0):
    x, y, z = size
    game_verts=[(-x/2,-y/2,-z/2),(x/2,-y/2,-z/2),(x/2,-y/2,z/2),(-x/2,-y/2,z/2),
                (-x*.38,y/2,-z/2),(x*.38,y/2,-z/2),(x*.38,y/2,z/2),(-x*.38,y/2,z/2)]
    verts=[gpos(v) for v in game_verts]
    faces = [(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(4,0,3,7)]
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(verts, [], faces)
    o = bpy.data.objects.new(name, mesh)
    coll.objects.link(o)
    o.location = gpos(loc)
    o.rotation_euler[2] = rot
    return finish(o, name, mat, coll, 0.06)


def old_arch_bay(prefix, x, z, rot, coll, scale=1.0):
    # Open passage, continuous voussoir ring and load-bearing columns.
    for dx in (-1.16, 1.16):
        ox, oz = math.cos(rot)*dx*scale, -math.sin(rot)*dx*scale
        box(prefix+"Pier", (x+ox, 1.12*scale, z+oz), (.42*scale, 2.24*scale, .72*scale), "Sandstone", coll, rot)
    arch_ring(prefix+"Arch", (x, 2.18*scale, z), 1.15*scale, .30*scale, .74*scale, "SandstoneCream", coll, rot)


def arch_ring(name, loc, radius, band, depth, mat, coll, rot=0, segments=10):
    verts=[]; faces=[]
    # Upper semicircle in the local facade plane, extruded through its depth.
    for side in (-depth/2, depth/2):
        for r in (radius-band, radius+band):
            for i in range(segments+1):
                a=i*math.pi/segments
                gx=math.cos(a)*r; gy=math.sin(a)*r
                verts.append(gpos((gx,gy,side)))
    row=segments+1
    for layer in (0,2*row):
        for i in range(segments):
            a=layer+i; b=layer+row+i
            faces.append((a,a+1,b+1,b))
    for ring in (0,row):
        for i in range(segments):
            a=ring+i; b=2*row+ring+i
            faces.append((a,b,b+1,a+1))
    faces.extend([(0,row,3*row,2*row),(row-1,3*row-1,4*row-1,2*row-1)])
    mesh=bpy.data.meshes.new(name+"Mesh"); mesh.from_pydata(verts,[],faces)
    bm=bmesh.new(); bm.from_mesh(mesh); bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces)); bm.to_mesh(mesh); bm.free()
    o=bpy.data.objects.new(name,mesh); coll.objects.link(o); o.location=gpos(loc); o.rotation_euler[2]=rot
    return finish(o,name,mat,coll,.025)


def local_point(x,z,dx,dz,rot=0):
    return x+math.cos(rot)*dx+math.sin(rot)*dz, z-math.sin(rot)*dx+math.cos(rot)*dz


def facade(prefix,x,z,width,depth,height,rot,coll,caps=True):
    # Layered masonry window surrounds on both elevations, continuous sill courses.
    for side in (-1,1):
        def put(name,dx,y,dz,size,mat):
            px,pz=local_point(x,z,dx,side*dz,rot)
            return box(prefix+name,(px,y,pz),size,mat,coll,rot,bevel=.015)
        for y in (.55,3.45,height-.32):
            put("StringCourse",0,y,depth/2+.06,(width+.12,.17,.20),"SandstoneCream")
        count=max(3,round(width/2.6))
        for i in range(count):
            dx=(i-(count-1)/2)*width/count
            for y in (1.95,5.05):
                if y+1.1>height: continue
                put("WindowRecess",dx,y,depth/2+.015,(1.42,1.95,.05),"Dark")
                put("WindowGlass",dx,y,depth/2+.06,(1.10,1.65,.05),"RiverBlue")
                for off in (-.73,.73): put("WindowJamb",dx+off,y,depth/2+.12,(.18,2.13,.24),"SandstoneCream")
                put("WindowLintel",dx,y+1.02,depth/2+.15,(1.65,.19,.30),"SandstoneViolet")
                put("WindowSill",dx,y-1,depth/2+.19,(1.72,.18,.40),"SandstoneCream")
                put("WindowMullion",dx,y,depth/2+.11,(.08,1.72,.10),"SandstoneCream")
            if i<count-1:
                put("Pilaster",dx+width/count/2,height/2,depth/2+.08,(.25,height-.65,.22),"SandstoneCream")
                for row in range(4):
                    put("StoneInset",dx+width/count/2,.95+row*1.5,depth/2+.21,(.31,.31,.08),"SandstoneViolet" if (i+row)%3==0 else "Sandstone")
    if not caps: return
    box(prefix+"Cornice",(x,height+.02,z),(width+.4,.30,depth+.4),"SandstoneCream",coll,rot,bevel=.045)
    box(prefix+"Roof",(x,height+.24,z),(width-.3,.15,depth-.3),"SandstoneViolet",coll,rot,bevel=.025)


def arch_bay(prefix,x,z,rot,coll,span=4.2):
    spring=2.25; pier=.56; radius=(span-pier)/2; band=.25; top=4.62
    for dx in (-span/2,span/2):
        px,pz=local_point(x,z,dx,0,rot)
        box(prefix+"Pier",(px,spring/2,pz),(pier,spring,1.00),"Sandstone",coll,rot,bevel=.025)
        box(prefix+"PierBase",(px,.15,pz),(.73,.3,1.14),"SandstoneViolet",coll,rot,bevel=.02)
        box(prefix+"Capital",(px,spring-.05,pz),(.76,.22,1.12),"SandstoneCream",coll,rot,bevel=.025)
    arch_ring(prefix+"Arch",(x,spring,z),radius,band,.98,"SandstoneCream",coll,rot,segments=10)
    # Curved spandrels fill the space from arch extrados to cornice.
    verts=[]; faces=[]; n=10
    for side in (-.47,.47):
        for i in range(n+1):
            dx=-span/2+span*i/n
            lower=spring+math.sqrt(max(0,(radius+band)**2-dx*dx))
            verts.extend([gpos((dx,lower,side)),gpos((dx,top,side))])
    row=2*(n+1)
    for i in range(n):
        a=2*i
        faces.extend([(a,a+2,a+3,a+1),(row+a+1,row+a+3,row+a+2,row+a),(a,row+a,row+a+2,a+2),(a+1,a+3,row+a+3,row+a+1)])
    faces.extend([(0,1,row+1,row),(2*n,row+2*n,row+2*n+1,2*n+1)])
    mesh=bpy.data.meshes.new(prefix+"SpandrelMesh"); mesh.from_pydata(verts,[],faces)
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    o=bpy.data.objects.new(prefix+"Spandrel",mesh);coll.objects.link(o);o.location=gpos((x,0,z));o.rotation_euler[2]=rot
    finish(o,prefix+"Spandrel","SandstoneViolet",coll,0)
    for j in range(10):
        dx=-span/2+span*(j+.5)/10
        edge=max(0,abs(dx)-span/20)
        lower=spring+math.sqrt(max(0,(radius-band)**2-edge*edge))
        px,pz=local_point(x,z,dx,0,rot)
        COLLIDERS.append({"id":prefix+"ArchOverhead-"+str(j),"type":"box","center":[px,pz],"baseY":round(lower,4),"height":round(4.78-lower,4),"half":[span/20,.5],"rotation":rot})
    box(prefix+"Cornice",(x,4.68,z),(span+.12,.23,1.18),"SandstoneCream",coll,rot,bevel=.02)
    box(prefix+"Canopy",(x,4.87,z),(span+.36,.18,2.9),"SandstoneCream",coll,rot,bevel=.02)
    box(prefix+"Walkway",(x,.06,z),(span+.30,.12,2.8),"Concrete",coll,rot,bevel=0)


def great_court(coll):
    for name,x,z,w,d,h,rot in (("CourtSouth",-36,-61,18,7,7.6,0),("CourtWest",-60,-52,14,7.4,7.2,.65),("CourtEast",-12,-52,14,7.4,7.2,-.65),("CourtNorthWest",-50.7,-23,23.8,6.6,8.2,0),("CourtNorthEast",-21.3,-23,23.8,6.6,8.2,0)):
        box(name,(x,h/2,z),(w,h,d),"Sandstone",coll,rot,bevel=.07)
        facade(name,x,z,w,d,h,rot,coll)
        facade(name+"End",x,z,d,w,h,rot+math.pi/2,coll,caps=False)
    # Split lower tower leaves a genuine 2.8 m-wide gate through the building.
    for x in (-38.35,-33.65):
        box("ForganGatePier",(x,2.2,-23),(1.9,4.4,6.6),"Sandstone",coll,bevel=.05)
    box("ForganSmithTower",(-36,10.95,-23),(6.6,13.1,6.6),"Sandstone",coll,bevel=.06)
    for y,size in ((17.65,6.2),(18.2,5.6),(18.75,4.9)):
        box("TowerSteppedCrown",(-36,y,-23),(size,.55,size),"SandstoneCream",coll,bevel=.035)
    for rot in (0,math.pi/2,math.pi,3*math.pi/2):
        for dx in (-2.55,2.55):
            px,pz=local_point(-36,-23,dx,3.35,rot)
            box("TowerPilaster",(px,10.5,pz),(.35,13,.3),"SandstoneCream",coll,rot,bevel=.02)
        for dx in (-1.3,0,1.3):
            for y in (8.0,10.7,13.4,16.1):
                px,pz=local_point(-36,-23,dx,3.33,rot)
                box("TowerSlit",(px,y,pz),(.43,1.65,.10),"Dark",coll,rot,bevel=.01)
        px,pz=local_point(-36,-23,0,3.35,rot)
        box("TowerFrieze",(px,5.75,pz),(4.9,.95,.18),"SandstoneViolet",coll,rot,bevel=.02)
        for dx in (-1.55,0,1.55):
            px,pz=local_point(-36,-23,dx,3.49,rot)
            wedge("TowerShield",(px,5.75,pz),(.55,.7,.15),"SandstoneCream",coll,rot)
    points=[(-36+math.cos(math.pi+i*math.pi/20)*26,-26+math.sin(math.pi+i*math.pi/20)*29) for i in range(21)]
    for i,((x0,z0),(x1,z1)) in enumerate(zip(points,points[1:])):
        arch_bay(f"Cloister{i:02d}",(x0+x1)/2,(z0+z1)/2,math.atan2(-(z1-z0),x1-x0),coll,math.hypot(x1-x0,z1-z0))

def duhig_and_lake(coll):
    # Duhig library uses the existing (-60,-10) footprint.
    box("DuhigPlinth", (-60, 1.1, -10), (11, 2.2, 8), "Concrete", coll, bevel=.16)
    box("DuhigStack", (-60, 7.7, -10), (9.6, 11.2, 7.0), "Sandstone", coll, bevel=.22)
    box("DuhigEntry", (-60,1.65,-5.94), (2.8,2.8,.18), "Dark", coll, bevel=.025)
    for y in (4.1, 7.0, 9.9, 12.8):
        box("DuhigShade", (-60, y, -6.42), (8.0, .28, .22), "Bronze", coll, bevel=.02)
        box("DuhigGlass", (-60, y-.65, -6.5), (7.8, 1.0, .16), "Dark", coll, bevel=.01)
    for x in (-63.9,-62,-60,-58,-56.1):
        box("DuhigFin",(x,7.7,-6.34),(.18,10.7,.55),"SandstoneViolet",coll,bevel=.025)
    box("DuhigCrown",(-60,13.6,-10),(7.6,.55,5.8),"Bronze",coll,bevel=.08)
    for side in (-1,1):
        for y in (3.4,6.3,9.2,12.1):
            for pz in (-12,-10,-8):
                box("DuhigSideGlass",(-60+side*4.83,y,pz),(.10,1.15,1.5),"RiverBlue",coll,bevel=.01)
                box("DuhigSideShade",(-60+side*4.93,y+.65,pz),(.40,.16,1.75),"SandstoneCream",coll,bevel=.01)
            box("DuhigRearGlass",(-60,y,-13.54),(7.7,1.15,.10),"RiverBlue",coll,bevel=.01)
    # Amphitheatre south of the lake: concentric low seating arcs approximated by stepped chords.
    for row in range(4):
        z = -44 + row*1.15
        width = 17 - row*2.0
        box("AmphitheatreSeat", (3, .22+row*.13, z), (width, .34, .76), "Concrete", coll, bevel=.12)
    box("AmphitheatreStage", (3, .14, -49.1), (9.5, .28, 3.3), "Sandstone", coll, bevel=.18)
    # UQ Lakes edge kit: elliptical stone bank, waterside boardwalk and restrained reeds.
    torus("LakeBank",(3,.10,-63),1,.10,"SandstoneCream",coll,scale=(10,1,7.5),vertices=48)
    box("LakeBoardwalk",(3,.16,-53.8),(13,.32,1.8),"Concrete",coll,bevel=.10)
    for i in range(18):
        a=(i/18)*math.pi*2; x=3+math.cos(a)*9.3; z=-63+math.sin(a)*6.8
        cyl("LakeReed",(x,.55,z),.035,1.1,"Foliage",coll,vertices=6,bevel=0)

    # One authored fountain owns all stonework. Runtime supplies only water.
    # Closed radial sections leave actual recessed interiors, not torus rims
    # resting on solid discs. Dimensions match welcome-plaza.tsx water levels.
    def fountain_section(name, profile, mat, segments=64):
        verts=[gpos((radius*math.cos(i*math.tau/segments),y,radius*math.sin(i*math.tau/segments)))
               for radius,y in profile for i in range(segments)]
        faces=[]
        for row in range(len(profile)):
            next_row=(row+1)%len(profile)
            for i in range(segments):
                j=(i+1)%segments
                faces.append((row*segments+i,row*segments+j,next_row*segments+j,next_row*segments+i))
        mesh=bpy.data.meshes.new(name+"Mesh"); mesh.from_pydata(verts,[],faces)
        bm=bmesh.new(); bm.from_mesh(mesh); bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces)); bm.to_mesh(mesh); bm.free()
        obj=bpy.data.objects.new(name,mesh); coll.objects.link(obj)
        return finish(obj,name,mat,coll,0)

    fountain_section("FountainBasin",[
        (2.62,.06),(3.02,.06),(3.02,.16),(2.94,.20),
        (2.94,.42),(3.00,.44),(3.00,.53),(2.58,.53),
        (2.58,.43),(2.65,.39),(2.65,.18),(2.62,.18),
    ],"SandstoneCream")
    COLLIDERS.append({"id":"FountainBasin-"+str(len(COLLIDERS)),"type":"cylinder","center":[0,0],"baseY":.06,"height":.47,"radius":3.02,"rotation":0})
    cyl("FountainFloor",(0,.13,0),2.65,.10,"RiverBlue",coll,vertices=64,bevel=0)
    cyl("FountainPedestalFoot",(0,.24,0),.51,.16,"SandstoneCream",coll,vertices=32,bevel=.025)
    cyl("FountainStem",(0,.65,0),.24,.74,"SandstoneCream",coll,vertices=32,bevel=.025)
    fountain_section("FountainUpperBowl",[
        (.20,.93),(.34,.93),(.40,1.07),(.78,1.21),
        (.96,1.28),(.96,1.44),(.83,1.44),(.83,1.35),
        (.67,1.28),(.26,1.17),(.20,1.17),
    ],"SandstoneCream",48)
    cyl("FountainUpperFloor",(0,1.185,0),.27,.05,"RiverBlue",coll,vertices=32,bevel=0)
    cyl("FountainNozzle",(0,1.33,0),.055,.30,"Bronze",coll,vertices=12,bevel=0)


def riverside_and_bridge(coll):
    # Cafe remains in the existing (-35,4) footprint; dock projects toward south reach at z 41.
    box("RiverCafe", (-35,2.3,1), (13.5,4.6,5.5), "Sandstone", coll, bevel=.2)
    box("CafeGlass", (-35,2.45,3.82), (9.2,2.55,.18), "RiverBlue", coll, bevel=.02)
    for x in (-39.8,-36.6,-33.4,-30.2):
        cyl("CafeColumn",(x,2.35,3.55),.13,4.7,"Concrete",coll,vertices=10)
    box("CafeCanopy", (-35,4.85,2.2), (13.0,.3,3.0), "Bronze", coll, bevel=.08)
    for x in (-39.6,-38.0,-36.4,-34.8,-33.2,-31.6,-30.0):
        box("CafeGlazingMullion",(x,2.45,3.94),(.11,2.7,.17),"SandstoneCream",coll,bevel=0)
    box("CafeGlazingTransom",(-35,2.8,3.95),(9.3,.11,.18),"SandstoneCream",coll,bevel=0)
    for y in (.65,1.0,1.35,4.1):
        box("CafeCladdingCourse",(-35,y,3.79),(13.2,.07,.12),"SandstoneViolet",coll,bevel=0)
    for zside in (-.9,1.0,2.7):
        box("CafeSideWindow",(-28.21,2.5,zside),(.1,1.8,1.25),"RiverBlue",coll,bevel=.01)
    for x in (-40.5,-29.5):
        for zp in (-4.8,-1.6):
            box("CafePergolaPost",(x,1.7,zp),(.18,3.4,.18),"Bronze",coll,bevel=.01)
    for zp in (-4.8,-1.6):
        box("CafePergolaBearer",(-35,3.32,zp),(11.3,.22,.20),"Bronze",coll,bevel=.01)
    for px in range(-40,-29):
        box("CafePergolaRafter",(px,3.49,-3.2),(.12,.16,3.8),"SandstoneCream",coll,bevel=0)
    for x in (-39,-35,-31):
        cyl("CafeTable",(x,.82,-3.0),.62,.10,"SandstoneCream",coll,vertices=16)
        cyl("CafeTableLeg",(x,.4,-3.0),.10,.8,"Bronze",coll,vertices=8)
        for dx in (-.95,.95):
            box("CafeChairSeat",(x+dx,.45,-3),(.55,.12,.55),"Bronze",coll,bevel=.025)
            box("CafeChairBack",(x+dx,.83,-3.25),(.55,.70,.1),"Bronze",coll,bevel=.025)
            for dz in (-.2,.2): box("CafeChairLeg",(x+dx,.22,-3+dz),(.45,.44,.08),"Metal",coll,bevel=0)
    box("WritingPavilionRoof", (35,4.8,4), (13.2,.36,11.2), "Bronze", coll, bevel=.12)
    box("WritingPavilionCore", (35,2.35,4), (5.2,4.7,6.2), "Sandstone", coll, bevel=.16)
    for x in (29.2,32.0,38.0,40.8):
        cyl("WritingColumn", (x,2.35,4), .16,4.7,"Concrete",coll,vertices=10)
    for x in (30.4,32.0,38.0,39.6):
        box("WritingScreen",(x,2.45,.82),(1.1,3.5,.16),"Dark",coll,bevel=.025)
    for x in (30.5,39.5):
        box("WritingBench",(x,.68,7.7),(2.4,.18,.7),"Bronze",coll,bevel=.05)
    for side in (-1,1):
        for pz in (2.2,4,5.8):
            box("WritingSideGlass",(35+side*2.63,2.45,pz),(.10,2.5,1.1),"RiverBlue",coll,bevel=.01)
        for pz in (1,7):
            box("WritingRoofSupport",(35+side*5.5,2.4,pz),(.19,4.8,.19),"Bronze",coll,bevel=.01)
    for px in (30.2,39.8):
        box("WritingReadingTable",(px,.85,4),(1.8,.13,1.15),"SandstoneCream",coll,bevel=.04)
        for dx in (-.6,.6): box("WritingTableLeg",(px+dx,.42,4),(.13,.84,.75),"Bronze",coll,bevel=.01)
    box("CampusJetty", (-14,.18,43.25), (3.2,.36,6.5), "Concrete", coll, bevel=.12)
    box("CampusPontoon", (-14,.18,46.5), (7.0,.36,2.4), "Concrete", coll, bevel=.12)
    for x,z in ((-16.8,46.5),(-11.2,46.5),(-15.2,41.0),(-12.8,41.0)):
        cyl("DockPile", (x,-.65,z), .18,2.0,"Bronze",coll,vertices=8)
    box("LookoutJetty", (-9.5,.18,84), (7.0,.36,2.2), "Concrete", coll, bevel=.12)
    box("LookoutPontoon", (-13,.18,84), (2.4,.36,6.0), "Concrete", coll, bevel=.12)
    # Raised bridge follows BRIDGE z 32..80, width 4.35 and top profile 0.185 -> 4.8.
    def deck_height(z):
        def smooth(t): return t*t*(3-2*t)
        if z < 46: return .185 + (4.8-.185)*smooth(max(0,min(1,(z-32)/14)))
        if z <= 65: return 4.8
        return 4.8 + (.185-4.8)*smooth(max(0,min(1,(z-65)/15)))
    steps = 24
    for i in range(steps):
        z0 = 32 + i*48/steps; z1 = 32 + (i+1)*48/steps
        y0, y1 = deck_height(z0), deck_height(z1)
        z=(z0+z1)/2; y=(y0+y1)/2-.16
        angle=-math.atan2(y1-y0,z1-z0)
        box("BridgeDeck", (0,y,z), (4.35,.32,math.hypot(z1-z0,y1-y0)+.04), "Concrete", coll, rot=0, bevel=.06).rotation_euler[0]=angle
        for x in (-2.08,2.08):
            rail=box("BridgeHandrail", (x,y+.72,z), (.11,.12,math.hypot(z1-z0,y1-y0)+.08), "Bronze", coll, bevel=.025)
            rail.rotation_euler[0]=angle
            cyl("BridgeRailPost",(x,y+.34,z),.045,.68,"Bronze",coll,vertices=8)
    for z in (36,46,66,77):
        y=deck_height(z)
        for x in (-2.55,2.55):
            cyl("BridgePier", (x,(y-.2)/2,z), .25,max(.5,y-.2),"Concrete",coll,vertices=10)
    # Twin cable-stay pylons frame the shipping channel without intruding into it.
    for z in (47,64):
        for x in (-2.36,2.36):
            box("BridgePylonBracket",(x*.95,4.65,z),(.65,.30,.65),"Concrete",coll,bevel=.03)
            cyl("BridgePylon", (x,7.3,z), .24,5.0,"Concrete",coll,vertices=10)
            for dz in (-8,-4,4,8):
                cable_between("BridgeStay",(x,9.6,z),(x,deck_height(z+dz)+.82,z+dz),.035,"Bronze",coll)


def tree_and_furniture(coll):
    trees=[(-67,-40,1),( -55,-33,0),(-45,-12,1),(-28,-10,0),(-8,-34,1),(10,-30,0),
           (16,-4,0),(39,-4,1),(-18,12,1),(-47,17,0),(8,20,0),(38,36,0),(-22,34,1),
           (-47,29,0),(15,39,1),(-14,-69,0),(18,-70,1),(-65,4,0)]
    for i,(x,z,jac) in enumerate(trees):
        cyl("TreeTrunk",(x,2.15,z),.34,4.3,"Bronze",coll,vertices=8)
        mat="Jacaranda" if jac else "Foliage"
        cable_between("TreeBranch",(x,3.1,z),(x-1.15,4.65,z+.35),.16,"Bronze",coll)
        cable_between("TreeBranch",(x,3.25,z),(x+1.1,4.8,z-.3),.15,"Bronze",coll)
        sphere("TreeCrown",(x,5.8,z),(2.65,1.7,2.35),mat,coll)
        sphere("TreeCrown",(x-1.55,5.25,z+.45),(1.9,1.35,1.75),mat,coll)
        sphere("TreeCrown",(x+1.45,5.35,z-.4),(1.85,1.3,1.65),mat,coll)
        sphere("TreeCrown",(x,6.75,z+.2),(1.65,1.1,1.55),mat,coll)
    for i,(x,z,ry) in enumerate([(-29,11,0),(-24,10.5,.6),(-50,-42,0),(-20,-44,0),(-63,-4,.4),(7,-48,0)]):
        box("BenchSeat",(x,.55,z),(2.4,.15,.65),"Bronze",coll,rot=ry,bevel=.05)
        bx,bz=local_point(x,z,0,.28,ry)
        box("BenchBack",(bx,1.0,bz),(2.4,.8,.14),"Bronze",coll,rot=ry,bevel=.04)
        for dx in (-.85,.85):
            bx,bz=local_point(x,z,dx,0,ry)
            box("BenchLeg",(bx,.25,bz),(.16,.5,.45),"Metal",coll,rot=ry,bevel=.015)
    for x,z in [(-8,12),(10,8),(14,-11),(-7,-11),(-46,8),(4,35)]:
        cyl("LampPost",(x,2.1,z),.09,4.2,"Metal",coll,vertices=8)
        sphere("Lamp",(x,4.25,z),(.28,.22,.28),"Concrete",coll)


def add_vertex_ao(obj):
    if obj.type != "MESH" or not obj.data.loops: return
    mesh=obj.data
    attr=mesh.color_attributes.get("AO") or mesh.color_attributes.new(name="AO",type="BYTE_COLOR",domain="CORNER")
    zs=[v.co.z for v in mesh.vertices]; lo=min(zs); span=max(max(zs)-lo,.001)
    for poly in mesh.polygons:
        face=max(.58, .72 + .28*max(0.0, poly.normal.z))
        for li in poly.loop_indices:
            z=mesh.vertices[mesh.loops[li].vertex_index].co.z
            ao=min(1.0, face*(.82+.18*(z-lo)/span))
            attr.data[li].color=(ao,ao,ao,1)
    mesh.color_attributes.active_color=attr


def batch_collection(source, export_coll):
    bpy.context.view_layer.update()
    grouped={k:[] for k in MATS}
    for o in source.objects:
        if o.type=="MESH" and o.data.materials: grouped[o.data.materials[0].name].append(o)
    for mat,objects in grouped.items():
        if not objects: continue
        verts=[]; faces=[]
        for o in objects:
            offset=len(verts)
            verts.extend([o.matrix_world@v.co for v in o.data.vertices])
            faces.extend([tuple(offset+i for i in p.vertices) for p in o.data.polygons])
        mesh=bpy.data.meshes.new("Campus_"+mat+"Mesh");mesh.from_pydata(verts,[],faces);mesh.update()
        joined=bpy.data.objects.new("Campus_"+mat,mesh);export_coll.objects.link(joined)
        joined.data.materials.append(MATS[mat]);add_vertex_ao(joined)


def export_collection(coll, path):
    bpy.ops.object.select_all(action="DESELECT")
    for o in coll.all_objects: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(path),export_format="GLB",use_selection=True,
                              export_apply=True,export_yup=True,export_attributes=True,
                              export_vertex_color="ACTIVE",export_all_vertex_colors=True,
                              export_meshopt_compression_enable=True,
                              export_meshopt_extension="EXT_meshopt_compression",
                              export_cameras=False,export_lights=False)


def stats(coll):
    meshes=[o for o in coll.all_objects if o.type=="MESH"]
    pts=[]; tris=0
    for o in meshes:
        tris += sum(max(0,len(p.vertices)-2) for p in o.data.polygons)
        pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
    game_pts=[Vector((p.x,p.z,-p.y)) for p in pts]
    lo=[min(p[i] for p in game_pts) for i in range(3)]; hi=[max(p[i] for p in game_pts) for i in range(3)]
    return {"meshes":len(meshes),"triangles":tris,"materials":len({m.name for o in meshes for m in o.data.materials}),
            "bounds":{"min":[round(v,3) for v in lo],"max":[round(v,3) for v in hi]}}


def render_contact(export_coll):
    # Hide editable source and vehicles, then render a source-review image.
    SOURCE_COLL.hide_render=True; export_coll.hide_render=False
    bpy.ops.object.camera_add(location=(135,-190,180))
    cam=bpy.context.object; cam.name="ContactCamera"
    direction=Vector((-14,-5,3))-cam.location
    cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler(); cam.data.lens=58
    bpy.context.scene.camera=cam
    bpy.ops.mesh.primitive_plane_add(size=260,location=(0,0,-.035))
    ground=bpy.context.object; ground.name="ContactGround"
    ground.data.materials.append(MATS["Foliage"])
    bpy.ops.object.light_add(type='SUN', location=(30,-50,90)); sun=bpy.context.object
    sun.rotation_euler=(math.radians(28),math.radians(-22),math.radians(-28)); sun.data.energy=2.3
    world=bpy.context.scene.world; world.use_nodes=True
    background=world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value=(.62,.69,.76,1); background.inputs["Strength"].default_value=.42
    scene=bpy.context.scene; scene.render.engine='BLENDER_EEVEE'
    scene.render.resolution_x=1200; scene.render.resolution_y=800; scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'; scene.render.filepath=str(SOURCE/'campus-contact.png')
    scene.render.film_transparent=False
    scene.view_settings.look="AgX - Medium High Contrast"; scene.view_settings.exposure=-.25
    bpy.ops.render.render(write_still=True)


ASSET_GROUPS = {
    "fountain": (("Fountain",), (0, 1, 0), (10, 8, 10)),
    "great-court": (("Court", "Cloister", "Forgan", "Tower"), (-36, 7, -40), (58, 37, 58)),
    "forgan-smith-tower": (("Forgan", "Tower"), (-36, 9, -23), (18, 16, 20)),
    "great-court-cloister": (("Cloister",), (-36, 2, -44), (38, 17, 38)),
    "duhig-library": (("Duhig",), (-60, 7, -10), (18, 15, 18)),
    "lake-amphitheatre": (("Lake", "Amphitheatre"), (3, 1, -56), (28, 16, 28)),
    "qualia-construction": (("StudioQualia",), (18,5,-25), (18,15,18)),
    "dsr-branding": (("StudioDSR",), (31,3,-23), (16,12,16)),
    "bucklerx-lab": (("StudioBuckler",), (studios.BUCKLER_X,3,studios.BUCKLER_Z), (15,12,15)),
    "innovation-studios": (("Studio", "Rentixe"), (23, 5, -27), (36, 25, 52)),
    "engineering-pavilion": (("Engineering",), (24, 4, 18), (42, 28, 42)),
    "river-cafe-terrace": (("RiverCafe", "Cafe"), (-35,3,1), (20,16,20)),
    "river-cafe": (("RiverCafe", "Cafe"), (-35, 3, 1), (20, 16, 20)),
    "writing-pavilion": (("Writing",), (35, 3, 4), (20, 16, 20)),
    "river-bridge": (("Bridge", "CampusJetty", "CampusPontoon", "Lookout"), (-2, 3, 58), (34, 23, 36)),
    "vegetation-furniture": (("Tree", "Bench", "Lamp"), (-14, 4, 5), (44, 28, 43)),
}


def render_asset_reviews():
    EXPORT_COLL.hide_render=True; EXPORT_COLL.hide_viewport=True
    SOURCE_COLL.hide_render=False; SOURCE_COLL.hide_viewport=False
    for o in SOURCE_COLL.objects: add_vertex_ao(o)
    scene=bpy.context.scene
    scene.render.resolution_x=1200; scene.render.resolution_y=900
    cam=bpy.data.objects.get("ContactCamera")
    cam.data.type='ORTHO'
    def frame(objects,reverse=False):
        points=[o.matrix_world@Vector(corner) for o in objects for corner in o.bound_box]
        lo=Vector(tuple(min(p[i] for p in points) for i in range(3)))
        hi=Vector(tuple(max(p[i] for p in points) for i in range(3)))
        center=(lo+hi)/2; extent=hi-lo
        direction=Vector((1.0,1.15 if reverse else -1.15,.82)).normalized()
        cam.location=center+direction*max(extent)*2.4
        cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
        right=cam.rotation_euler.to_matrix().col[0]; up=cam.rotation_euler.to_matrix().col[1]
        xs=[right.dot(p-center) for p in points]; ys=[up.dot(p-center) for p in points]
        aspect=scene.render.resolution_x/scene.render.resolution_y
        cam.data.ortho_scale=max(max(xs)-min(xs),(max(ys)-min(ys))*aspect)*1.14
    for slug,(prefixes,target,offset) in ASSET_GROUPS.items():
        for o in SOURCE_COLL.objects:
            visible=o.name.startswith(prefixes)
            o.hide_render=not visible; o.hide_viewport=not visible
        visible_objects=[o for o in SOURCE_COLL.objects if not o.hide_render]
        frame(visible_objects,reverse=slug in {"engineering-pavilion","river-cafe-terrace"})
        scene.render.filepath=str(SOURCE/(slug+"-review.png"))
        bpy.ops.render.render(write_still=True)
        asset_blend=SOURCE/(slug+".blend")
        asset_blend.unlink(missing_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(asset_blend),copy=True)
    for o in SOURCE_COLL.objects:
        o.hide_render=False; o.hide_viewport=False
    frame(list(SOURCE_COLL.objects))
    EXPORT_COLL.hide_render=True; EXPORT_COLL.hide_viewport=True


reset()
MATS={name:material(name) for name in COLORS}
SOURCE_COLL=collection("Campus_Source")
EXPORT_COLL=collection("Campus_Export")
print("Building Great Court",flush=True)
great_court(SOURCE_COLL)
print("Building Duhig and lake",flush=True)
duhig_and_lake(SOURCE_COLL)
print("Building studios",flush=True)
studios.build(sys.modules[__name__], SOURCE_COLL)
print("Building riverside",flush=True)
riverside_and_bridge(SOURCE_COLL)
print("Building vegetation",flush=True)
tree_and_furniture(SOURCE_COLL)
print("Batching campus",flush=True)
batch_collection(SOURCE_COLL,EXPORT_COLL)
export_collection(EXPORT_COLL,PUBLIC/'campus.glb')
# Publish the compressed payload before its revision changes, so hot reload
# cannot cache an older model under the new content address.
compressed=PUBLIC/'campus.glb.gz.tmp'
compressed.write_bytes(gzip.compress((PUBLIC/'campus.glb').read_bytes(),compresslevel=9,mtime=0))
compressed.replace(PUBLIC/'campus.glb.gz')
metadata={"campus":stats(EXPORT_COLL),"materialRoles":list(COLORS),
          "coordinateSystem":"Three.js Y-up metres","bridge":{"z":[32,80],"deckTop":4.8,"width":4.35}}
metadata["authoredLayout"]={
    "landmarks":[
        {"id":"great-court","center":[-36,-42],"footprint":[58,43]},
        {"id":"duhig","center":[-60,-10],"footprint":[11,8]},
        {"id":"studio-a","center":[18,-25],"footprint":[10,10]},
        {"id":"studio-b","center":[31,-23],"footprint":[9,9]},
        {"id":"studio-c","center":[studios.BUCKLER_X,studios.BUCKLER_Z],"footprint":[8,7]},
        {"id":"engineering","center":[27,22],"footprint":[22.2,8.2]},
        {"id":"river-cafe","center":[-35,4],"footprint":[13.5,11.5]},
        {"id":"writing-pavilion","center":[35,4],"footprint":[13.2,11.2]}],
    "trees":[[x,z] for x,z,_ in [(-67,-40,1),(-55,-33,0),(-45,-12,1),(-28,-10,0),(-8,-34,1),(10,-30,0),(16,-4,0),(39,-4,1),(-18,12,1),(-47,17,0),(8,20,0),(38,36,0),(-22,34,1),(-47,29,0),(15,39,1),(-14,-69,0),(18,-70,1),(-65,4,0)]],
    "ferryJetties":[{"anchor":[-14,40],"berth":[-14,46.5]},{"anchor":[-6,84],"berth":[-13,84]}],
    "entrances":[[-36,-19.5],[-60,-5.9],[18,-19.9],[31,-18.4],[studios.BUCKLER_X,studios.BUCKLER_Z+3.6],[27,17.8],[-35,9.8],[35,-1.7]],
    "colliders":[
        {"id":"court-south","type":"box","center":[-36,-61],"half":[9,3.5]},
        {"id":"court-north-west","type":"box","center":[-50.7,-23],"half":[11.9,3.3]},
        {"id":"court-north-east","type":"box","center":[-21.3,-23],"half":[11.9,3.3]},
        {"id":"duhig","type":"box","center":[-60,-10],"half":[5.5,4]},
        {"id":"studio-a","type":"box","center":[18,-25],"half":[5,5]},
        {"id":"studio-b","type":"box","center":[31,-23],"half":[4.5,4.5]},
        {"id":"studio-c","type":"box","center":[studios.BUCKLER_X,studios.BUCKLER_Z],"half":[4,3.5]},
        {"id":"engineering","type":"box","center":[27,22],"half":[10.1,4.1]},
        {"id":"river-cafe","type":"box","center":[-35,4],"half":[6.75,5.75]},
        {"id":"writing-pavilion","type":"box","center":[35,4],"half":[6.6,5.6]}],
    "treeColliders":[{"center":[x,z],"radius":.42} for x,z in [[-67,-40],[-55,-33],[-45,-12],[-28,-10],[-8,-34],[10,-30],[16,-4],[39,-4],[-18,12],[-47,17],[8,20],[38,36],[-22,34],[-47,29],[15,39],[-14,-69],[18,-70],[-65,4]]]
}
metadata["authoredLayout"]["colliders"]=COLLIDERS
metadata["authoredLayout"]["colliderSchema"]={"version":2,"coordinates":"game Y-up metres","center":"[x,z]","baseY":"solid lower face world Y","height":"vertical extent","rotation":"Three.js positive Y radians","half":"box local [halfX,halfZ]","radius":"cylinder radius","scope":"primary solids and actual furniture; sloped bridge deck supplied by bridge profile"}
metadata["authoredLayout"]["entrances"]=[[-36,-19.5],[-60,-5.9],[18,-19.9],[31,-18.4],[studios.BUCKLER_X,studios.BUCKLER_Z+3.6],[27,16.4],[-35,4.2],[35,-1.7]]
metadata["authoredLayout"]["landmarks"][6].update(center=[-35,1],footprint=[13.5,5.5])
metadata["assetBytes"]={"campus.glb":(PUBLIC/'campus.glb').stat().st_size}
metadata["revision"]=hashlib.sha256((PUBLIC/'campus.glb').read_bytes()).hexdigest()[:12]
(PUBLIC/'campus.metadata.json').write_text(json.dumps(metadata,indent=2),encoding='utf-8')
render_contact(EXPORT_COLL)
render_asset_reviews()
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'campus.blend'))
# Prune the individual snapshots after the assembled master is safely written.
# Each file opens as a real isolated building with its own correctly framed camera.
for slug in ASSET_GROUPS:
    path=SOURCE/(slug+".blend")
    bpy.ops.wm.open_mainfile(filepath=str(path))
    src=bpy.data.collections.get("Campus_Source")
    keep={o for o in src.objects if not o.hide_render}
    keep.update(o for o in bpy.context.scene.objects if o.type in {"CAMERA","LIGHT"} or o.name=="ContactGround")
    for obj in list(bpy.data.objects):
        if obj not in keep: bpy.data.objects.remove(obj,do_unlink=True)
    for c in list(bpy.data.collections):
        if not c.objects and not c.children: bpy.data.collections.remove(c)
    bpy.data.orphans_purge(do_recursive=True)
    path.unlink(missing_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(path))
print(json.dumps(metadata,indent=2))
