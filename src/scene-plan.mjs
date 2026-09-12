import assert from 'node:assert/strict';

const objectTypes = new Set(['cube', 'sphere', 'cylinder', 'cone', 'plane']);
const animationTypes = new Set(['rotate', 'translate', 'bounce']);

function vector(value, length, label) {
  assert.ok(Array.isArray(value) && value.length === length, `${label} must contain ${length} numbers.`);
  assert.ok(value.every(Number.isFinite), `${label} must contain only finite numbers.`);
}

export function validateScenePlan(plan) {
  assert.equal(plan?.schemaVersion, '0.1.0', 'Unsupported scene-plan schema.');
  assert.ok(typeof plan.title === 'string' && plan.title.length > 0, 'Plan title is required.');
  assert.ok(Number.isInteger(plan.timeline?.fps) && plan.timeline.fps >= 12 && plan.timeline.fps <= 60, 'FPS is out of range.');
  assert.equal(plan.timeline.startFrame, 1, 'Timeline must start at frame 1.');
  assert.ok(Number.isInteger(plan.timeline.endFrame) && plan.timeline.endFrame > 1, 'Timeline end frame is invalid.');
  vector(plan.world?.backgroundColor, 4, 'World backgroundColor');
  vector(plan.camera?.location, 3, 'Camera location');
  vector(plan.camera?.target, 3, 'Camera target');
  assert.ok(Number.isFinite(plan.camera.lensMm) && plan.camera.lensMm >= 12 && plan.camera.lensMm <= 300, 'Camera lens is out of range.');
  assert.ok(Array.isArray(plan.lights) && plan.lights.length <= 16, 'Lights must be an array of at most 16 entries.');
  assert.ok(Array.isArray(plan.objects) && plan.objects.length >= 1 && plan.objects.length <= 64, 'Objects must contain 1–64 entries.');
  const ids = new Set();
  for (const object of plan.objects) {
    assert.match(object.id, /^[a-z][a-z0-9_-]{0,63}$/i, 'Object ID is invalid.');
    assert.ok(!ids.has(object.id), `Duplicate object ID: ${object.id}`); ids.add(object.id);
    assert.ok(objectTypes.has(object.type), `Unsupported object type: ${object.type}`);
    vector(object.location, 3, `${object.id}.location`);
    vector(object.rotationDegrees, 3, `${object.id}.rotationDegrees`);
    vector(object.scale, 3, `${object.id}.scale`);
    vector(object.material?.baseColor, 4, `${object.id}.material.baseColor`);
    if (object.animation) {
      assert.ok(animationTypes.has(object.animation.type), `Unsupported animation: ${object.animation.type}`);
      if (object.animation.axis) assert.ok(['x', 'y', 'z'].includes(object.animation.axis), `Unsupported animation axis: ${object.animation.axis}`);
    }
  }
  assert.ok(['animatic', 'final'].includes(plan.output?.mode), 'Output mode is invalid.');
  assert.ok(Number.isInteger(plan.output.width) && Number.isInteger(plan.output.height), 'Output dimensions must be integers.');
  return plan;
}

export function applyScenePatch(parent, patch) {
  validateScenePlan(parent);
  assert.equal(patch?.schemaVersion, '0.1.0-patch', 'Unsupported patch schema.');
  assert.ok(Array.isArray(patch.changes) && patch.changes.length > 0, 'Patch must contain changes.');
  const next = structuredClone(parent);
  for (const change of patch.changes) {
    if (['timeline', 'world', 'camera', 'lights', 'output'].includes(change.section)) {
      next[change.section] = { ...next[change.section], ...change.value };
    } else if (change.section === 'object') {
      const index = next.objects.findIndex((item) => item.id === change.id);
      assert.notEqual(index, -1, `Unknown object ID: ${change.id}`);
      next.objects[index] = { ...next.objects[index], ...change.value };
    } else {
      throw new Error(`Patch cannot modify section: ${change.section}`);
    }
  }
  return validateScenePlan(next);
}

export function unchangedSections(parent, child, changedSections) {
  const changed = new Set(changedSections.map((item) => item === 'object' ? 'objects' : item));
  return ['timeline', 'world', 'camera', 'lights', 'objects', 'output']
    .filter((section) => !changed.has(section))
    .every((section) => JSON.stringify(parent[section]) === JSON.stringify(child[section]));
}
