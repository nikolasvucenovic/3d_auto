import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [codexManifestPath, localManifestPath, outputDirectory, adapterReportPath, usagePath] = process.argv.slice(2);
if (!codexManifestPath || !localManifestPath || !outputDirectory) {
  throw new Error('Usage: western-comparison-report.mjs CODEX_EVIDENCE LOCAL_EVIDENCE OUTPUT_DIR');
}

const codex = JSON.parse(await readFile(codexManifestPath, 'utf8'));
const local = JSON.parse(await readFile(localManifestPath, 'utf8'));
const adapter = adapterReportPath ? JSON.parse(await readFile(adapterReportPath, 'utf8')) : { changes: [] };
const adapterChangeCount = adapter.changes.length;
const usage = usagePath ? JSON.parse(await readFile(usagePath, 'utf8')) : {};
const codexUniqueCameras = new Set(codex.frames.map((frame) => frame.camera)).size;
const localUniqueCameras = new Set(local.frames.map((frame) => frame.camera)).size;
if (codex.frames.length !== 16 || local.frames.length !== 16) throw new Error('Both evidence sets must contain 16 frames.');

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
await mkdir(outputDirectory, { recursive: false });
await mkdir(path.join(outputDirectory, 'codex'), { recursive: false });
await mkdir(path.join(outputDirectory, 'local'), { recursive: false });

for (const [kind, manifest, manifestPath] of [['codex', codex, codexManifestPath], ['local', local, localManifestPath]]) {
  for (const frame of manifest.frames) {
    await copyFile(path.join(path.dirname(manifestPath), frame.file), path.join(outputDirectory, kind, frame.file));
  }
}

const cards = codex.frames.map((left, index) => {
  const right = local.frames[index];
  return `<section class="shot"><h2>Evidence pair ${index + 1}</h2><div class="pair">
    <figure><div class="label codex">CODEX</div><img src="codex/${esc(left.file)}"><figcaption>Frame ${left.frame} · ${esc(left.camera)}</figcaption></figure>
    <figure><div class="label local">LOCAL MODEL + ADAPTER</div><img src="local/${esc(right.file)}"><figcaption>Frame ${right.frame} · ${esc(right.camera)}</figcaption></figure>
  </div></section>`;
}).join('\n');

const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Western Standoff Comparison</title><style>
:root{color-scheme:dark;background:#111;color:#eee;font:16px system-ui,sans-serif}body{max-width:1500px;margin:auto;padding:28px}h1{margin-bottom:8px}.lede{color:#bbb;max-width:1000px}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:24px 0}.metric{background:#1d1d1d;border:1px solid #383838;border-radius:10px;padding:16px}.metric b{display:block;font-size:1.5rem}.shot{border-top:1px solid #333;padding:22px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{position:relative;margin:0;background:#1b1b1b;padding:10px;border-radius:9px}img{display:block;width:100%;aspect-ratio:2.39;object-fit:contain;background:#000}.label{position:absolute;top:18px;left:18px;padding:5px 9px;border-radius:5px;font-weight:800;letter-spacing:.05em}.codex{background:#126a4a}.local{background:#985c00}figcaption{padding:9px 2px 1px;color:#ccc}@media(max-width:800px){.pair{grid-template-columns:1fr}}
</style></head><body><h1>Western Standoff: rendered comparison</h1>
<p class="lede">Both columns come from Blender 5.2.1 evidence renders. The local model generated its script offline using Qwen3-Coder-30B-A3B-Instruct Q5_K_M. Its successful run needed a deterministic, logged ${adapterChangeCount}-change Blender compatibility and marker-binding adapter. Earlier raw attempts remain preserved.</p>
<div class="metrics"><div class="metric"><b>${codex.objects}</b>Codex objects</div><div class="metric"><b>${local.objects}</b>Local objects</div><div class="metric"><b>${codexUniqueCameras} / ${localUniqueCameras}</b>Codex / local unique cameras</div><div class="metric"><b>${usage.total_tokens ?? 'unknown'}</b>Local generation tokens</div><div class="metric"><b>${adapterChangeCount}</b>Logged adapter changes</div><div class="metric"><b>24 fps</b>Frames 1–720</div></div>
<p class="lede">A structural render pass does not imply full creative compliance. Inspect each pair for composition, readable characters, town detail, lighting, and shot-specific storytelling.</p>${cards}</body></html>`;

await writeFile(path.join(outputDirectory, 'report.html'), html, { flag: 'wx' });
await writeFile(path.join(outputDirectory, 'comparison.json'), `${JSON.stringify({ codex, local, usage, adapter, codexUniqueCameras, localUniqueCameras }, null, 2)}\n`, { flag: 'wx' });
console.log(`REPORT ${path.join(outputDirectory, 'report.html')}`);
