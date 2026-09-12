"""Build a fast, fully procedural 30-second western standoff in Blender 5.2.

Run with: blender --background --factory-startup --disable-autoexec --python western_standoff_codex.py
The script saves western_standoff.blend beside itself. Re-render the saved file with
the command printed at completion. Change QUALITY to "final" for larger, slower output.
"""

QUALITY = "preview"  # "preview" | "final"

import math
import os
import random

import bpy
from mathutils import Vector

random.seed(42)
FINAL = QUALITY == "final"
SETTINGS = {
    "resolution": (2048, 858) if FINAL else (960, 402),
    "samples": 64 if FINAL else 8,
    "plants": 60 if FINAL else 20,
    "dof": FINAL,
    "volumetrics": FINAL,
}


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for group in (bpy.data.meshes, bpy.data.curves, bpy.data.materials,
                  bpy.data.cameras, bpy.data.lights, bpy.data.collections):
        for block in list(group):
            if group == bpy.data.collections and block == bpy.context.scene.collection:
                continue
            group.remove(block)
    for _ in range(2):
        bpy.ops.outliner.orphans_purge(do_recursive=True)


def collection(name):
    item = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(item)
    return item


def move_to(obj, target):
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    target.objects.link(obj)
    return obj


def material(name, color, metallic=0.0, roughness=0.55):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    return mat


def finish(obj, name, location, scale, mat, target, rotation=(0, 0, 0)):
    obj.name = name
    obj.location = location
    obj.scale = scale
    obj.rotation_euler = tuple(math.radians(v) for v in rotation)
    if mat and hasattr(obj.data, "materials"):
        obj.data.materials.append(mat)
    return move_to(obj, target)


def cube(name, location, scale, mat, target, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add()
    return finish(bpy.context.object, name, location, scale, mat, target, rotation)


def cylinder(name, location, radius, depth, mat, target, vertices=12, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth)
    return finish(bpy.context.object, name, location, (1, 1, 1), mat, target, rotation)


def sphere(name, location, scale, mat, target, segments=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=8)
    return finish(bpy.context.object, name, location, scale, mat, target)


def cone(name, location, radius1, radius2, depth, mat, target, vertices=12):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius1, radius2=radius2, depth=depth)
    return finish(bpy.context.object, name, location, (1, 1, 1), mat, target)


def torus(name, location, major, minor, mat, target, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=12, minor_segments=6)
    return finish(bpy.context.object, name, location, (1, 1, 1), mat, target, rotation)


def empty(name, location, target):
    obj = bpy.data.objects.new(name, None)
    obj.location = location
    target.objects.link(obj)
    return obj


def duplicate_linked(source, name, location, target, scale=None, rotation=None):
    obj = source.copy()
    obj.data = source.data
    obj.name = name
    obj.location = location
    if scale is not None:
        obj.scale = scale
    if rotation is not None:
        obj.rotation_euler = rotation
    target.objects.link(obj)
    return obj


def key(obj, data_path, frame, value):
    setattr(obj, data_path, value)
    obj.keyframe_insert(data_path=data_path, frame=frame)


def make_building(name, x, side, width, height, depth, wall, roof, town):
    y = side * (6.0 + depth)
    cube(f"TOWN_{name}_Body", (x, y, height / 2), (width / 2, depth, height / 2), wall, town)
    cube(f"TOWN_{name}_FalseFront", (x, y - side * depth, height * 0.68),
         (width * 0.56, 0.18, height * 0.68), wall, town)
    cube(f"TOWN_{name}_Roof", (x, y, height + 0.3), (width * 0.55, depth * 1.05, 0.18), roof, town,
         rotation=(0, side * 5, 0))
    cube(f"TOWN_{name}_Boardwalk", (x, side * 6.4, 0.18), (width * 0.62, 1.25, 0.18), roof, town)
    for offset in (-width * 0.45, width * 0.45):
        cube(f"TOWN_{name}_PorchPost_{offset:+.1f}", (x + offset, side * 6.0, 1.7),
             (0.10, 0.10, 1.7), roof, town)
    if name == "Saloon":
        for offset in (-0.65, 0.65):
            cube(f"TOWN_Saloon_Door_{offset:+.1f}", (x + offset, y - side * (depth + 0.22), 1.25),
                 (0.55, 0.08, 1.1), roof, town, rotation=(0, 0, -side * offset * 8))


def make_church(town, white, dark, brass):
    cube("TOWN_Church_Nave", (-26, 0, 3.5), (4.2, 4.5, 3.5), white, town)
    cube("TOWN_Church_Roof", (-26, 0, 7.2), (4.6, 4.9, 0.35), dark, town, rotation=(0, 8, 0))
    cube("TOWN_Church_Tower", (-26, 0, 9.2), (1.8, 1.8, 3.0), white, town)
    for x, y in ((-27.45, -1.45), (-24.55, -1.45), (-27.45, 1.45), (-24.55, 1.45)):
        cube(f"TOWN_Belfry_Post_{x}_{y}", (x, y, 13.0), (0.16, 0.16, 1.5), dark, town)
    cube("TOWN_Belfry_Roof", (-26, 0, 15.0), (2.2, 2.2, 0.3), dark, town)
    pivot = empty("TOWN_Bell_Swing_Pivot", (-26, 0, 13.1), town)
    bell = cone("TOWN_Church_Bell", (-26, 0, 12.6), 0.72, 0.35, 1.3, brass, town, vertices=16)
    rim = torus("TOWN_Church_Bell_Rim", (-26, 0, 12.0), 0.70, 0.09, brass, town)
    bell.parent = pivot
    rim.parent = pivot
    for frame, angle in ((1, -0.08), (24, 0.08), (48, -0.08), (72, 0.08), (96, -0.08), (720, 0.08)):
        key(pivot, "rotation_euler", frame, (angle, 0, 0))
    return pivot


def make_cactus(name, location, scale, green, desert, source=None):
    if source:
        return duplicate_linked(source, name, location, desert, scale=(scale, scale, scale),
                                rotation=(0, 0, random.uniform(0, math.tau)))
    trunk = cylinder(f"{name}_Trunk", location, 0.28, 3.0, green, desert, vertices=8)
    parts = [trunk]
    for side in (-1, 1):
        arm = cylinder(f"{name}_Arm_{side:+d}", (location[0] + side * 0.45, location[1], location[2] + 0.4),
                       0.18, 1.25, green, desert, vertices=8, rotation=(0, 90, 0))
        parts.append(arm)
    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = trunk
    bpy.ops.object.join()
    trunk.name = name
    trunk.scale = (scale, scale, scale)
    return trunk


def make_cowboy(name, location, facing, hat_mat, coat_mat, skin, leather, metal, characters):
    root = empty(f"CHAR_{name}_Root", location, characters)
    pieces = []
    for side in (-1, 1):
        boot = cube(f"CHAR_{name}_Boot_{side:+d}", (location[0] + side * 0.32, location[1], 0.28),
                    (0.22, 0.45, 0.28), leather, characters)
        leg = cylinder(f"CHAR_{name}_Leg_{side:+d}", (location[0] + side * 0.30, location[1], 1.25),
                       0.22, 1.7, coat_mat, characters, vertices=8)
        pieces += [boot, leg]
    torso = cube(f"CHAR_{name}_Torso", (location[0], location[1], 2.65), (0.72, 0.38, 0.9), coat_mat, characters)
    head = sphere(f"CHAR_{name}_Head", (location[0], location[1], 3.85), (0.42, 0.38, 0.52), skin, characters)
    brim = cylinder(f"CHAR_{name}_Hat_Brim", (location[0], location[1], 4.35), 0.72, 0.10, hat_mat, characters, vertices=16)
    crown = cylinder(f"CHAR_{name}_Hat_Crown", (location[0], location[1], 4.68), 0.42, 0.62, hat_mat, characters, vertices=12)
    pieces += [torso, head, brim, crown]
    gun_pivot = empty(f"CHAR_{name}_GunArm_Pivot", (location[0], location[1], 3.15), characters)
    arm = cylinder(f"CHAR_{name}_GunArm", (location[0], location[1] - facing * 0.48, 2.65), 0.16, 1.45,
                   coat_mat, characters, vertices=8, rotation=(70, 0, 0))
    gun = cube(f"CHAR_{name}_Revolver", (location[0], location[1] - facing * 0.72, 2.0),
               (0.10, 0.32, 0.10), metal, characters)
    holster = cube(f"CHAR_{name}_Holster", (location[0] + 0.58, location[1], 1.85),
                   (0.18, 0.12, 0.42), leather, characters, rotation=(0, 0, 10))
    arm.parent = gun_pivot
    gun.parent = gun_pivot
    pieces += [gun_pivot, holster]
    for piece in pieces:
        piece.parent = root
    root.rotation_euler[2] = 0 if facing > 0 else math.pi
    key(gun_pivot, "rotation_euler", 1, (math.radians(8), 0, 0))
    key(gun_pivot, "rotation_euler", 648, (math.radians(8), 0, 0))
    key(gun_pivot, "rotation_euler", 660, (math.radians(-78), 0, 0))
    key(root, "rotation_euler", 1, root.rotation_euler.copy())
    idle = root.rotation_euler.copy(); idle[1] += math.radians(1.2)
    key(root, "rotation_euler", 360, idle)
    key(root, "rotation_euler", 648, (0, 0, root.rotation_euler[2]))
    return root


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def camera(name, location, target, lens, cameras, move=None, dof_target=None):
    data = bpy.data.cameras.new(name)
    data.lens = lens
    data.sensor_width = 36
    data.dof.use_dof = SETTINGS["dof"]
    if dof_target:
        data.dof.focus_object = dof_target
        data.dof.aperture_fstop = 2.8
    obj = bpy.data.objects.new(name, data)
    cameras.objects.link(obj)
    obj.location = location
    look_at(obj, target)
    if move:
        start, end, end_location, end_target = move
        obj.keyframe_insert("location", frame=start)
        obj.keyframe_insert("rotation_euler", frame=start)
        obj.location = end_location
        look_at(obj, end_target)
        obj.keyframe_insert("location", frame=end)
        obj.keyframe_insert("rotation_euler", frame=end)
    return obj


def add_sun(lighting, warm):
    data = bpy.data.lights.new("LIGHT_East_Morning_Sun", "SUN")
    data.energy = 3.2
    data.color = warm
    data.angle = math.radians(1.0)
    obj = bpy.data.objects.new(data.name, data)
    lighting.objects.link(obj)
    obj.location = (50, 0, 9)
    look_at(obj, (-20, 0, 0))
    bounce_data = bpy.data.lights.new("LIGHT_Cool_Sky_Bounce", "AREA")
    bounce_data.energy = 450
    bounce_data.color = (0.35, 0.55, 1.0)
    bounce_data.shape = "RECTANGLE"
    bounce_data.size = 25
    bounce = bpy.data.objects.new(bounce_data.name, bounce_data)
    lighting.objects.link(bounce)
    bounce.location = (0, 0, 18)
    look_at(bounce, (0, 0, 0))


def configure(scene):
    scene.frame_start, scene.frame_end, scene.render.fps = 1, 720, 24
    scene.render.resolution_x, scene.render.resolution_y = SETTINGS["resolution"]
    scene.render.resolution_percentage = 100
    identifiers = {item.identifier for item in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}
    scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in identifiers else "BLENDER_EEVEE"
    if hasattr(scene, "eevee"):
        if hasattr(scene.eevee, "taa_render_samples"):
            scene.eevee.taa_render_samples = SETTINGS["samples"]
        if hasattr(scene.eevee, "use_gtao"):
            scene.eevee.use_gtao = FINAL
        if hasattr(scene.eevee, "use_soft_shadows"):
            scene.eevee.use_soft_shadows = FINAL
    try:
        scene.render.image_settings.file_format = "FFMPEG"
        scene.render.ffmpeg.format = "MPEG4"
        scene.render.ffmpeg.codec = "H264"
        scene.render.ffmpeg.constant_rate_factor = "MEDIUM"
        scene.render.filepath = bpy.path.abspath("//western_standoff_preview.mp4")
        scene["western_ffmpeg_available"] = True
    except (TypeError, ValueError):
        scene.render.image_settings.file_format = "PNG"
        scene.render.filepath = bpy.path.abspath("//western_standoff_frames/frame_")
        scene["western_ffmpeg_available"] = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 0.6
    world = bpy.data.worlds.new("WORLD_Cool_Morning")
    scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.06, 0.12, 0.28, 1)
    background.inputs["Strength"].default_value = 0.32


def main():
    clear_scene()
    scene = bpy.context.scene
    configure(scene)
    town, characters, desert, cameras, lighting = [collection(name) for name in ("TOWN", "CHARACTERS", "DESERT", "CAMERAS", "LIGHTING")]

    dirt = material("MAT_Dirt", (0.34, 0.16, 0.06), roughness=0.95)
    desert_mat = material("MAT_Desert", (0.26, 0.12, 0.04), roughness=1.0)
    wood = material("MAT_Wood", (0.24, 0.09, 0.025), roughness=0.82)
    walls = [material("MAT_Ochre", (0.52, 0.23, 0.07)), material("MAT_FadedRed", (0.38, 0.08, 0.04)), material("MAT_DustyBlue", (0.10, 0.22, 0.28))]
    white = material("MAT_ChurchWhite", (0.68, 0.62, 0.48))
    black = material("MAT_Black", (0.008, 0.008, 0.012), roughness=0.72)
    cloth_white = material("MAT_WhiteCoat", (0.72, 0.68, 0.55))
    skin = material("MAT_Skin", (0.42, 0.18, 0.10))
    silver = material("MAT_Metal", (0.24, 0.27, 0.30), metallic=0.85, roughness=0.28)
    brass = material("MAT_Brass", (0.55, 0.30, 0.04), metallic=0.75)
    cactus_green = material("MAT_Cactus", (0.06, 0.24, 0.08), roughness=0.9)
    dust = material("MAT_Dust", (0.44, 0.25, 0.10), roughness=1.0)

    cube("DESERT_Horizon", (0, 0, -0.65), (75, 55, 0.5), desert_mat, desert)
    cube("TOWN_Dirt_Street", (0, 0, -0.05), (30, 6, 0.08), dirt, town)
    specs = [(-18, "GeneralStore", 5.2, 4.4, 2.8), (-10, "Saloon", 6.0, 5.4, 3.2),
             (-1, "Hotel", 5.0, 6.2, 3.0), (8, "Sheriff", 4.5, 4.8, 2.6),
             (16, "Livery", 7.0, 4.2, 3.8), (24, "Assay", 4.2, 5.0, 2.5)]
    for index, (x, name, width, height, depth) in enumerate(specs):
        make_building(name, x, -1 if index % 2 else 1, width, height, depth, walls[index % len(walls)], wood, town)
    make_church(town, white, wood, brass)

    barrel_source = cylinder("TOWN_Barrel_Source", (-15, 4.9, 0.65), 0.48, 1.3, wood, town, vertices=12)
    for index, position in enumerate(((-12, 5.0, 0.65), (4, -5.0, 0.65), (14, 5.0, 0.65), (21, -5.0, 0.65))):
        duplicate_linked(barrel_source, f"TOWN_Barrel_{index+1:02}", position, town)
    for index, position in enumerate(((-7, 5, 0.5), (2, -5, 0.5), (18, 5, 0.5))):
        cube(f"TOWN_Crate_{index+1:02}", position, (0.6, 0.6, 0.5), wood, town)
    cube("TOWN_Water_Trough", (11, -5.1, 0.55), (2.2, 0.65, 0.55), wood, town)
    for index, x in enumerate((-20, -5, 12, 22)):
        cylinder(f"TOWN_Hitch_Post_{index+1:02}", (x, 5.3, 0.8), 0.12, 1.6, wood, town, vertices=8)
    for index, x in enumerate((-14, 6, 19)):
        torus(f"TOWN_WagonWheel_{index+1:02}", (x, -5.0, 1.0), 0.9, 0.08, wood, town, rotation=(90, 0, 0))

    cactus_source = make_cactus("DESERT_Cactus_Source", (-35, 14, 1.5), 1.0, cactus_green, desert)
    placed = []
    while len(placed) < SETTINGS["plants"]:
        x, y = random.uniform(-58, 58), random.choice((-1, 1)) * random.uniform(14, 44)
        if all((x - px) ** 2 + (y - py) ** 2 > 16 for px, py in placed):
            placed.append((x, y))
            make_cactus(f"DESERT_Cactus_{len(placed):02}", (x, y, 1.5), random.uniform(0.65, 1.35), cactus_green, desert, cactus_source)
    for index in range(12 if FINAL else 5):
        sphere(f"DESERT_Scrub_{index+1:02}", (random.uniform(-55, 55), random.choice((-1, 1)) * random.uniform(15, 40), 0.25),
               (random.uniform(0.3, 0.8), random.uniform(0.3, 0.8), 0.25), cactus_green, desert, segments=8)

    tumbleweeds = []
    for index in range(4):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.75, location=(-18 + index * 10, -3 + index * 2, 0.8))
        weed = finish(bpy.context.object, f"DESERT_Tumbleweed_{index+1:02}", bpy.context.object.location, (1, 1, 1), wood, desert)
        wire = weed.modifiers.new("Sparse_Twigs", "WIREFRAME")
        wire.thickness = 0.035
        key(weed, "location", 1, weed.location.copy())
        key(weed, "rotation_euler", 1, (0, 0, 0))
        end_location = weed.location.copy(); end_location.x += 32
        key(weed, "location", 720, end_location)
        key(weed, "rotation_euler", 720, (0, math.radians(32 / 0.75 * 57.3), 0))
        tumbleweeds.append(weed)

    black_hat = make_cowboy("BlackHat", (10, 0, 0), -1, black, black, skin, wood, silver, characters)
    white_hat = make_cowboy("WhiteHat", (-10, 0, 0), 1, white, cloth_white, skin, wood, silver, characters)
    key(black_hat, "rotation_euler", 684, black_hat.rotation_euler.copy())
    key(black_hat, "rotation_euler", 720, (0, math.radians(82), black_hat.rotation_euler[2]))
    dust_puff = sphere("CHAR_Draw_Dust", (0, 0, 0.4), (0.05, 0.05, 0.05), dust, characters, segments=8)
    key(dust_puff, "scale", 648, (0.05, 0.05, 0.05))
    key(dust_puff, "scale", 690, (3.5, 3.5, 1.3))

    add_sun(lighting, (1.0, 0.42, 0.12))
    cam_specs = [
        ("SHOT_01_Establisher", (-38, -24, 22), (-2, 0, 2), 28, (1, 96, (-32, -20, 16), (0, 0, 2))),
        ("SHOT_02_Wide", (0, -24, 5), (0, 0, 2), 32, None),
        ("SHOT_03_Black_Medium", (14, -8, 2.2), (10, 0, 2.7), 65, (169, 216, (13, -6.5, 2.3), (10, 0, 2.8))),
        ("SHOT_04_White_Medium", (-14, 8, 2.2), (-10, 0, 2.7), 65, (217, 264, (-13, 6.5, 2.3), (-10, 0, 2.8))),
        ("SHOT_05_Black_Hand", (11.6, -3.0, 2.0), (10.5, 0, 2.0), 135, (265, 300, (11.4, -2.8, 2.0), (10.5, 0, 2.0))),
        ("SHOT_06_White_Hand", (-11.6, 3.0, 2.0), (-9.5, 0, 2.0), 135, (301, 336, (-11.4, 2.8, 2.0), (-9.5, 0, 2.0))),
        ("SHOT_07_Black_Eyes", (11.0, -2.2, 4.0), (10, 0, 4.0), 180, (337, 384, (10.8, -1.9, 4.0), (10, 0, 4.0))),
        ("SHOT_08_White_Eyes", (-11.0, 2.2, 4.0), (-10, 0, 4.0), 180, (385, 432, (-10.8, 1.9, 4.0), (-10, 0, 4.0))),
        ("SHOT_09_Bell", (-20, -10, 9), (-26, 0, 12), 85, (433, 480, (-20, -10, 11), (-26, 0, 14))),
        ("SHOT_10_Tumbleweed", (-4, -5, 1.0), (0, 0, 0.8), 50, (481, 528, (5, -5, 1.0), (9, 0, 0.8))),
        ("SHOT_11_Black_Eyes_Snap", (10.9, -2.0, 4.0), (10, 0, 4.0), 180, (529, 552, (10.6, -1.4, 4.0), (10, 0, 4.0))),
        ("SHOT_12_White_Eyes_Snap", (-10.9, 2.0, 4.0), (-10, 0, 4.0), 180, (553, 576, (-10.6, 1.4, 4.0), (-10, 0, 4.0))),
        ("SHOT_13_Boots", (0, -7, 0.7), (0, 0, 0.5), 85, None),
        ("SHOT_14_Profile", (0, -20, 4), (0, 0, 2.2), 50, (601, 648, (3, -20, 4), (0, 0, 2.2))),
        ("SHOT_15_Draw", (0, -12, 2.7), (0, 0, 2.3), 50, (649, 684, (2, -9, 2.7), (7, 0, 2.4))),
        ("SHOT_16_Final", (0, -19, 5.5), (0, 0, 2.0), 35, (685, 720, (0, -24, 7), (0, 0, 1.8))),
    ]
    start_frames = (1, 97, 169, 217, 265, 301, 337, 385, 433, 481, 529, 553, 577, 601, 649, 685)
    shot_cameras = []
    for spec, frame in zip(cam_specs, start_frames):
        cam = camera(spec[0], spec[1], spec[2], spec[3], cameras, move=spec[4])
        marker = scene.timeline_markers.new(spec[0], frame=frame)
        marker.camera = cam
        shot_cameras.append(cam)
    shot_cameras[14].data.keyframe_insert("lens", frame=649)
    shot_cameras[14].data.lens = 95
    shot_cameras[14].data.keyframe_insert("lens", frame=660)
    scene.camera = shot_cameras[0]
    scene.frame_set(1)

    script_directory = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else bpy.path.abspath("//")
    blend_path = os.path.join(script_directory, "western_standoff.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    command = f'blender --background "{blend_path}" -a'
    if scene.get("western_ffmpeg_available"):
        print(f"FAST PREVIEW MOVIE: {command}")
    else:
        print(f"PREVIEW FRAMES (installed Blender has no usable FFMPEG output): {command}")
    print(f"SUMMARY objects={len(bpy.data.objects)} shots={len(shot_cameras)} frames=1-720 quality={QUALITY} resolution={SETTINGS['resolution'][0]}x{SETTINGS['resolution'][1]} blend={blend_path}")


if __name__ == "__main__":
    main()
