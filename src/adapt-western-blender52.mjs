import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  throw new Error('Usage: adapt-western-blender52.mjs INPUT OUTPUT');
}

let source = await readFile(inputPath, 'utf8');
const changes = [];

function replaceIfPresent(label, before, after) {
  if (!source.includes(before)) return false;
  source = source.replace(before, after);
  changes.push(label);
  return true;
}

replaceIfPresent(
  'guard-ffmpeg-and-fallback-to-png',
  `bpy.context.scene.render.image_settings.file_format = 'FFMPEG'\ntry:\n    bpy.context.scene.render.ffmpeg.format = 'MPEG4'\nexcept: pass`,
  `try:\n    bpy.context.scene.render.image_settings.file_format = 'FFMPEG'\n    bpy.context.scene.render.ffmpeg.format = 'MPEG4'\nexcept (TypeError, ValueError):\n    bpy.context.scene.render.image_settings.file_format = 'PNG'`,
);

replaceIfPresent(
  'apply-timeline-and-fps-constants',
  `bpy.context.scene.render.resolution_percentage = 100`,
  `bpy.context.scene.render.resolution_percentage = 100\nbpy.context.scene.frame_start = FRAME_START\nbpy.context.scene.frame_end = FRAME_END\nbpy.context.scene.render.fps = FPS`,
);

replaceIfPresent(
  'aim-generated-cameras-at-scene',
  `cam_obj.location = (x, y, z)`,
  `cam_obj.location = (x, y, z)\n    cam_obj.rotation_euler = (Vector((0, 0, 1.5)) - cam_obj.location).to_track_quat('-Z', 'Y').to_euler()`,
);

replaceIfPresent(
  'probe-render-engine-enum',
  `render_engine = "BLENDER_EEVEE" if hasattr(bpy.context.scene.render, "engine") and "BLENDER_EEVEE" in bpy.context.scene.render.engine else "BLENDER_RENDER"\nbpy.context.scene.render.engine = render_engine`,
  `engine_ids = {item.identifier for item in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}\nrender_engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engine_ids else "BLENDER_EEVEE"\nbpy.context.scene.render.engine = render_engine`,
);

replaceIfPresent(
  'guard-eevee-quality-properties',
  `if QUALITY == "final":\n    bpy.context.scene.eevee.samples = SAMPLES\n    bpy.context.scene.eevee.taa_render_samples = SAMPLES\nelse:\n    bpy.context.scene.eevee.samples = 8\n    bpy.context.scene.eevee.taa_render_samples = 8`,
  `eevee_settings = getattr(bpy.context.scene, "eevee", None)\nif eevee_settings is not None and hasattr(eevee_settings, "taa_render_samples"):\n    eevee_settings.taa_render_samples = SAMPLES`,
);

replaceIfPresent(
  'guard-volumetric-property',
  `bpy.context.scene.eevee.use_volumetric_lighting = True if QUALITY == "final" else False`,
  `if eevee_settings is not None and hasattr(eevee_settings, "use_volumetric_lighting"):\n    eevee_settings.use_volumetric_lighting = QUALITY == "final"`,
);

replaceIfPresent(
  'retain-created-camera-objects',
  `for i, cam_data in enumerate(cameras):\n    camera = create_camera(cam_data["x"], cam_data["y"], cam_data["z"])`,
  `camera_objects = []\nfor i, cam_data in enumerate(cameras):\n    camera = create_camera(cam_data["x"], cam_data["y"], cam_data["z"])\n    camera.name = cam_data["name"]\n    camera_objects.append(camera)`,
);

replaceIfPresent(
  'retain-animated-camera-object',
  `camera = create_camera(-30, -8, 4)\ncamera.location = (-30, -8, 4)`,
  `camera = create_camera(-30, -8, 4)\ncamera.name = "AnimatedCamera"\ncamera_objects.append(camera)\ncamera.location = (-30, -8, 4)`,
);

replaceIfPresent(
  'bind-timeline-markers-to-cameras',
  `for marker in markers:\n    bpy.context.scene.timeline_markers.new(name=marker["name"], frame=marker["frame"])`,
  `for marker_index, marker in enumerate(markers):\n    timeline_marker = bpy.context.scene.timeline_markers.new(name=marker["name"], frame=marker["frame"])\n    timeline_marker.camera = camera_objects[marker_index % len(camera_objects)]\nbpy.context.scene.camera = camera_objects[0]`,
);

replaceIfPresent(
  'guard-render-alias-ffmpeg',
  `render.image_settings.file_format = 'FFMPEG'\nrender.ffmpeg.format = 'MPEG4'\nrender.ffmpeg.codec = 'H264'`,
  `try:\n    render.image_settings.file_format = 'FFMPEG'\n    render.ffmpeg.format = 'MPEG4'\n    render.ffmpeg.codec = 'H264'\nexcept (TypeError, ValueError):\n    render.image_settings.file_format = 'PNG'`,
);

if (!source.includes('bpy.data.collections.new("LIGHTING")') && source.includes('render = scene.render')) {
  source = source.replace(
    'render = scene.render',
    'render = scene.render\nlighting_collection = bpy.data.collections.new("LIGHTING")\nscene.collection.children.link(lighting_collection)',
  );
  source = source.replace('scene.collection.objects.link(sun_obj)', 'lighting_collection.objects.link(sun_obj)');
  source = source.replace('scene.collection.objects.link(bounce_obj)', 'lighting_collection.objects.link(bounce_obj)');
  changes.push('create-and-use-lighting-collection');
}

if (source.includes('mat_green') && !/^mat_green\s*=/m.test(source)) {
  const anchor = source.match(/^mat_gray\s*=.*$/m)?.[0];
  if (!anchor) throw new Error('mat_green is used but no material insertion anchor was found.');
  source = source.replace(anchor, `${anchor}\nmat_green = create_material("Green", (0.12, 0.35, 0.08, 1))`);
  changes.push('define-missing-green-material');
}

replaceIfPresent(
  'probe-render-alias-engine-enum',
  `try:\n    scene.render.engine = "BLENDER_EEVEE"\nexcept:\n    pass`,
  `engine_ids = {item.identifier for item in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}\nscene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engine_ids else "BLENDER_EEVEE"`,
);

replaceIfPresent(
  'guard-render-alias-eevee-properties',
  `if hasattr(scene.eevee, 'use_volumetric'):\n    scene.eevee.use_volumetric = VOLUMETRICS\nscene.eevee.samples = SAMPLES\nscene.eevee.taa_render_samples = SAMPLES`,
  `eevee_settings = getattr(scene, "eevee", None)\nif eevee_settings is not None and hasattr(eevee_settings, 'use_volumetric'):\n    eevee_settings.use_volumetric = VOLUMETRICS\nif eevee_settings is not None and hasattr(eevee_settings, 'taa_render_samples'):\n    eevee_settings.taa_render_samples = SAMPLES`,
);

if (source.includes("type='HEMI'")) {
  source = source.replaceAll("type='HEMI'", "type='AREA'");
  changes.push('replace-removed-hemi-light-type');
}

replaceIfPresent(
  'aim-location-rotation-cameras-at-scene',
  `cam_obj.location = location\n    cam_obj.rotation_euler = rotation`,
  `cam_obj.location = location\n    cam_obj.rotation_euler = (Vector((0, 0, 1.5)) - cam_obj.location).to_track_quat('-Z', 'Y').to_euler()`,
);

const cameraSequenceStart = source.indexOf('# Camera 1-96:');
const cameraSequenceEnd = source.indexOf('# Animate bell swinging motion');
if (cameraSequenceStart >= 0 && cameraSequenceEnd > cameraSequenceStart) {
  const before = source.slice(cameraSequenceStart, cameraSequenceEnd);
  let after = before.replace(/for i in range\((\d+),\s*(\d+)\):/g, 'for i in ($1,):');
  after = after.replace(/scene\.timeline_markers\.new\(name=cam_name, frame=frame\)/g, 'timeline_marker = scene.timeline_markers.new(name=cam_name, frame=frame)\n    timeline_marker.camera = cam_obj');
  after = after.replace(/scene\.timeline_markers\.new\(name=f"Cam_\{frame\}", frame=frame\)/g, 'timeline_marker = scene.timeline_markers.new(name=f"Cam_{frame}", frame=frame)\n    timeline_marker.camera = cam_obj');
  if (after !== before) {
    source = source.slice(0, cameraSequenceStart) + after + source.slice(cameraSequenceEnd);
    changes.push('collapse-per-frame-cameras-to-16-bound-shot-cameras');
  }
}

replaceIfPresent(
  'probe-function-render-engine-enum',
  `bpy.context.scene.render.engine = 'BLENDER_EEVEE'`,
  `engine_ids = {item.identifier for item in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}\n    bpy.context.scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engine_ids else "BLENDER_EEVEE"`,
);

if (!source.includes('scene.render.fps = FPS') && source.includes('scene.frame_end = FRAME_END')) {
  source = source.replace('scene.frame_end = FRAME_END', 'scene.frame_end = FRAME_END\n    scene.render.fps = FPS');
  changes.push('apply-fps-constant');
}

replaceIfPresent(
  'guard-function-preview-eevee-properties',
  `bpy.context.scene.eevee.use_volumetric_shadows = False\n        bpy.context.scene.eevee.volumetric_samples = 0`,
  `eevee_settings = getattr(bpy.context.scene, "eevee", None)\n        if eevee_settings is not None and hasattr(eevee_settings, "use_volumetric_shadows"):\n            eevee_settings.use_volumetric_shadows = False\n        if eevee_settings is not None and hasattr(eevee_settings, "volumetric_samples"):\n            eevee_settings.volumetric_samples = 0`,
);

replaceIfPresent(
  'aim-position-rotation-cameras-at-scene',
  `cam_obj.location = position\n    cam_obj.rotation_euler = rotation`,
  `cam_obj.location = position\n    cam_obj.rotation_euler = (Vector((0, 0, 1.5)) - cam_obj.location).to_track_quat('-Z', 'Y').to_euler()`,
);

replaceIfPresent(
  'create-correct-bound-shot-markers',
  `start_frame = (i * 6) + 1\n        end_frame = start_frame + 59 if i < len(camera_data)-1 else FRAME_END\n        \n        # Add markers for this shot sequence\n        marker_name = f"Shot_{i+1}"`,
  `shot_starts = [1, 97, 169, 217, 265, 301, 337, 385, 433, 481, 529, 553, 577, 601, 649, 685]\n        start_frame = shot_starts[i]\n        marker_name = f"Shot_{i+1:02d}"\n        timeline_marker = bpy.context.scene.timeline_markers.new(name=marker_name, frame=start_frame)\n        timeline_marker.camera = cam_obj`,
);

if (source.includes('mat.diffuse_color = color_hat') || source.includes('mat.diffuse_color = color_coat')) {
  source = source.replace('mat.diffuse_color = color_hat', 'mat.diffuse_color = (color_hat[0], color_hat[1], color_hat[2], 1.0)');
  source = source.replace('mat.diffuse_color = color_coat', 'mat.diffuse_color = (color_coat[0], color_coat[1], color_coat[2], 1.0)');
  changes.push('expand-character-colors-to-rgba');
}

if (source.includes('def setup_scene_structure():') && !/def main\(\):[\s\S]*?setup_scene_structure\(\)/.test(source)) {
  source = source.replace(
    `bpy.ops.object.delete(use_global=False)\n    \n    setup_render_engine()`,
    `bpy.ops.object.delete(use_global=False)\n    \n    setup_scene_structure()\n    setup_render_engine()`,
  );
  changes.push('invoke-defined-collection-setup');
}

await writeFile(outputPath, source, { flag: 'wx' });
const reportPath = path.join(path.dirname(outputPath), `${path.basename(outputPath, '.py')}-adapter.json`);
await writeFile(reportPath, `${JSON.stringify({ input: inputPath, output: outputPath, changes }, null, 2)}\n`, { flag: 'wx' });
console.log(`ADAPTED ${outputPath}`);
