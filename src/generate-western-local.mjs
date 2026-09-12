import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [briefPath, outputPath, endpoint = 'http://127.0.0.1:8080'] = process.argv.slice(2);
if (!briefPath || !outputPath) throw new Error('Usage: generate-western-local.mjs BRIEF OUTPUT [ENDPOINT]');
const brief = await readFile(briefPath, 'utf8');
const system = `Write one complete Blender 5.2 Python script only. No markdown fences or explanation. Follow every brief requirement. Keep the script compact, below 900 lines, and never repeat a setting or block. Allowed imports: bpy, math, random, os, and mathutils only. Use os only for path joining; never call process, network, delete, move, rename, replace, shell, eval, exec, compile, open, or dynamic import APIs. Save only western_standoff.blend beside this script. Use reusable functions and no placeholders. Blender 5.2 may reject FFMPEG and removed old RenderSettings bake/antialiasing properties: guard FFMPEG with try/except and do not set obsolete render properties. Keep preview fast. End by calling bpy.ops.wm.save_as_mainfile and printing the required summary.`;
const response = await fetch(`${endpoint.replace(/\/$/, '')}/v1/chat/completions`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ model: 'local', seed: 42, temperature: 0.15, top_p: 0.9, repeat_penalty: 1.12, max_tokens: 28000, messages: [
    { role: 'system', content: system },
    { role: 'user', content: brief },
  ] }),
});
if (!response.ok) throw new Error(`Local model returned HTTP ${response.status}.`);
const data = await response.json();
const raw = data.choices[0].message.content;
const script = raw.trim().replace(/^```(?:python)?\s*/i, '').replace(/\s*```$/, '');
await writeFile(outputPath, `${script}\n`, { flag: 'wx' });
const metadata = { finish_reason: data.choices[0].finish_reason ?? null, ...(data.usage || {}) };
await writeFile(path.join(path.dirname(outputPath), `${path.basename(outputPath, '.py')}-usage.json`), `${JSON.stringify(metadata, null, 2)}\n`, { flag: 'wx' });
console.log(`LOCAL SCRIPT GENERATED ${outputPath}`);
