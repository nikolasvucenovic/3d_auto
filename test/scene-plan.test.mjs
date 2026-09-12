import test from 'node:test';
import assert from 'node:assert/strict';
import { compileScene } from '../src/scene-compiler.mjs';
import { applyScenePatch, unchangedSections, validateScenePlan } from '../src/scene-plan.mjs';

test('validates compiler output and applies an isolated revision', () => {
  const parent = validateScenePlan(compileScene('A red sphere spins for 4 seconds at 24 fps.'));
  const child = applyScenePatch(parent, {
    schemaVersion: '0.1.0-patch',
    changes: [{ section: 'camera', value: { lensMm: 70 } }],
  });
  assert.equal(child.camera.lensMm, 70);
  assert.ok(unchangedSections(parent, child, ['camera']));
  assert.equal(parent.camera.lensMm, 50);
});

test('rejects patches outside the approved scene sections', () => {
  const parent = compileScene('A cube.');
  assert.throws(() => applyScenePatch(parent, {
    schemaVersion: '0.1.0-patch', changes: [{ section: 'script', value: 'anything' }],
  }), /cannot modify section/);
});
