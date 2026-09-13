"""Build the original UQ student character, animations, source blend, GLB and review render.

Run with Blender 5.2:
  blender --background --python scripts/blender/character.py
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
BLEND_PATH = ROOT / "assets-source" / "character.blend"
GLB_PATH = ROOT / "public" / "assets" / "game" / "character.glb"
VEHICLE_REVIEW_PATH = ROOT / "assets-source" / "character-vehicle-fit.png"
CLIP_DIR = ROOT / "assets-source" / "character-clips"

PALETTE = {
    "skin": (0.54, 0.25, 0.13, 1),
    "skin_light": (0.72, 0.38, 0.22, 1),
    "purple": (0.18, 0.045, 0.30, 1),
    "purple_light": (0.38, 0.12, 0.55, 1),
    "gold": (0.95, 0.54, 0.06, 1),
    "denim": (0.08, 0.18, 0.28, 1),
    "shoe": (0.035, 0.028, 0.045, 1),
    "hair": (0.055, 0.022, 0.012, 1),
    "eye": (0.012, 0.008, 0.012, 1),
    "white": (0.9, 0.82, 0.68, 1),
}


def reset_scene():
    bpy.context.preferences.filepaths.file_preview_type = "NONE"
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.curves, bpy.data.armatures, bpy.data.materials):
        for item in list(block):
            block.remove(item)


def material():
    mat = bpy.data.materials.new("StudentVertexPalette")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = 0.72
    bsdf.inputs["Specular IOR Level"].default_value = 0.22
    attr = nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Color"
    links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def paint(obj, color):
    attr = obj.data.color_attributes.new(name="Color", type="BYTE_COLOR", domain="CORNER")
    for datum in attr.data:
        datum.color = color


def finish_part(obj, name, bone, color, mat, bevel=0.025):
    obj.name = name
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new("SoftEdges", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    paint(obj, PALETTE[color])
    obj.data.materials.append(mat)
    group = obj.vertex_groups.new(name=bone)
    group.add(range(len(obj.data.vertices)), 1.0, "REPLACE")
    return obj


def cube(name, bone, loc, scale, color, mat, bevel=0.035, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    obj = bpy.context.object
    obj.scale = scale
    return finish_part(obj, name, bone, color, mat, bevel)


def sphere(name, bone, loc, scale, color, mat, segments=12, rings=8):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    obj = bpy.context.object
    obj.scale = scale
    return finish_part(obj, name, bone, color, mat, 0)


def capsule(name, bone, a, b, radius, color, mat, vertices=10):
    a, b = Vector(a), Vector(b)
    mid, direction = (a + b) * 0.5, b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=direction.length, location=mid)
    obj = bpy.context.object
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(direction.normalized())
    obj.rotation_mode = "XYZ"
    return finish_part(obj, name, bone, color, mat, radius * 0.32)


def create_armature():
    arm_data = bpy.data.armatures.new("StudentRig")
    arm = bpy.data.objects.new("StudentRig", arm_data)
    bpy.context.collection.objects.link(arm)
    arm.show_in_front = True
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")

    specs = [
        ("root", (0, 0, 0), (0, 0, 0.12), None),
        ("hips", (0, 0, 0.72), (0, 0, 0.90), "root"),
        ("spine", (0, 0, 0.90), (0, 0, 1.18), "hips"),
        ("chest", (0, 0, 1.18), (0, 0, 1.38), "spine"),
        ("neck", (0, 0, 1.38), (0, 0, 1.48), "chest"),
        ("head", (0, 0, 1.48), (0, 0, 1.74), "neck"),
        ("upper_arm.L", (0.20, 0, 1.32), (0.43, 0, 1.14), "chest"),
        ("forearm.L", (0.43, 0, 1.14), (0.48, 0, 0.92), "upper_arm.L"),
        ("hand.L", (0.48, 0, 0.92), (0.48, -0.01, 0.82), "forearm.L"),
        ("upper_arm.R", (-0.20, 0, 1.32), (-0.43, 0, 1.14), "chest"),
        ("forearm.R", (-0.43, 0, 1.14), (-0.48, 0, 0.92), "upper_arm.R"),
        ("hand.R", (-0.48, 0, 0.92), (-0.48, -0.01, 0.82), "forearm.R"),
        ("thigh.L", (0.13, 0, 0.78), (0.14, 0, 0.43), "hips"),
        ("shin.L", (0.14, 0, 0.43), (0.14, 0, 0.10), "thigh.L"),
        ("foot.L", (0.14, 0, 0.10), (0.14, -0.17, 0.05), "shin.L"),
        ("toe.L", (0.14, -0.17, 0.05), (0.14, -0.29, 0.05), "foot.L"),
        ("thigh.R", (-0.13, 0, 0.78), (-0.14, 0, 0.43), "hips"),
        ("shin.R", (-0.14, 0, 0.43), (-0.14, 0, 0.10), "thigh.R"),
        ("foot.R", (-0.14, 0, 0.10), (-0.14, -0.17, 0.05), "shin.R"),
        ("toe.R", (-0.14, -0.17, 0.05), (-0.14, -0.29, 0.05), "foot.R"),
        ("backpack", (0, 0.10, 1.27), (0, 0.18, 1.02), "chest"),
        ("hair", (0, 0, 1.66), (0, 0, 1.84), "head"),
    ]
    for name, head, tail, parent in specs:
        bone = arm_data.edit_bones.new(name)
        bone.head, bone.tail = head, tail
        if parent:
            bone.parent = arm_data.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    return arm


def create_student(arm, mat):
    parts = []
    # Shoes and legs establish a true feet-at-zero origin.
    parts += [
        cube("Shoe.L", "foot.L", (0.14, -0.105, 0.075), (0.105, 0.19, 0.07), "shoe", mat, 0.045),
        cube("Shoe.R", "foot.R", (-0.14, -0.105, 0.075), (0.105, 0.19, 0.07), "shoe", mat, 0.045),
        capsule("Shin.L", "shin.L", (0.14, 0, 0.12), (0.14, 0, 0.45), 0.105, "denim", mat),
        capsule("Shin.R", "shin.R", (-0.14, 0, 0.12), (-0.14, 0, 0.45), 0.105, "denim", mat),
        capsule("Thigh.L", "thigh.L", (0.14, 0, 0.44), (0.13, 0, 0.78), 0.125, "denim", mat),
        capsule("Thigh.R", "thigh.R", (-0.14, 0, 0.44), (-0.13, 0, 0.78), 0.125, "denim", mat),
        sphere("HoodieTorso", "chest", (0, 0, 1.11), (0.34, 0.205, 0.39), "purple", mat, 14, 9),
        sphere("Hood", "chest", (0, 0.10, 1.39), (0.27, 0.16, 0.23), "purple_light", mat, 12, 8),
        cube("Pocket", "spine", (0, -0.185, 0.99), (0.18, 0.025, 0.09), "purple_light", mat, 0.025),
        sphere("Shoulder.L", "upper_arm.L", (0.255, 0, 1.31), (0.14, 0.13, 0.145), "purple", mat, 10, 7),
        sphere("Shoulder.R", "upper_arm.R", (-0.255, 0, 1.31), (0.14, 0.13, 0.145), "purple", mat, 10, 7),
        capsule("UpperArm.L", "upper_arm.L", (0.25, 0, 1.30), (0.43, 0, 1.12), 0.115, "purple", mat),
        capsule("UpperArm.R", "upper_arm.R", (-0.25, 0, 1.30), (-0.43, 0, 1.12), 0.115, "purple", mat),
        sphere("Elbow.L", "forearm.L", (0.43, 0, 1.12), (0.105, 0.10, 0.11), "skin", mat, 10, 7),
        sphere("Elbow.R", "forearm.R", (-0.43, 0, 1.12), (0.105, 0.10, 0.11), "skin", mat, 10, 7),
        capsule("Forearm.L", "forearm.L", (0.43, 0, 1.12), (0.48, 0, 0.91), 0.085, "skin", mat),
        capsule("Forearm.R", "forearm.R", (-0.43, 0, 1.12), (-0.48, 0, 0.91), 0.085, "skin", mat),
        sphere("Hand.L", "hand.L", (0.48, -0.01, 0.85), (0.085, 0.07, 0.105), "skin_light", mat, 10, 6),
        sphere("Hand.R", "hand.R", (-0.48, -0.01, 0.85), (0.085, 0.07, 0.105), "skin_light", mat, 10, 6),
        sphere("Thumb.L", "hand.L", (0.415, -0.065, 0.86), (0.035, 0.035, 0.06), "skin_light", mat, 8, 5),
        sphere("Thumb.R", "hand.R", (-0.415, -0.065, 0.86), (0.035, 0.035, 0.06), "skin_light", mat, 8, 5),
    ]
    # Expressive face. Forward is -Y in Blender, exported as +Z in glTF.
    parts += [
        sphere("Head", "head", (0, -0.015, 1.58), (0.255, 0.225, 0.27), "skin", mat, 16, 10),
        sphere("Ear.L", "head", (0.245, -0.005, 1.59), (0.045, 0.035, 0.07), "skin_light", mat, 8, 5),
        sphere("Ear.R", "head", (-0.245, -0.005, 1.59), (0.045, 0.035, 0.07), "skin_light", mat, 8, 5),
        sphere("Eye.L", "head", (0.085, -0.225, 1.625), (0.038, 0.018, 0.052), "eye", mat, 8, 5),
        sphere("Eye.R", "head", (-0.085, -0.225, 1.625), (0.038, 0.018, 0.052), "eye", mat, 8, 5),
        capsule("Brow.L", "head", (0.04, -0.239, 1.695), (0.13, -0.225, 1.705), 0.014, "hair", mat, 6),
        capsule("Brow.R", "head", (-0.04, -0.239, 1.695), (-0.13, -0.225, 1.705), 0.014, "hair", mat, 6),
        sphere("Nose", "head", (0, -0.242, 1.56), (0.026, 0.024, 0.038), "skin_light", mat, 8, 5),
        capsule("Smile.L", "head", (-0.06, -0.236, 1.512), (0, -0.243, 1.495), 0.009, "hair", mat, 6),
        capsule("Smile.R", "head", (0, -0.243, 1.495), (0.06, -0.236, 1.512), 0.009, "hair", mat, 6),
    ]
    # Sculpted hair cap plus asymmetric fringe tufts.
    parts += [
        sphere("HairCap", "hair", (0, 0.005, 1.735), (0.27, 0.225, 0.18), "hair", mat, 14, 8),
        sphere("SweptFringe.L", "hair", (0.11, -0.205, 1.77), (0.145, 0.045, 0.075), "hair", mat, 10, 6),
        sphere("SweptFringe.R", "hair", (-0.105, -0.205, 1.765), (0.13, 0.043, 0.065), "hair", mat, 10, 6),
    ]
    # Gold backpack with straps and a small UQ-inspired purple badge.
    parts += [
        cube("Backpack", "backpack", (0, 0.235, 1.13), (0.235, 0.115, 0.29), "gold", mat, 0.075),
        cube("PackPocket", "backpack", (0, 0.355, 1.04), (0.15, 0.025, 0.11), "gold", mat, 0.025),
        capsule("Strap.L", "chest", (0.20, -0.03, 1.34), (0.20, -0.17, 0.98), 0.025, "gold", mat, 6),
        capsule("Strap.R", "chest", (-0.20, -0.03, 1.34), (-0.20, -0.17, 0.98), 0.025, "gold", mat, 6),
        cube("PackBadge", "backpack", (0, 0.383, 1.15), (0.055, 0.012, 0.055), "purple", mat, 0.018),
        sphere("Knee.L", "shin.L", (0.14, 0, 0.43), (0.12, 0.115, 0.12), "denim", mat, 10, 7),
        sphere("Knee.R", "shin.R", (-0.14, 0, 0.43), (0.12, 0.115, 0.12), "denim", mat, 10, 7),
        cube("Sole.L", "foot.L", (0.14, -0.11, 0.025), (0.112, 0.195, 0.025), "white", mat, 0.022),
        cube("Sole.R", "foot.R", (-0.14, -0.11, 0.025), (0.112, 0.195, 0.025), "white", mat, 0.022),
        sphere("ToeCap.L", "foot.L", (0.14, -0.27, 0.085), (0.105, 0.07, 0.06), "white", mat, 10, 6),
        sphere("ToeCap.R", "foot.R", (-0.14, -0.27, 0.085), (0.105, 0.07, 0.06), "white", mat, 10, 6),
    ]

    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    mesh = bpy.context.object
    mesh.name = "StudentMesh"
    mesh.parent = arm
    modifier = mesh.modifiers.new("StudentSkin", "ARMATURE")
    modifier.object = arm
    return mesh


def pose(arm, values):
    for bone in arm.pose.bones:
        bone.rotation_mode = "XYZ"
        bone.rotation_euler = (0, 0, 0)
        bone.location = (0, 0, 0)
    for name, rotations in values.items():
        if name.endswith(".loc"):
            arm.pose.bones[name[:-4]].location = rotations
        else:
            arm.pose.bones[name].rotation_euler = rotations


def key_pose(arm, frame, values):
    pose(arm, values)
    for bone in arm.pose.bones:
        bone.keyframe_insert("rotation_euler", frame=frame, group=bone.name)
        bone.keyframe_insert("location", frame=frame, group=bone.name)


def make_action(arm, name, frames, cyclic=False):
    action = bpy.data.actions.new(name)
    arm.animation_data_create()
    arm.animation_data.action = action
    for frame, values in frames:
        key_pose(arm, frame, values)
    # Blender 5 stores keyed channels in action slots instead of exposing the
    # legacy fcurves collection. Matching first and last poses keeps locomotion
    # clips seamless without a cycle modifier in the exported glTF.
    track = arm.animation_data.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, frames[0][0], action)
    strip.action_frame_start = frames[0][0]
    strip.action_frame_end = frames[-1][0]
    arm.animation_data.action = None


def animations(arm):
    neutral = {"upper_arm.L": (0, 0.05, -0.08), "upper_arm.R": (0, -0.05, 0.08)}
    make_action(arm, "Idle", [(1, neutral), (24, {**neutral, "chest": (0.025, 0, 0), "head": (-0.02, 0.05, 0)}), (48, neutral)], True)
    walk_a = {"thigh.L": (-0.55, 0, 0), "shin.L": (0.22, 0, 0), "thigh.R": (0.5, 0, 0), "shin.R": (0.65, 0, 0), "upper_arm.L": (0.48, 0, -0.08), "upper_arm.R": (-0.48, 0, 0.08)}
    walk_b = {"thigh.L": (0.5, 0, 0), "shin.L": (0.65, 0, 0), "thigh.R": (-0.55, 0, 0), "shin.R": (0.22, 0, 0), "upper_arm.L": (-0.48, 0, -0.08), "upper_arm.R": (0.48, 0, 0.08)}
    walk_pass = {"root.loc": (0, 0.085, 0), "thigh.L": (0.04, 0, 0), "shin.L": (0.48, 0, 0), "thigh.R": (-0.06, 0, 0), "shin.R": (0.18, 0, 0)}
    make_action(arm, "Walk", [(1, walk_a), (7, walk_pass), (13, walk_b), (19, walk_pass), (25, walk_a)], True)
    run_a = {**walk_a, "root.loc": (0, -0.14, 0), "thigh.L": (-0.82, 0, 0), "thigh.R": (0.7, 0, 0), "shin.R": (1.12, 0, 0), "chest": (0.15, 0, 0)}
    run_b = {**walk_b, "root.loc": (0, -0.14, 0), "thigh.R": (-0.82, 0, 0), "thigh.L": (0.7, 0, 0), "shin.L": (1.12, 0, 0), "chest": (0.15, 0, 0)}
    run_pass = {"root.loc": (0, 0.075, 0), "thigh.L": (0.08, 0, 0), "shin.L": (0.72, 0, 0), "thigh.R": (-0.1, 0, 0), "shin.R": (0.34, 0, 0), "chest": (0.15, 0, 0)}
    make_action(arm, "Run", [(1, run_a), (5, run_pass), (9, run_b), (13, run_pass), (17, run_a)], True)
    make_action(arm, "Jump", [(1, {"hips": (0, 0, 0), "thigh.L": (0.25, 0, 0), "thigh.R": (0.25, 0, 0), "upper_arm.L": (-0.45, 0, -0.3), "upper_arm.R": (-0.45, 0, 0.3)}), (12, {"hips": (-0.08, 0, 0), "thigh.L": (-0.15, 0, 0), "thigh.R": (-0.15, 0, 0), "shin.L": (0.55, 0, 0), "shin.R": (0.55, 0, 0), "upper_arm.L": (-0.8, 0, -0.35), "upper_arm.R": (-0.8, 0, 0.35)})])
    make_action(arm, "Land", [(1, {"root.loc": (0, 0.08, 0), "hips": (0.12, 0, 0), "thigh.L": (-0.38, 0, 0), "thigh.R": (-0.38, 0, 0), "shin.L": (0.75, 0, 0), "shin.R": (0.75, 0, 0)}), (10, neutral)])
    make_action(arm, "TurnLeft", [(1, neutral), (12, {**neutral, "hips": (0, -0.12, 0), "chest": (0, 0.28, 0), "head": (0, 0.38, 0)}), (24, neutral)])
    make_action(arm, "TurnRight", [(1, neutral), (12, {**neutral, "hips": (0, 0.12, 0), "chest": (0, -0.28, 0), "head": (0, -0.38, 0)}), (24, neutral)])
    make_action(arm, "Wave", [(1, neutral), (10, {**neutral, "upper_arm.R": (0.1, -0.25, 2.0), "forearm.R": (-0.2, 0, 0.65)}), (18, {**neutral, "upper_arm.R": (0.1, -0.25, 2.0), "forearm.R": (-0.2, 0, 1.05)}), (26, {**neutral, "upper_arm.R": (0.1, -0.25, 2.0), "forearm.R": (-0.2, 0, 0.65)}), (38, neutral)])
    make_action(arm, "Seated", [(1, {"hips": (0, 0, 0), "thigh.L": (-1.45, 0, 0), "thigh.R": (-1.45, 0, 0), "shin.L": (1.45, 0, 0), "shin.R": (1.45, 0, 0), "upper_arm.L": (-0.25, 0, -0.12), "upper_arm.R": (-0.25, 0, 0.12)})])
    make_action(arm, "Driver", [(1, {"thigh.L": (-1.28, 0, -0.08), "thigh.R": (-1.28, 0, 0.08), "shin.L": (1.18, 0, 0), "shin.R": (1.18, 0, 0), "foot.L": (0.24, 0, 0), "foot.R": (0.24, 0, 0), "upper_arm.L": (-0.72, 0.04, -0.18), "upper_arm.R": (-0.72, -0.04, 0.18), "forearm.L": (-0.62, 0, -0.12), "forearm.R": (-0.62, 0, 0.12), "chest": (0.06, 0, 0)})])


def save_and_export(arm, mesh):
    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    GLB_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.context.scene.render.engine = "BLENDER_EEVEE"
    bpy.context.scene.render.fps = 24
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_nla_strips=True,
        export_frame_range=False,
        export_yup=True,
        export_apply=False,
    )


def render_exported_clips():
    """Render every clip from a fresh GLB import, never from source-only poses."""
    reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(GLB_PATH))
    arm = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
    mesh = next(obj for obj in bpy.context.scene.objects if obj.type == "MESH" and any(m.type == "ARMATURE" for m in obj.modifiers))
    for obj in list(bpy.context.scene.objects):
        if obj.type == "MESH" and obj != mesh:
            bpy.data.objects.remove(obj, do_unlink=True)
    arm.animation_data.action = None

    bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, -0.012))
    floor = bpy.context.object
    floor.data.materials.append(bpy.data.materials.new("ClipReviewGround"))
    floor.data.materials[0].diffuse_color = (0.06, 0.045, 0.08, 1)
    bpy.ops.object.light_add(type="AREA", location=(3, -4, 6))
    bpy.context.object.data.energy = 850
    bpy.context.object.data.size = 4
    bpy.ops.object.light_add(type="AREA", location=(-3, 0, 3))
    bpy.context.object.data.energy = 420
    bpy.context.object.data.color = (0.52, 0.35, 1.0)
    bpy.ops.object.camera_add(location=(2.7, -5.7, 2.25))
    camera = bpy.context.object
    camera.rotation_euler = (Vector((0, 0, 0.9)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 64
    scene = bpy.context.scene
    scene.camera = camera
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 440
    scene.render.resolution_y = 520
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.color = (0.018, 0.012, 0.025)
    scene.view_settings.look = "AgX - Medium High Contrast"
    CLIP_DIR.mkdir(parents=True, exist_ok=True)
    sample = [("Idle", "Idle", 24), ("WalkA", "Walk", 1), ("WalkB", "Walk", 13), ("RunA", "Run", 1), ("RunB", "Run", 9), ("Jump", "Jump", 12), ("Land", "Land", 1), ("TurnLeft", "TurnLeft", 12), ("TurnRight", "TurnRight", 12), ("Wave", "Wave", 18), ("Seated", "Seated", 1), ("Driver", "Driver", 1)]
    for label, name, frame in sample:
        for track in arm.animation_data.nla_tracks:
            track.mute = track.name != name
        scene.frame_set(frame)
        scene.render.filepath = str(CLIP_DIR / f"{label}.png")
        bpy.ops.render.render(write_still=True)
    for track in arm.animation_data.nla_tracks:
        track.mute = False


def render_vehicle_fit():
    """Stage exported students in the exported buggy and ferry seat fixtures."""
    reset_scene()
    bpy.ops.import_scene.gltf(filepath=str(ROOT / "public" / "assets" / "game" / "vehicles.glb"))
    buggy = bpy.data.objects.get("Buggy")
    ferry = bpy.data.objects.get("Ferry")
    if not buggy or not ferry:
        raise RuntimeError("vehicle roots missing from vehicles.glb")
    buggy.location.x = -3.2
    ferry.location.x = 3.2

    bpy.ops.import_scene.gltf(filepath=str(GLB_PATH))
    source_arm = next(obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE")
    source_mesh = next(obj for obj in bpy.context.scene.objects if obj.type == "MESH" and any(m.type == "ARMATURE" for m in obj.modifiers))
    # glTF game coordinates are X/Y-up/Z-forward; Blender imports X/-Z/Y.
    source_arm.location = (-3.56, 0.22, 0.24)
    source_mesh.parent = source_arm
    source_arm.animation_data.action = None
    for track in source_arm.animation_data.nla_tracks:
        track.mute = track.name != "Driver"

    ferry_arm = source_arm.copy()
    ferry_arm.data = source_arm.data.copy()
    bpy.context.collection.objects.link(ferry_arm)
    ferry_arm.location = (3.2, 3.35, 0.32)
    ferry_mesh = source_mesh.copy()
    ferry_mesh.data = source_mesh.data
    bpy.context.collection.objects.link(ferry_mesh)
    ferry_mesh.parent = ferry_arm
    next(mod for mod in ferry_mesh.modifiers if mod.type == "ARMATURE").object = ferry_arm
    for track in ferry_arm.animation_data.nla_tracks:
        track.mute = track.name != "Seated"

    bpy.context.scene.frame_set(1)
    bpy.ops.mesh.primitive_plane_add(size=22, location=(0, 0, -0.012))
    floor = bpy.context.object
    floor.data.materials.append(bpy.data.materials.new("FitReviewGround"))
    floor.data.materials[0].diffuse_color = (0.06, 0.045, 0.08, 1)
    bpy.ops.object.light_add(type="AREA", location=(1, -5, 9))
    bpy.context.object.data.energy = 1200
    bpy.context.object.data.size = 6
    bpy.ops.object.camera_add(location=(12.5, -1.5, 7.8))
    camera = bpy.context.object
    camera.rotation_euler = (Vector((0, 0, 1.2)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 12
    scene = bpy.context.scene
    scene.camera = camera
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1500
    scene.render.resolution_y = 820
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(VEHICLE_REVIEW_PATH)
    scene.world.color = (0.018, 0.012, 0.025)
    scene.view_settings.look = "AgX - Medium High Contrast"
    bpy.ops.render.render(write_still=True)


def main():
    reset_scene()
    mat = material()
    arm = create_armature()
    mesh = create_student(arm, mat)
    animations(arm)
    save_and_export(arm, mesh)
    print(f"CHARACTER_BUILD vertices={len(mesh.data.vertices)} polygons={len(mesh.data.polygons)} bones={len(arm.data.bones)} actions={len(bpy.data.actions)}")
    render_exported_clips()
    render_vehicle_fit()


if __name__ == "__main__":
    main()
