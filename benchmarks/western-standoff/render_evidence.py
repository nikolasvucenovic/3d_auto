"""Trusted evidence renderer for an already-built western standoff blend file."""

import argparse
import json
import os
import sys

import bpy

arguments = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
parser = argparse.ArgumentParser()
parser.add_argument("--output", required=True)
parser.add_argument("--author", required=True)
args = parser.parse_args(arguments)
os.makedirs(args.output, exist_ok=False)

scene = bpy.context.scene
expected_collections = {"TOWN", "CHARACTERS", "DESERT", "CAMERAS", "LIGHTING"}
present_collections = {item.name for item in bpy.data.collections}
missing = sorted(expected_collections - present_collections)
markers = sorted((item for item in scene.timeline_markers if item.camera), key=lambda item: item.frame)
if missing:
    raise RuntimeError(f"Missing collections: {missing}")
if len(markers) != 16:
    raise RuntimeError(f"Expected 16 camera markers, found {len(markers)}")
if (scene.frame_start, scene.frame_end, scene.render.fps) != (1, 720, 24):
    raise RuntimeError("Timeline must be frames 1-720 at 24 fps.")

scene.render.resolution_x = 480
scene.render.resolution_y = 201
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
frames = []
for index, marker in enumerate(markers, 1):
    scene.frame_set(marker.frame)
    scene.camera = marker.camera
    filename = f"shot-{index:02d}-frame-{marker.frame:03d}.png"
    scene.render.filepath = os.path.join(args.output, filename)
    bpy.ops.render.render(write_still=True)
    frames.append({"shot": index, "frame": marker.frame, "camera": marker.camera.name, "file": filename})

evidence = {
    "author": args.author,
    "objects": len(bpy.data.objects),
    "shots": len(markers),
    "frameRange": [scene.frame_start, scene.frame_end],
    "fps": scene.render.fps,
    "collections": sorted(expected_collections),
    "frames": frames,
}
with open(os.path.join(args.output, "evidence.json"), "x", encoding="utf-8") as handle:
    json.dump(evidence, handle, indent=2)
print(f"EVIDENCE PASSED author={args.author} objects={evidence['objects']} shots={evidence['shots']}")
