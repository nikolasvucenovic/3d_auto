import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [inputPath, outputPath, failure, endpoint = 'http://127.0.0.1:8080'] = process.argv.slice(2);
if (!inputPath || !outputPath || !failure) throw new Error('Usage: repair-western-local.mjs INPUT OUTPUT FAILURE [ENDPOINT]');
const previous = await readFile(inputPath, 'utf8');
const system = `Return one complete corrected Blender Python script only, without markdown. Preserve all working scene, animation, camera, naming, quality, and safety behavior. Allowed imports: bpy, math, random, os, mathutils. No process, network, dynamic execution, or filesystem delete/move/replace calls. Make the smallest necessary correction, but return the whole self-contained script.`;
const prompt = `Failure from Blender 5.2.1:\n${failure}\n\nPrevious script:\n${previous}`;
const response = await fetch(`${endpoint.replace(/\/$/, '')}/v1/chat/completions`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ model: 'local', temperature: 0, max_tokens: 16000, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }),
});
if (!response.ok) throw new Error(`Local model returned HTTP ${response.status}.`);
const data = await response.json();
const raw = data.choices[0].message.content;
const script = raw.trim().replace(/^```(?:python)?\s*/i, '').replace(/\s*```$/, '');
await writeFile(outputPath, `${script}\n`, { flag: 'wx' });
await writeFile(path.join(path.dirname(outputPath), `${path.basename(outputPath, '.py')}-usage.json`), `${JSON.stringify(data.usage || {}, null, 2)}\n`, { flag: 'wx' });
console.log(`LOCAL SCRIPT REVISION GENERATED ${outputPath}`);
