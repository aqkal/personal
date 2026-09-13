"""Build the editable mainland shoreline rail and its batched runtime GLB.

Run with Blender 5.2:
  blender --background --factory-startup --python scripts/blender/shore_rails.py

The source coordinates come directly from shore-boundary.ts, which keeps the
Blender mesh, navigation footprint and physics panels on the same outline.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets-source"
PUBLIC = ROOT / "public" / "assets" / "game"
BLEND_PATH = SOURCE / "shore-rails.blend"
REVIEW_PATH = SOURCE / "shore-rails-review.png"
GLB_PATH = PUBLIC / "shore-rails.glb"
GZIP_PATH = PUBLIC / "shore-rails.glb.gz"
METADATA_PATH = PUBLIC / "shore-rails.metadata.json"
LAYOUT_PATH = SOURCE / "shore-rails-layout.json"

COLORS = {
    "Rail_Sandstone": (0.70, 0.55, 0.34, 1),
    "Rail_GraphiteBronze": (0.16, 0.135, 0.105, 1),
    "Rail_BronzeAccent": (0.56, 0.32, 0.11, 1),
}


def game_position(point):
    """Game coordinates (x, y-up, z) to Blender coordinates."""
    return Vector((point[0], -point[2], point[1]))


def load_boundary_data():
    if not LAYOUT_PATH.exists():
        raise RuntimeError(
            "Missing shore-rails-layout.json. Run node --import tsx "
            "scripts/blender/shore_rails_layout.ts first."
        )
    return json.loads(LAYOUT_PATH.read_text(encoding="utf-8"))


def reset_scene():
    bpy.context.preferences.filepaths.file_preview_type = "NONE"
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for material in list(bpy.data.materials):
        bpy.data.materials.remove(material)


def make_collection(name):
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    return collection


def move_to_collection(obj, collection):
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    collection.objects.link(obj)


def make_material(name, color, metallic, roughness):
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return material


def finish(obj, name, material, collection, bevel=0):
    obj.name = name
    move_to_collection(obj, collection)
    obj.data.materials.append(material)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        modifier = obj.modifiers.new("Crafted edge", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
        modifier.limit_method = "ANGLE"
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)
    return obj


def add_box(name, location, size, rotation, material, collection, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=game_position(location))
    obj = bpy.context.object
    obj.dimensions = (size[0], size[2], size[1])
    obj.rotation_euler[2] = rotation
    return finish(obj, name, material, collection, bevel)


def add_cylinder(name, location, radius, depth, material, collection, vertices=10):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=game_position(location),
    )
    return finish(bpy.context.object, name, material, collection)


def add_beam(name, start, end, radius, material, collection, vertices=8):
    a = game_position(start)
    b = game_position(end)
    direction = b - a
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=direction.length,
        location=(a + b) / 2,
    )
    obj = bpy.context.object
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(direction.normalized())
    return finish(obj, name, material, collection)


def add_sphere(name, location, radius, material, collection):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=12,
        ring_count=6,
        radius=radius,
        location=game_position(location),
    )
    return finish(bpy.context.object, name, material, collection)


def duplicate_and_batch(source_collection, export_collection, materials):
    batches = []
    for material_name, material in materials.items():
        copies = []
        for source in source_collection.objects:
            if source.type != "MESH" or source.data.materials[0].name != material_name:
                continue
            copy = source.copy()
            copy.data = source.data.copy()
            export_collection.objects.link(copy)
            copies.append(copy)
        bpy.ops.object.select_all(action="DESELECT")
        for obj in copies:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = copies[0]
        bpy.ops.object.join()
        batch = bpy.context.object
        batch.name = material_name
        batch.data.name = material_name + "Mesh"
        while len(batch.data.materials) > 1:
            batch.data.materials.pop(index=len(batch.data.materials) - 1)
        if not batch.data.materials:
            batch.data.materials.append(material)
        batches.append(batch)
    for obj in source_collection.objects:
        obj.hide_render = True
        obj.hide_set(True)
    return batches


def export_runtime(batches):
    bpy.ops.object.select_all(action="DESELECT")
    for batch in batches:
        batch.select_set(True)
    bpy.context.view_layer.objects.active = batches[0]
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_meshopt_compression_enable=True,
        export_meshopt_extension="EXT_meshopt_compression",
    )
    # Use the same encoder as CI and the other assets; Python/Blender's zlib
    # version can otherwise produce different valid gzip bytes.
    subprocess.run(
        ["node", str(ROOT / "scripts" / "compress-game-assets.mjs"), "shore-rails.glb"],
        cwd=ROOT,
        check=True,
    )


def add_review_context(materials, studio):
    grass = make_material("Review_Grass", (0.34, 0.48, 0.28, 1), 0, 0.9)
    water = make_material("Review_Water", (0.12, 0.37, 0.48, 1), 0.05, 0.34)
    pier = make_material("Review_Pier", (0.60, 0.47, 0.30, 1), 0, 0.78)
    add_box("ReviewGrass", (-14, -0.055, 30), (70, 0.08, 23), 0, grass, studio)
    add_box("ReviewWater", (-14, -0.34, 51.5), (70, 0.08, 20), 0, water, studio)
    add_box("ReviewPierStem", (-14, 0.07, 43.25), (3.2, 0.14, 6.5), 0, pier, studio, 0.025)
    add_box("ReviewPierHead", (-14, 0.07, 46.5), (7, 0.14, 2.4), 0, pier, studio, 0.025)

    camera_data = bpy.data.cameras.new("ShoreRailReviewCamera")
    camera = bpy.data.objects.new("ShoreRailReviewCamera", camera_data)
    studio.objects.link(camera)
    camera.location = game_position((-25, 4.8, 50))
    target = game_position((-14, 0.48, 41.2))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.lens = 54
    bpy.context.scene.camera = camera

    light_data = bpy.data.lights.new("ShoreRailReviewSun", "SUN")
    light_data.energy = 3.0
    light_data.angle = 0.09
    light = bpy.data.objects.new("ShoreRailReviewSun", light_data)
    studio.objects.link(light)
    light.rotation_euler = (0.55, -0.45, -0.55)

    world = bpy.data.worlds.new("ShoreRailReviewSky")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.68, 0.82, 0.91, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.55
    bpy.context.scene.world = world

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(REVIEW_PATH)
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    for material in materials.values():
        material.diffuse_color = COLORS[material.name]


def asset_stats(batches):
    triangles = sum(
        sum(max(0, len(polygon.vertices) - 2) for polygon in obj.data.polygons)
        for obj in batches
    )
    vertices = sum(len(obj.data.vertices) for obj in batches)
    return {"meshes": len(batches), "materials": len(batches), "triangles": triangles, "vertices": vertices}


def main():
    SOURCE.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    boundary = load_boundary_data()
    reset_scene()
    materials = {
        "Rail_Sandstone": make_material("Rail_Sandstone", COLORS["Rail_Sandstone"], 0.0, 0.78),
        "Rail_GraphiteBronze": make_material("Rail_GraphiteBronze", COLORS["Rail_GraphiteBronze"], 0.72, 0.42),
        "Rail_BronzeAccent": make_material("Rail_BronzeAccent", COLORS["Rail_BronzeAccent"], 0.82, 0.30),
    }
    editable = make_collection("Shore_Rails_Editable")
    export_collection = make_collection("Shore_Rails_Runtime_Batches")
    style = boundary["style"]

    for segment in boundary["segments"]:
        segment_id = segment["id"]
        centre = segment["centre"]
        add_box(
            "Kerb_" + segment_id,
            (centre["x"], style["curbHeight"] / 2, centre["z"]),
            (style["curbWidth"], style["curbHeight"], segment["length"] + 0.035),
            segment["ry"],
            materials["Rail_Sandstone"],
            editable,
            0.025,
        )
        for rail_index, height in enumerate(style["railHeights"]):
            add_beam(
                f"Rail_{rail_index}_{segment_id}",
                (segment["start"]["x"], height, segment["start"]["z"]),
                (segment["end"]["x"], height, segment["end"]["z"]),
                style["railRadius"],
                materials["Rail_GraphiteBronze"],
                editable,
                8,
            )

    for post in boundary["posts"]:
        radius = style["endPostRadius"] if post["endpoint"] else style["postRadius"]
        add_cylinder(
            "Post_" + post["id"],
            (post["x"], style["postHeight"] / 2, post["z"]),
            radius,
            style["postHeight"],
            materials["Rail_GraphiteBronze"],
            editable,
            8,
        )
        add_cylinder(
            "Cap_" + post["id"],
            (post["x"], style["postHeight"] + 0.012, post["z"]),
            radius * 1.18,
            0.024,
            materials["Rail_BronzeAccent"],
            editable,
            10,
        )
        if post["endpoint"]:
            add_box(
                "EndPlinth_" + post["id"],
                (post["x"], 0.12, post["z"]),
                (0.38, 0.24, 0.38),
                0,
                materials["Rail_Sandstone"],
                editable,
                0.045,
            )
            add_sphere(
                "EndFinial_" + post["id"],
                (post["x"], style["postHeight"] + 0.045, post["z"]),
                radius * 1.32,
                materials["Rail_BronzeAccent"],
                editable,
            )
            for height in style["railHeights"]:
                add_cylinder(
                    "EndCollar_" + post["id"] + "_" + str(height),
                    (post["x"], height, post["z"]),
                    radius * 1.24,
                    0.038,
                    materials["Rail_BronzeAccent"],
                    editable,
                    10,
                )

    bpy.context.view_layer.update()
    batches = duplicate_and_batch(editable, export_collection, materials)
    export_runtime(batches)
    studio = make_collection("Shore_Rails_Review_Context")
    add_review_context(materials, studio)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.render.render(write_still=True)

    raw = GLB_PATH.read_bytes()
    metadata = {
        "revision": hashlib.sha256(raw).hexdigest()[:12],
        "coordinateSystem": "Three.js Y-up metres, +Z south",
        "source": "assets-source/shore-rails.blend",
        "review": "assets-source/shore-rails-review.png",
        "segments": len(boundary["segments"]),
        "posts": len(boundary["posts"]),
        "accessGaps": boundary["gaps"],
        "assetBytes": len(raw),
        "gzipBytes": GZIP_PATH.stat().st_size,
        **asset_stats(batches),
    }
    METADATA_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print("SHORE_RAIL_ASSET", json.dumps(metadata))


if __name__ == "__main__":
    main()
