import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileScene } from './scene-compiler.mjs';
import { compileDeterministicPatch } from './scene-revision.mjs';
import { compileLocalPatch, compileLocalScene } from './local-planner.mjs';
import { applyScenePatch, unchangedSections, validateScenePlan } from './scene-plan.mjs';
import { blenderCommand, findBlender, runBlender } from './blender-runner.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const cases = JSON.parse(await readFile(path.join(root, 'benchmarks', 'cases.json'), 'utf8'));
const option = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const plannerOption = option('--planner', 'both');
const caseOption = option('--case', 'all');
const endpoint = option('--endpoint', 'http://127.0.0.1:8080');
const planners = plannerOption === 'both' ? ['deterministic', 'local'] : [plannerOption];
if (!planners.every((item) => ['deterministic', 'local'].includes(item))) throw new Error('Planner must be deterministic, local, or both.');
const requestedCases = new Set(caseOption.split(','));
const selected = caseOption === 'all' ? cases : cases.filter((item) => requestedCases.has(item.id));
if (!selected.length) throw new Error(`Unknown benchmark case: ${caseOption}`);

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const runDirectory = path.join(root, 'benchmark-results', stamp);
await mkdir(path.dirname(runDirectory), { recursive: true });
await mkdir(runDirectory, { recursive: false });
const blenderPath = await findBlender();
const executor = path.join(root, 'blender', 'execute_plan.py');
const results = [];

function checkFacts(plan, expected) {
  const checks = [
    { name: `fps is ${expected.fps}`, pass: plan.timeline.fps === expected.fps, actual: plan.timeline.fps },
    { name: `duration is ${expected.durationSeconds}s`, pass: plan.timeline.durationSeconds === expected.durationSeconds, actual: plan.timeline.durationSeconds },
  ];
  for (const [type, count] of Object.entries(expected.typeCounts)) {
    const actual = plan.objects.filter((item) => item.type === type).length;
    checks.push({ name: `contains exactly ${count} ${type}`, pass: actual === count, actual });
  }
  const animations = plan.objects.filter((item) => item.type === expected.animatedType && item.animation).map((item) => item.animation.type);
  checks.push({ name: `${expected.animatedType} uses ${expected.animationType} animation`, pass: animations.includes(expected.animationType), actual: animations });
  if (expected.horizontalPlane) {
    const rotations = plan.objects.filter((item) => item.type === 'plane').map((item) => item.rotationDegrees);
    checks.push({ name: 'floor plane is horizontal', pass: rotations.some((item) => JSON.stringify(item) === '[0,0,0]'), actual: rotations });
  }
  if (expected.minCameraDistance) {
    const distance = Math.sqrt(plan.camera.location.reduce((sum, value, index) => sum + (value - plan.camera.target[index]) ** 2, 0));
    checks.push({ name: `camera is at least ${expected.minCameraDistance} units from target`, pass: distance >= expected.minCameraDistance, actual: Number(distance.toFixed(2)) });
  }
  return checks;
}

function checkRevision(plan, expected) {
  if (expected.cameraLensMm) return [{ name: `camera lens is ${expected.cameraLensMm}mm`, pass: plan.camera.lensMm === expected.cameraLensMm, actual: plan.camera.lensMm }];
  const object = plan.objects.find((item) => item.type === expected.objectType);
  const color = object?.material.baseColor;
  const isBlue = expected.color === 'blue' && color && color[2] >= 0.5 && color[2] > color[0] && color[2] > color[1];
  return [{ name: `${expected.objectType} has requested ${expected.color} color`, pass: Boolean(isBlue), actual: color }];
}

async function saveJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
}

async function renderPreview(planPath, directory) {
  if (!blenderPath) return null;
  const output = path.join(directory, 'preview'); await mkdir(output, { recursive: true });
  await runBlender(blenderCommand(blenderPath, executor, planPath, output, { preview: true }), (text) => process.stdout.write(text));
  const previewPath = path.join(output, 'preview.png');
  await access(previewPath);
  return previewPath;
}

for (const benchmark of selected) {
  for (const planner of planners) {
    const directory = path.join(runDirectory, benchmark.id, planner); await mkdir(directory, { recursive: true });
    const result = { case: benchmark.id, planner, prompt: benchmark.prompt, status: 'failed', checks: [], revisionChecks: [], usage: {}, error: null };
    try {
      const generated = planner === 'local'
        ? await compileLocalScene(benchmark.prompt, { endpoint, maxTokens: benchmark.maxTokens })
        : { value: compileScene(benchmark.prompt), usage: {} };
      if (generated.raw) await writeFile(path.join(directory, 'model-initial-raw.txt'), generated.raw, { flag: 'wx' });
      result.normalizations = { initial: generated.normalizations || [] };
      const plan = validateScenePlan(generated.value); result.usage.initial = generated.usage;
      const planPath = path.join(directory, 'scene-plan.json'); await saveJson(planPath, plan);
      result.checks = checkFacts(plan, benchmark.expect);
      result.preview = await renderPreview(planPath, directory);

      const generatedPatch = planner === 'local'
        ? await compileLocalPatch(plan, benchmark.revision.request, benchmark.revision.editable, { endpoint })
        : { value: compileDeterministicPatch(plan, benchmark.revision.request), usage: {} };
      if (generatedPatch.raw) await writeFile(path.join(directory, 'model-revision-raw.txt'), generatedPatch.raw, { flag: 'wx' });
      result.normalizations.revision = generatedPatch.normalizations || [];
      result.usage.revision = generatedPatch.usage;
      const revised = applyScenePatch(plan, generatedPatch.value);
      await saveJson(path.join(directory, 'revision-patch.json'), generatedPatch.value);
      const revisedPath = path.join(directory, 'scene-plan-revision-01.json'); await saveJson(revisedPath, revised);
      result.revisionChecks = checkRevision(revised, benchmark.revision.expect);
      result.revisionChecks.push({ name: 'unrequested sections preserved exactly', pass: unchangedSections(plan, revised, generatedPatch.value.changes.map((item) => item.section)), actual: generatedPatch.value.changes.map((item) => item.section) });
      result.revisionPreview = await renderPreview(revisedPath, path.join(directory, 'revision-01'));
      result.status = [...result.checks, ...result.revisionChecks].every((item) => item.pass) ? 'passed' : 'failed';
    } catch (error) { result.error = error.message; }
    await saveJson(path.join(directory, 'result.json'), result); results.push(result);
  }
}

const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
const cards = results.map((result) => {
  const relative = `${result.case}/${result.planner}`;
  const checks = [...result.checks, ...result.revisionChecks].map((item) => `<li class="${item.pass ? 'pass' : 'fail'}">${item.pass ? 'PASS' : 'FAIL'} — ${escape(item.name)}</li>`).join('');
  const images = result.preview ? `<div><img src="${relative}/preview/preview.png"><img src="${relative}/revision-01/preview/preview.png"></div>` : '<p>Blender unavailable: plans were evaluated without renders.</p>';
  return `<article><h2>${escape(result.case)} / ${escape(result.planner)}</h2><p class="${result.status}">${result.status.toUpperCase()}</p><p>${escape(result.prompt)}</p>${images}<ul>${checks}</ul>${result.error ? `<pre>${escape(result.error)}</pre>` : ''}<p><a href="${relative}/scene-plan.json">initial plan</a> · <a href="${relative}/scene-plan-revision-01.json">revision</a> · <a href="${relative}/result.json">result</a></p></article>`;
}).join('');
const html = `<!doctype html><meta charset="utf-8"><title>3D Auto benchmark ${stamp}</title><style>body{font:16px system-ui;background:#111;color:#eee;max-width:1200px;margin:auto;padding:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px}article{background:#1d1d1d;padding:18px;border-radius:10px}img{width:49%}.pass,.passed{color:#69db7c}.fail,.failed{color:#ff8787}a{color:#74c0fc}pre{white-space:pre-wrap}</style><h1>3D Auto benchmark ${stamp}</h1><p>Blender: ${escape(blenderPath || 'not found')} · Local endpoint: ${escape(endpoint)}</p><main>${cards}</main>`;
await writeFile(path.join(runDirectory, 'report.html'), html, { flag: 'wx' });
console.log(`Benchmark report: ${path.join(runDirectory, 'report.html')}`);
for (const result of results) console.log(`${result.case.padEnd(6)} ${result.planner.padEnd(13)} ${result.status}${result.error ? ` — ${result.error}` : ''}`);
