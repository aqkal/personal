"""Separate, original miniature portfolio illustrations, sharing a single palette.

These are demonstrative fixtures, not replicas or screenshots of client products.
Run through Blender; building shells and placement remain in the campus assembly.
"""
import importlib.util
import json
import gzip
import sys
from pathlib import Path
import bpy

spec=importlib.util.spec_from_file_location('vehicle_tools',Path(__file__).with_name('vehicles.py'))
v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
ROOT=Path(__file__).resolve().parents[2]
PUBLIC=ROOT/'public/assets/game'
SOURCE=ROOT/'assets-source/exhibits'


def setup():
    SOURCE.mkdir(parents=True,exist_ok=True)
    bpy.context.preferences.filepaths.file_preview_type='NONE'
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    v.MAT=bpy.data.materials.new('ExhibitPalette');v.MAT.use_nodes=True
    nodes=v.MAT.node_tree.nodes;vertex=nodes.new('ShaderNodeVertexColor');vertex.layer_name='Color'
    bsdf=nodes.get('Principled BSDF');v.MAT.node_tree.links.new(vertex.outputs['Color'],bsdf.inputs['Base Color']);bsdf.inputs['Roughness'].default_value=.73


def base(c):
    v.box('TableTop',(0,.77,0),(3.9,.18,1.75),'ivory',c,.08)
    v.box('RecessedPlinth',(0,.33,0),(3.05,.66,1.20),'blue',c,.06)
    v.box('BronzeReveal',(0,.66,0),(3.12,.065,1.28),'gold',c,.02)


def monitor(c,x,y,z,w,h,color='glass'):
    v.box('MonitorStand',(x,y-.4,z),(w*.35,.07,.42),'metal',c,.025)
    v.beam('MonitorStem',(x,y-.36,z),(x,y,z),.045,'metal',c)
    v.box('MonitorBody',(x,y,z),(w,h,.12),'rubber',c,.05)
    v.box('Screen',(x,y,z+.067),(w-.12,h-.12,.015),color,c,.005)


def hull(c):
    base(c)
    for x in (-.63,.63):
        v.beam('ROVFrame',(x,1.05,-.38),(x,1.65,-.38),.045,'gold',c)
        v.beam('ROVFrame',(x,1.05,.38),(x,1.65,.38),.045,'gold',c)
        v.beam('ROVFrame',(x,1.65,-.38),(x,1.65,.38),.045,'gold',c)
    for y in (1.05,1.65):
        for z in (-.38,.38):v.beam('ROVFrame',(-.63,y,z),(.63,y,z),.045,'gold',c)
    v.beam('PressureHousing',(-.43,1.36,0),(.43,1.36,0),.25,'blue',c,16)
    for x in (-.65,.65):
        v.beam('Thruster',(x,1.25,.08),(x,1.25,.52),.18,'rubber',c,12)
        v.beam('ThrusterRotor',(x,1.25,.49),(x,1.25,.56),.11,'metal',c,10)
    v.beam('CameraHousing',(0,1.34,.2),(0,1.34,.54),.11,'metal',c,12)
    v.beam('CameraLens',(0,1.34,.53),(0,1.34,.56),.078,'glass',c,12)
    monitor(c,1.28,1.25,-.05,.68,.63)
    for y in (1.1,1.23,1.36):v.box('InspectionTrace',(1.28,y,.028),(.45,.022,.012),'gold',c,0)


def services(c):
    base(c)
    for x,h in [(-1.15,.60),(0,.84),(1.15,1.03)]:
        v.box('Service',(x,.9+h/2,-.2),(.64,h,.64),'blue',c,.07)
        for j in range(3):
            v.box('RackSlot',(x,1.0+j*.15,.13),(.42,.045,.018),'ivory',c,.005)
            v.box('RackStatus',(x+.23,1.0+j*.15,.15),(.035,.035,.018),'gold',c,.006)
        v.beam('NetworkLink',(x,.88,.14),(x,.88,.57),.025,'gold',c)
    v.beam('NetworkBackbone',(-1.15,.88,.57),(1.15,.88,.57),.025,'gold',c)
    v.box('DeployPacket',(-1.15,.95,.57),(.14,.14,.14),'gold',c,.025)


def rental(c):
    base(c)
    for x in (-1.16,0,1.16):
        v.box('HomeFloor',(x,.94,0),(.94,.16,1.24),'wood',c,.025)
        v.box('HomeBack',(x,1.5,-.56),(.94,1.00,.1),'ivory',c,.025)
        v.box('HomeSide',(x-.42,1.5,-.10),(.10,1.00,.99),'ivory',c,.02)
        v.box('HomeRoof',(x,2.03,-.08),(1.02,.13,1.23),'hood',c,.035)
        v.box('ApartmentWindow',(x,1.70,-.496),(.5,.38,.014),'glass',c,.004)
        v.box('Sofa',(x,1.13,-.18),(.58,.21,.37),'seat',c,.035)
        v.box('SofaBack',(x,1.28,-.35),(.58,.30,.10),'seat',c,.035)
        v.box('Doormat',(x,.995,.43),(.42,.02,.23),'gold',c,.007)


def game(c):
    base(c)
    v.box('FixtureBed',(0,.92,0),(3.25,.12,1.28),'seat',c,.045)
    for x in (-1.52,1.52):v.box('FixtureGuard',(x,1.10,0),(.14,.32,1.26),'gold',c,.035)
    for z in (-.57,.57):v.box('FixtureSide',(0,1.10,z),(3.15,.32,.10),'ivory',c,.025)
    v.box('FixturePuck',(-1.08,1.07,0),(.28,.15,.28),'hood',c,.06)
    v.beam('FixtureTarget',(1.08,1.0,0),(1.08,1.08,0),.27,'gold',c,16)
    v.beam('FixtureTargetCenter',(1.08,1.08,0),(1.08,1.095,0),.16,'ivory',c,16)


def health(c):
    base(c)
    for x in (-1.1,1.1):
        monitor(c,x,1.46,-.18,1.15,1.0,'ivory')
        v.box('ResourceHeader',(x,1.69,-.10),(.85,.10,.02),'blue',c,.007)
        for i in range(3):v.box('ResourceRow',(x,1.5-i*.13,-.10),(.75,.044,.02),'glint',c,.003)
    for x in (-1.1,1.1):v.beam('ResourceLink',(x,.87,.08),(x,.87,.5),.025,'gold',c)
    v.beam('ResourceLink',(-1.1,.87,.5),(1.1,.87,.5),.025,'gold',c)
    v.box('ResourcePacket',(0,1.02,.50),(.23,.23,.23),'hood',c,.03)


def qualia(c):
    base(c)
    for x,h,r in [(-.75,.95,.18),(.75,.95,.30)]:
        v.box('ExperimentColumn',(x,1.47,-.12),(.7,1.18,.10),'ivory',c,.035)
        for y in (1.1,1.35,1.6,1.85):v.box('ScaleTick',(x-.2,y,-.052),(.20,.018,.01),'metal',c,0)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=r,location=v.pos((x,1.84,.23)))
        v.finish(bpy.context.object,'ReasoningBallHeavy' if r>.2 else 'ReasoningBallLight','gold' if r>.2 else 'hood',c,0)
    v.box('SharedLanding',(0,.93,.21),(2.1,.14,.62),'seat',c,.045)


def responsive(c):
    base(c);monitor(c,-.65,1.58,-.18,1.95,1.22,'ivory')
    v.box('DesktopHeader',(-.65,1.96,-.101),(1.68,.12,.02),'blue',c,.008)
    v.box('DesktopHero',(-1.10,1.56,-.101),(.62,.52,.02),'hood',c,.016)
    for y,w in [(1.75,.72),(1.6,.72),(1.45,.49)]:v.box('DesktopCopy',(-.18,y,-.095),(w,.057,.02),'glint',c,.006)
    v.box('Phone',(1.03,1.49,.11),(.61,1.11,.14),'rubber',c,.08)
    v.box('PhoneScreen',(1.03,1.49,.19),(.49,.91,.018),'ivory',c,.03)
    v.box('PhoneHero',(1.03,1.65,.207),(.37,.30,.012),'hood',c,.015)
    for y in (1.4,1.30,1.2):v.box('PhoneCopy',(1.03,y,.207),(.32,.04,.012),'glint',c,.004)


def issue(c):
    base(c);monitor(c,0,1.55,-.12,2.7,1.3,'ivory')
    for x in (-.86,0,.86):
        v.box('IssueCard',(x,1.54,-.042),(.68,.81,.025),'blue',c,.025)
        v.box('IssueCardHeader',(x,1.78,-.024),(.5,.07,.015),'gold',c,.005)
        for y in (1.59,1.46):v.box('IssueCopy',(x,y,-.02),(.48,.04,.02),'ivory',c,.004)
    v.box('IssueStatus',(0,1.05,.2),(1.45,.20,.26),'gold',c,.05)


def bonus_snake():
    c=v.make_collection('BonusSnake');root=v.empty('BonusSnake',(0,0,0),c)
    v.box('CabinetFoot',(0,.08,0),(1.18,.16,.85),'rubber',c,.07)
    v.box('Cabinet',(0,.82,-.04),(1.16,1.53,.80),'ivory',c,.10)
    v.box('ControlDeck',(0,1.02,.44),(1.27,.14,.43),'gold',c,.065)
    v.box('ScreenFrame',(0,1.47,.373),(.94,.62,.075),'rubber',c,.045)
    v.box('Screen',(0,1.47,.416),(.82,.51,.012),'seat',c,.018)
    for x,y in [(-.27,1.58),(-.14,1.58),(-.01,1.58),(-.01,1.45),(-.01,1.32),(.12,1.32),(.25,1.32)]:
        v.box('SnakePixel',(x,y,.432),(.092,.092,.015),'gold',c,.006)
    v.box('FoodPixel',(.25,1.58,.432),(.075,.075,.015),'red',c,.006)
    v.beam('Joystick',(-.33,1.07,.48),(-.33,1.23,.48),.027,'metal',c)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10,ring_count=6,radius=.067,location=v.pos((-.33,1.25,.48)))
    v.finish(bpy.context.object,'JoystickGrip','hood',c,0)
    for x in (.23,.40):v.beam('ActionButton',(x,1.08,.50),(x,1.13,.50),.055,'hood',c,12)
    v.box('CabinetMarquee',(0,1.83,0),(1.2,.14,.86),'gold',c,.045)
    v.join_at([o for o in c.objects if o.type=='MESH'],'BonusSnakeBody',(0,0,0),c,root)
    bpy.ops.object.select_all(action='DESELECT')
    for o in c.all_objects:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(PUBLIC/'bonus.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_yup=True,export_apply=True,export_attributes=True,export_vertex_color='ACTIVE',export_cameras=False,export_lights=False,export_meshopt_compression_enable=True,export_meshopt_extension='EXT_meshopt_compression')
    v.review_scene('BonusSnake',c,(2.8,2.4,3.7),(0,.95,0),3.1)


def main():
    setup();collections=[];metadata={}
    if '--bonus-only' in sys.argv:
        v.SOURCE=SOURCE;bonus_snake();return
    for name,build in [('Hull',hull),('Services',services),('Rentixe',rental),('Game',game),('Health',health),('Qualia',qualia),('Responsive',responsive),('Issue',issue)]:
        c=v.make_collection('Exhibit'+name);collections.append(c)
        root=v.empty('Exhibit'+name,(0,0,0),c);build(c)
        # Keep the response pieces separate; immutable sculpted pieces become one draw.
        moving={'DeployPacket','FixturePuck','ResourcePacket','ReasoningBallHeavy','ReasoningBallLight'}
        static=[o for o in c.objects if o.type=='MESH' and o.name.split('.')[0] not in moving]
        v.join_at(static,'Exhibit'+name+'Body',(0,0,0),c,root)
        for o in c.objects:
            if o.type=='MESH' and not o.parent:o.parent=root
        bpy.context.view_layer.update();metadata[name]=v.stats(c)
    bpy.ops.object.select_all(action='DESELECT')
    for c in collections:
        for o in c.all_objects:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(PUBLIC/'exhibits.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_attributes=True,export_vertex_color='ACTIVE',export_cameras=False,export_lights=False,export_meshopt_compression_enable=True,export_meshopt_extension='EXT_meshopt_compression')
    asset=PUBLIC/'exhibits.glb';metadata['bytes']=asset.stat().st_size;metadata['gzipBytes']=len(gzip.compress(asset.read_bytes(),mtime=0))
    (PUBLIC/'exhibits.metadata.json').write_text(json.dumps(metadata,indent=2),encoding='utf8')
    v.SOURCE=SOURCE
    for c in collections:
        v.review_scene(c.name,c,(4.6,3.8,5.5),(0,1.12,0),5.8)
    bonus_snake()
    print('EXHIBIT_ASSETS',json.dumps(metadata))


if __name__=='__main__':main()
