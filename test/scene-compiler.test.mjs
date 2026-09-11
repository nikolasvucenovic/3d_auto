import test from 'node:test';
import assert from 'node:assert/strict';
import { compileScene } from '../src/scene-compiler.mjs';

test('compiles objects, layout, animation, and timeline from direction', () => {
  const plan = compileScene('A large red sphere on the left spins. A blue cube on the right rises. 8 seconds at 24 fps.');
  assert.equal(plan.objects.length, 2);
  assert.deepEqual(plan.objects[0].material.baseColor, [0.8, 0.03, 0.03, 1]);
  assert.equal(plan.objects[0].location[0], -3);
  assert.equal(plan.objects[0].animation.type, 'rotate');
  assert.deepEqual(plan.objects[1].material.baseColor, [0.03, 0.15, 0.8, 1]);
  assert.equal(plan.objects[1].animation.type, 'translate');
  assert.equal(plan.timeline.endFrame, 192);
});

test('falls back to a safe default object and clamps output mode', () => {
  const plan = compileScene('A mysterious abstract shot', 'unknown');
  assert.equal(plan.objects[0].type, 'cube');
  assert.equal(plan.output.mode, 'animatic');
});
