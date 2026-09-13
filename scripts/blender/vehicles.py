"""Original campus vehicles, in metres with +Z forward after glTF export.

Build: blender --background --factory-startup --python scripts/blender/vehicles.py
Editable vehicle sources are separate from the assembled review scene and GLB.
CityCat proportions and open deck cues reference Aus Ships' Yoogera photography:
https://ausships.com/projects/citycat-22-yoogera/
"""
from pathlib import Path
import json
import math
import gzip
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets-source"
PUBLIC = ROOT / "public/assets/game"
PALETTE = {
    "ivory": (0.80, 0.79, 0.70, 1), "blue": (0.035, 0.18, 0.32, 1),
    "gold": (0.83, 0.48, 0.07, 1), "rubber": (0.028, 0.033, 0.035, 1),
    "glass": (0.09, 0.22, 0.28, 1), "glint": (0.28, 0.48, 0.53, 1),
    "metal": (0.31, 0.35, 0.34, 1), "seat": (0.17, 0.21, 0.19, 1),
    "wood": (0.48, 0.28, 0.12, 1), "red": (0.65, 0.085, 0.045, 1),
    "hood": (0.25, 0.12, 0.36, 1), "light": (0.95, 0.86, 0.54, 1),
}


def pos(p):
    return Vector((p[0], -p[2], p[1]))


def make_collection(name):
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    return c


def finish(o, name, color, coll, bevel=0.025):
    o.name = name
    for old in list(o.users_collection):
        old.objects.unlink(o)
    coll.objects.link(o)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = o.modifiers.new("Soft manufactured edge", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    o.data.materials.append(MAT)
    attr = o.data.color_attributes.new(name="Color", type="BYTE_COLOR", domain="CORNER")
    base = PALETTE[color]
    for face in o.data.polygons:
        shade = .79 + .21 * max(0, face.normal.z)
        for loop in face.loop_indices:
            attr.data[loop].color = (*[channel * shade for channel in base[:3]], 1)
    o.data.color_attributes.active_color = attr
    return o


def box(name, p, s, color, c, bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos(p))
    o = bpy.context.object
    o.scale = (s[0], s[2], s[1])
    return finish(o, name, color, c, bevel)


def beam(name, a, b, radius, color, c, vertices=8):
    start, end = pos(a), pos(b)
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=(end-start).length, location=(start+end)/2)
    o = bpy.context.object
    o.rotation_euler = (end-start).to_track_quat('Z', 'Y').to_euler()
    return finish(o, name, color, c, min(radius*.16, .012) if radius >= .15 else 0)


def poly(name, verts, faces, color, c, bevel=.025):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([pos(v) for v in verts], [], faces)
    mesh.update()
    o = bpy.data.objects.new(name, mesh)
    c.objects.link(o)
    return finish(o, name, color, c, bevel)


def empty(name, p, c, parent=None):
    o = bpy.data.objects.new(name, None)
    c.objects.link(o)
    o.location = pos(p)
    o.parent = parent
    o.empty_display_size = .18
    o.empty_display_type = 'ARROWS'
    return o


def join_at(objects, name, p, c, parent=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    o = bpy.context.object
    o.name = name
    bpy.context.scene.cursor.location = pos(p)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    o.parent = parent
    return o


def wheel(name, x, z, c, root, front):
    parts = []
    y = .34
    for radius, depth, color in [(.33, .24, 'rubber'), (.20, .255, 'metal'), (.10, .267, 'gold')]:
        parts.append(beam(name+'Ring', (x-depth/2,y,z), (x+depth/2,y,z), radius, color, c, 16))
    side = 1 if x>0 else -1
    for i in range(6):
        a = i*math.tau/6
        parts.append(beam(name+'Spoke', (x+side*.133,y,z), (x+side*.134,y+math.cos(a)*.17,z+math.sin(a)*.17), .018, 'ivory', c, 6))
    steering = empty('BuggySteer'+name[-2:], (x,y,z), c, root) if front else root
    mesh = join_at(parts, name, (x,y,z), c, steering)
    if front:
        mesh.location = (0,0,0)
    return mesh


def buggy(c):
    root = empty('Buggy', (0,0,0), c)
    box('Undertray', (0,.38,0), (1.43,.16,2.35), 'rubber', c, .06)
    box('Footwell', (0,.52,.20), (1.55,.17,2.1), 'metal', c, .07)
    box('FrontCowl', (0,.86,.94), (1.57,.5,.56), 'hood', c, .13)
    box('NoseStripe', (0,.96,1.231), (1.25,.12,.025), 'gold', c, .008)
    box('RearBody', (0,.80,-.91), (1.52,.60,.46), 'hood', c, .09)
    box('RearRack', (0,1.05,-1.02), (1.27,.06,.51), 'metal', c)
    for z in (-1.28,1.29):
        box('Bumper', (0,.59,z), (1.69,.13,.13), 'rubber', c, .055)
    for x in (-.58,.58):
        box('Headlamp', (x,.90,1.24), (.25,.12,.035), 'light', c, .025)
        box('TailLamp', (x,.84,-1.155), (.17,.10,.025), 'red', c, .015)
    for x in (-.39,.39):
        box('SeatCushion', (x,.91,-.24), (.66,.20,.65), 'seat', c, .09)
        box('SeatBack', (x,1.26,-.56), (.67,.61,.16), 'seat', c, .09)
        box('SeatInsert', (x,1.27,-.465), (.43,.35,.027), 'wood', c, .035)
    for x in (-.72,.72):
        for z in (-.75,.76):
            beam('CanopyPillar', (x,.70,z), (x,2.32,z-.13), .035, 'metal', c)
        beam('SideArmrest', (x,1.22,-.52), (x,1.22,.20), .03, 'metal', c)
        box('Step', (x*1.14,.43,.05), (.23,.09,.78), 'rubber', c, .025)
    # Preserve the seated pose while clearing its hair through runtime body lean.
    box('Canopy', (0,2.35,-.03), (1.86,.15,2.24), 'ivory', c, .10)
    box('CanopyTrim', (0,2.285,-.03), (1.77,.07,2.12), 'gold', c, .05)
    # Open upper windshield keeps the driver visible; slim screen is opaque tinted glass.
    box('WindshieldLower', (0,1.27,.70), (1.35,.38,.035), 'glass', c, .015)
    box('Dashboard', (0,1.09,.61), (1.37,.16,.29), 'rubber', c, .045)
    beam('SteeringColumn', (-.36,.77,.48), (-.36,1.22,.22), .035, 'metal', c)
    bpy.ops.mesh.primitive_torus_add(major_segments=16, minor_segments=6, location=pos((-.36,1.26,.18)), major_radius=.17, minor_radius=.018, rotation=(math.radians(33),0,0))
    finish(bpy.context.object, 'SteeringWheel', 'rubber', c, 0)
    body = [o for o in c.objects if o.type=='MESH']
    join_at(body, 'BuggyBody', (0,0,0), c, root)
    for suffix,x,z in [('FL',-.82,.85),('FR',.82,.85),('RL',-.82,-.85),('RR',.82,-.85)]:
        wheel('BuggyWheel'+suffix, x,z,c,root,suffix.startswith('F'))
    empty('BuggyDriverSeat', (-.36,1.02,-.22), c, root)
    return root


def cat_hull(name, x, c):
    # A narrow deep-V section, long parallel body and pointed bow. Actual separated hulls.
    stations = [(-4.8,.32),(-4.5,.48),(-3.7,.56),(2.7,.56),(3.8,.37),(4.65,.035)]
    verts=[]
    for z,w in stations:
        verts += [(x-w,.48,z),(x+w,.48,z),(x+w*.60,-.20,z),(x,-.36,z),(x-w*.60,-.20,z)]
    faces=[tuple(range(4,-1,-1))]
    for i in range(len(stations)-1):
        for k in range(5):
            faces.append((i*5+k,i*5+(k+1)%5,(i+1)*5+(k+1)%5,(i+1)*5+k))
    faces.append(tuple(range((len(stations)-1)*5,len(stations)*5)))
    return poly(name,verts,faces,'blue',c,.045)


def ferry(c):
    root=empty('Ferry',(0,0,0),c)
    for x in (-1.23,1.23):
        cat_hull('PortHull' if x<0 else 'StarboardHull', x,c)
    box('Bridgedeck',(0,.60,-.20),(3.55,.20,8.75),'ivory',c,.13)
    # Cabin is a sloped glazed pavilion with a gold leading face and blue waist.
    box('CabinWaist',(0,1.00,.55),(3.10,.57,5.45),'blue',c,.08)
    poly('Cabin', [(-1.55,1.15,-2.18),(1.55,1.15,-2.18),(1.55,1.15,3.30),(-1.55,1.15,3.30),(-1.43,2.32,-2.0),(1.43,2.32,-2.0),(1.34,2.32,2.74),(-1.34,2.32,2.74)], [(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)], 'gold',c,.045)
    for side in (-1,1):
        # Glass follows the inward-sloped side wall and remains above the blue stripe.
        for a,b in [(-1.94,-.78),(-.70,.51),(.59,1.77),(1.85,2.58)]:
            poly('CabinSideWindow',[(side*1.552,1.28,a),(side*1.552,1.28,b),(side*1.455,2.17,b-.025),(side*1.455,2.17,a+.025)],[(0,1,2,3)],'glass',c,0)
            beam('WindowCatchlight',(side*1.465,2.12,a+.05),(side*1.465,2.12,b-.06),.018,'glint',c,6)
        box('HullGoldRibbon',(side*1.561,.96,.24),(.025,.12,5.48),'gold',c,.005)
        box('CabinWhiteWaist',(side*1.576,1.145,.28),(.025,.065,5.52),'ivory',c,.005)
    poly('ForwardGlass',[(-1.27,1.29,3.262),(1.27,1.29,3.262),(1.19,2.15,2.834),(-1.19,2.15,2.834)],[(0,1,2,3)],'glass',c,0)
    beam('WindshieldMullion',(0,1.24,3.30),(0,2.2,2.78),.027,'gold',c)
    box('CabinRoof',(0,2.39,.27),(3.27,.17,5.05),'ivory',c,.10)
    box('RoofInset',(0,2.49,.00),(2.95,.06,4.15),'blue',c,.05)
    # Open stern and foredeck are deliberately readable from an orbit camera.
    for x in (-1.18,1.18):
        box('SternBenchCushion',(x,1.04,-3.20),(.49,.14,1.55),'seat',c,.05)
        box('SternBenchBase',(x,.84,-3.20),(.38,.34,1.42),'ivory',c,.04)
        box('SternBenchBack',(x*1.19,1.34,-3.20),(.10,.63,1.6),'blue',c,.045)
        for z in (-3.62,-2.86):
            beam('BenchArm',(x-.23,1.22,z),(x+.23,1.22,z),.022,'metal',c)
    # Passenger seat is centred and forward-facing, keeping the avatar out of the cabin wall.
    box('PassengerSeat',(0,1.03,-3.35),(.64,.13,.64),'seat',c,.065)
    box('PassengerSeatBack',(0,1.30,-3.66),(.65,.58,.12),'blue',c,.055)
    box('PassengerSeatBase',(0,.86,-3.35),(.48,.33,.48),'ivory',c,.045)
    for side in (-1,1):
        x=side*1.63
        for z in (-4.22,-3.35,-2.35,3.12,3.90):
            beam('DeckStanchion',(x,.70,z),(x,1.44,z),.025,'metal',c)
        for y in (1.12,1.46):
            beam('AftRail',(x,y,-4.22),(x,y,-2.33),.022,'ivory',c)
            beam('ForeRail',(x,y,3.12),(x,y,3.90),.022,'ivory',c)
    for y in (1.12,1.46):
        beam('SternRail',(-1.63,y,-4.22),(1.63,y,-4.22),.022,'ivory',c)
        beam('BowRail',(-1.63,y,3.9),(1.63,y,3.9),.022,'ivory',c)
    beam('Mast',(0,2.46,-.70),(0,3.20,-.70),.045,'ivory',c)
    box('Radar',(0,3.18,-.70),(.68,.095,.13),'ivory',c,.025)
    for x in (-1.32,1.32):
        box('NavigationLight',(x,2.44,1.98),(.08,.07,.10),'red' if x<0 else 'glint',c,.015)
    # Lifebuoy is geometry so its shape survives the palette-only export.
    bpy.ops.mesh.primitive_torus_add(major_segments=16,minor_segments=6,major_radius=.23,minor_radius=.047,location=pos((1.675,1.13,-3.22)),rotation=(0,math.pi/2,0))
    finish(bpy.context.object,'Lifebuoy','red',c,0)
    for z in (-4.0,-2.5,2.8):
        for side in (-1,1):
            beam('Fender',(side*1.79,.62,z),(side*1.79,.95,z),.10,'rubber',c,10)
    join_at([o for o in c.objects if o.type=='MESH'],'FerryBody',(0,0,0),c,root)
    empty('FerryPassengerSeat',(0,1.10,-3.35),c,root)
    empty('FerryBoardingPort',(-1.85,.70,-2.20),c,root)
    empty('FerryBoardingStarboard',(1.85,.70,-2.20),c,root)
    return root


def export_glb(collections):
    bpy.ops.object.select_all(action='DESELECT')
    for c in collections:
        for o in c.all_objects:
            o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(PUBLIC/'vehicles.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_attributes=True,export_vertex_color='ACTIVE',export_cameras=False,export_lights=False,export_meshopt_compression_enable=True,export_meshopt_extension='EXT_meshopt_compression')


def stats(c):
    meshes=[o for o in c.all_objects if o.type=='MESH']
    points=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
    coords=[(p.x,p.z,-p.y) for p in points]
    return {'meshes':len(meshes),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes),'bounds':{'min':[round(min(p[i] for p in coords),4) for i in range(3)],'max':[round(max(p[i] for p in coords),4) for i in range(3)]}}


def review_scene(name, c, eye, target, scale):
    scene=bpy.data.scenes.new(name)
    scene.collection.children.link(c)
    context=make_collection(name+'Studio')
    bpy.context.scene.collection.children.unlink(context)
    scene.collection.children.link(context)
    camera_data=bpy.data.cameras.new(name+'Camera')
    camera=bpy.data.objects.new(name+'Camera',camera_data)
    context.objects.link(camera)
    camera.location=pos(eye)
    camera.rotation_euler=(pos(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    camera_data.type='ORTHO';camera_data.ortho_scale=scale
    scene.camera=camera
    for title,p,power,size in [('Key',(4,8,6),1400,7),('Fill',(-5,4,-2),850,6)]:
        ld=bpy.data.lights.new(name+title,'AREA');lo=bpy.data.objects.new(name+title,ld);context.objects.link(lo)
        lo.location=pos(p);lo.rotation_euler=(pos(target)-lo.location).to_track_quat('-Z','Y').to_euler();ld.energy=power;ld.shape='DISK';ld.size=size
    world=bpy.data.worlds.new(name+'Sky');world.use_nodes=True
    world.node_tree.nodes['Background'].inputs[0].default_value=(.69,.76,.8,1)
    world.node_tree.nodes['Background'].inputs[1].default_value=.45;scene.world=world
    # Neutral studio with the actual object's vertex materials; no dark missing-AO surface.
    mesh=bpy.data.meshes.new(name+'Ground');mesh.from_pydata([(-100,-100,-.38),(100,-100,-.38),(100,100,-.38),(-100,100,-.38)],[],[(0,1,2,3)])
    ground=bpy.data.objects.new(name+'Ground',mesh);context.objects.link(ground)
    groundmat=bpy.data.materials.new(name+'GroundMaterial');groundmat.diffuse_color=(.40,.46,.43,1);mesh.materials.append(groundmat)
    scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=1200;scene.render.resolution_y=850;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
    scene.render.filepath=str(SOURCE/(name+'.png'))
    # Save a complete standalone scene, not an unlinked collection-only library.
    bpy.context.window.scene=scene
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                area.spaces.active.region_3d.view_perspective='CAMERA'
                area.spaces.active.shading.color_type='MATERIAL'
    bpy.data.libraries.write(str(SOURCE/(name+'.blend')),set([scene,c,context]),fake_user=True)
    bpy.ops.render.render(write_still=True)
    return scene


def main():
    global MAT
    SOURCE.mkdir(exist_ok=True);PUBLIC.mkdir(parents=True,exist_ok=True)
    bpy.context.preferences.filepaths.file_preview_type='NONE'
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    MAT=bpy.data.materials.new('VehiclePalette');MAT.use_nodes=True;MAT.diffuse_color=(.65,.69,.63,1)
    nodes=MAT.node_tree.nodes;vertex=nodes.new('ShaderNodeVertexColor');vertex.layer_name='Color'
    bsdf=nodes.get('Principled BSDF');MAT.node_tree.links.new(vertex.outputs['Color'],bsdf.inputs['Base Color']);bsdf.inputs['Roughness'].default_value=.65
    b=make_collection('Buggy_Source');f=make_collection('Ferry_Source');buggy(b);ferry(f)
    bpy.context.view_layer.update()
    export_glb([b,f])
    asset=PUBLIC/'vehicles.glb'
    metadata={'coordinateSystem':'Three.js Y-up metres, +Z forward','Buggy':stats(b),'Ferry':stats(f),'assetBytes':asset.stat().st_size,'gzipBytes':len(gzip.compress(asset.read_bytes(),mtime=0)),'wheelRadius':.33,'wheelbase':1.7,'ferryWaterline':0,'driverSeat':[-.36,1.02,-.22],'passengerSeat':[0,1.10,-3.35]}
    (PUBLIC/'vehicles.metadata.json').write_text(json.dumps(metadata,indent=2),encoding='utf8')
    original=bpy.context.scene
    original.collection.children.unlink(f)
    review_scene('buggy',b,(4,3.0,5),(0,1,0),4.6)
    original.collection.children.link(f)
    review_scene('ferry',f,(9,6,11),(0,1,0),12.2)
    # The main file opens the ferry studio; both separate asset scenes are selectable.
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'vehicles.blend'))
    print('VEHICLE_ASSETS',json.dumps(metadata))


if __name__=='__main__':
    main()
