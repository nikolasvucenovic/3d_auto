import argparse
import json
import math
import os
import sys

import bpy
from mathutils import Vector


def parse_arguments():
    arguments = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--plan", required=True)
    parser.add_argument("--output", required=True)
    return parser.parse_args(arguments)


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def make_material(spec):
    material = bpy.data.materials.new(spec["name"])
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = spec["baseColor"]
    principled.inputs["Metallic"].default_value = spec.get("metallic", 0)
    principled.inputs["Roughness"].default_value = spec.get("roughness", 0.42)
    return material


def add_object(spec):
    operators = {
        "cube": bpy.ops.mesh.primitive_cube_add,
        "sphere": bpy.ops.mesh.primitive_uv_sphere_add,
        "cylinder": bpy.ops.mesh.primitive_cylinder_add,
        "cone": bpy.ops.mesh.primitive_cone_add,
        "plane": bpy.ops.mesh.primitive_plane_add,
    }
    operators[spec["type"]](location=spec["location"])
    obj = bpy.context.active_object
    obj.name = spec["id"]
    obj.rotation_euler = [math.radians(value) for value in spec.get("rotationDegrees", [0, 0, 0])]
    obj.scale = spec.get("scale", [1, 1, 1])
    obj.data.materials.append(make_material(spec["material"]))
    animate(obj, spec.get("animation"))
    return obj


def animate(obj, spec):
    if not spec:
        return
    start = spec["startFrame"]
    end = spec["endFrame"]
    if spec["type"] == "rotate":
        axis = {"x": 0, "y": 1, "z": 2}[spec.get("axis", "z")]
        obj.keyframe_insert("rotation_euler", frame=start)
        obj.rotation_euler[axis] += math.radians(spec.get("degrees", 360))
        obj.keyframe_insert("rotation_euler", frame=end)
    elif spec["type"] == "translate":
        axis = {"x": 0, "y": 1, "z": 2}[spec.get("axis", "x")]
        obj.keyframe_insert("location", frame=start)
        obj.location[axis] += spec.get("amount", 3)
        obj.keyframe_insert("location", frame=end)
    elif spec["type"] == "bounce":
        baseline = obj.location.z
        obj.keyframe_insert("location", frame=start)
        obj.location.z = baseline + spec.get("amount", 3)
        obj.keyframe_insert("location", frame=(start + end) // 2)
        obj.location.z = baseline
        obj.keyframe_insert("location", frame=end)

    if obj.animation_data and obj.animation_data.action:
        for curve in obj.animation_data.action.fcurves:
            for point in curve.keyframe_points:
                point.interpolation = "BEZIER"


def add_camera(spec, scene):
    bpy.ops.object.camera_add(location=spec["location"])
    camera = bpy.context.active_object
    camera.name = "Camera_Main"
    camera.data.lens = spec.get("lensMm", 50)
    look_at(camera, spec.get("target", [0, 0, 1]))
    scene.camera = camera


def add_light(spec):
    data = bpy.data.lights.new(spec["id"], type=spec.get("type", "AREA"))
    data.energy = spec.get("energy", 1000)
    data.shape = "DISK"
    data.size = spec.get("size", 5)
    light = bpy.data.objects.new(spec["id"], data)
    bpy.context.collection.objects.link(light)
    light.location = spec["location"]
    look_at(light, [0, 0, 1])


def configure_scene(scene, plan, output_directory):
    timeline = plan["timeline"]
    output = plan["output"]
    scene.frame_start = timeline["startFrame"]
    scene.frame_end = timeline["endFrame"]
    scene.render.fps = timeline["fps"]
    scene.render.resolution_x = output["width"]
    scene.render.resolution_y = output["height"]
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "FFMPEG"
    scene.render.ffmpeg.format = "MPEG4"
    scene.render.ffmpeg.codec = "H264"
    scene.render.ffmpeg.constant_rate_factor = "MEDIUM"
    scene.render.filepath = os.path.join(output_directory, f'{output["mode"]}.mp4')
    if output["mode"] == "animatic":
        scene.render.engine = "BLENDER_WORKBENCH"
        scene.display.shading.light = "STUDIO"
        scene.display.shading.color_type = "MATERIAL"
        scene.display.shading.show_shadows = True
        scene.display.shading.show_cavity = True
    else:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
        scene.render.image_settings.file_format = "FFMPEG"

    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = plan["world"]["backgroundColor"]
    background.inputs["Strength"].default_value = plan["world"].get("strength", 0.3)


def main():
    args = parse_arguments()
    with open(args.plan, "r", encoding="utf-8") as handle:
        plan = json.load(handle)
    os.makedirs(args.output, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    configure_scene(scene, plan, args.output)
    for spec in plan["objects"]:
        add_object(spec)
    add_camera(plan["camera"], scene)
    for spec in plan.get("lights", []):
        add_light(spec)
    scene_path = os.path.join(args.output, "scene.blend")
    if os.path.exists(scene_path):
        raise RuntimeError(f"Refusing to overwrite existing scene: {scene_path}")
    bpy.ops.wm.save_as_mainfile(filepath=scene_path)
    bpy.ops.render.render(animation=True)


if __name__ == "__main__":
    main()

