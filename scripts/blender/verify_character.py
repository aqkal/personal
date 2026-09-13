"""Validate the exported character GLB in a clean Blender process."""

from pathlib import Path
import json
import struct
import bpy

root = Path(__file__).resolve().parents[2]
asset = root / "public" / "assets" / "game" / "character.glb"
bpy.context.preferences.filepaths.file_preview_type = "NONE"

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(asset))

meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
print("IMPORTED_MESHES", [(obj.name, len(obj.data.polygons), obj.parent.name if obj.parent else None, [mod.type for mod in obj.modifiers]) for obj in meshes])
skinned_meshes = [obj for obj in meshes if any(mod.type == "ARMATURE" for mod in obj.modifiers)]
assert len(skinned_meshes) == 1, f"expected one skinned mesh, found {len(skinned_meshes)}"
assert len(armatures) == 1, f"expected one armature, found {len(armatures)}"

mesh = skinned_meshes[0]
armature = armatures[0]
triangles = sum(max(1, len(poly.vertices) - 2) for poly in mesh.data.polygons)
materials = {slot.material.name for slot in mesh.material_slots if slot.material}
actions = {action.name.split(".")[0] for action in bpy.data.actions}
expected = {"Idle", "Walk", "Run", "Jump", "Land", "TurnLeft", "TurnRight", "Wave", "Seated", "Driver"}

assert len(armature.data.bones) == 22, f"expected 22 bones, found {len(armature.data.bones)}"
assert triangles <= 10_000, f"triangle budget exceeded: {triangles}"
assert len(materials) <= 2, f"material budget exceeded: {materials}"
assert expected <= actions, f"missing clips: {sorted(expected - actions)}"
assert abs(min(vertex.co.z for vertex in mesh.data.vertices)) < 0.03, "feet are not at local ground zero"
assert "Color" in mesh.data.color_attributes, "vertex color palette is missing"

with asset.open("rb") as handle:
    handle.read(12)
    json_length, _ = struct.unpack("<II", handle.read(8))
    document = json.loads(handle.read(json_length).rstrip(b"\x00 "))
assert len(document.get("meshes", [])) == 1, "GLB contains stray mesh geometry"
assert len(document.get("skins", [])) == 1, "GLB must contain exactly one skin"

# The model origin is the floor. All grounded review clips keep at least one
# shoe planted and never push geometry materially below the floor.
grounded_samples = {"Idle": range(1, 49), "Walk": range(1, 26), "Run": range(1, 18), "Land": range(1, 11), "TurnLeft": range(1, 25), "TurnRight": range(1, 25), "Wave": range(1, 39)}
armature.animation_data.action = None
for name, frames in grounded_samples.items():
    for track in armature.animation_data.nla_tracks:
        track.mute = track.name != name
    for frame in frames:
        bpy.context.scene.frame_set(frame)
        evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
        minimum = min((evaluated.matrix_world @ vertex.co).z for vertex in evaluated.data.vertices)
        assert -0.04 <= minimum <= 0.055, f"{name} frame {frame} loses floor contact: {minimum:.3f}"

def foot_forward(action_name, frame):
    for track in armature.animation_data.nla_tracks:
        track.mute = track.name != action_name
    bpy.context.scene.frame_set(frame)
    return (
        armature.pose.bones["foot.L"].head.y,
        armature.pose.bones["foot.R"].head.y,
    )

for action_name, frames in (("Walk", (1, 13)), ("Run", (1, 9))):
    first = foot_forward(action_name, frames[0])
    opposite = foot_forward(action_name, frames[1])
    first_delta = first[0] - first[1]
    opposite_delta = opposite[0] - opposite[1]
    assert first_delta * opposite_delta < 0, f"{action_name} feet do not exchange stance"
    assert min(abs(first_delta), abs(opposite_delta)) > 0.18, f"{action_name} stride is too small"

print(
    "CHARACTER_ASSET_OK",
    f"triangles={triangles}",
    f"materials={len(materials)}",
    f"bones={len(armature.data.bones)}",
    f"clips={len(expected)}",
    f"bytes={asset.stat().st_size}",
)
