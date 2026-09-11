import http from 'node:http';
import { readFile, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileScene } from './scene-compiler.mjs';
import { createJob, writeNewJson, appendEvent } from './versioning.mjs';
import { findBlender, blenderCommand, runBlender } from './blender-runner.mjs';

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(sourceDirectory);
const publicDirectory = path.join(root, 'public');
const executorPath = path.join(root, 'blender', 'execute_plan.py');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

async function readConfig() {
  try { return JSON.parse(await readFile(path.join(root, 'config.local.json'), 'utf8')); }
  catch { return {}; }
}

function sendJson(response, status, value) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(value));
}

async function readBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error('Request is too large.');
  }
  return JSON.parse(body || '{}');
}

async function createSceneJob(request, response, config) {
  try {
    const body = await readBody(request);
    const prompt = String(body.prompt || '').trim();
    const mode = body.outputMode === 'final' ? 'final' : 'animatic';
    const plan = compileScene(prompt, mode);
    const job = await createJob(root, prompt);
    const requestPath = path.join(job.directory, 'request.json');
    const planPath = path.join(job.directory, 'scene-plan.json');
    const outputDirectory = path.join(job.directory, 'output');
    await writeNewJson(requestPath, { prompt, outputMode: mode, createdAt: new Date().toISOString() });
    await writeNewJson(planPath, plan);
    await appendEvent(job.directory, 1, 'created', { objectCount: plan.objects.length });

    const blenderPath = await findBlender(config.blenderPath);
    const command = blenderCommand(blenderPath, executorPath, planPath, outputDirectory);
    if (!blenderPath) {
      await appendEvent(job.directory, 2, 'planned', { reason: 'Blender executable was not found.' });
      return sendJson(response, 202, { id: job.id, status: 'planned', plan, command, message: 'Plan saved. Configure Blender to render it.' });
    }

    const logPath = path.join(job.directory, 'blender.log');
    await appendEvent(job.directory, 2, 'render-started', { blenderPath });
    try {
      await runBlender(command, (text) => appendFile(logPath, text));
      await appendEvent(job.directory, 3, 'render-completed');
      return sendJson(response, 201, { id: job.id, status: 'rendered', plan, outputDirectory });
    } catch (error) {
      await appendEvent(job.directory, 3, 'render-failed', { message: error.message });
      return sendJson(response, 500, { id: job.id, status: 'failed', plan, message: error.message });
    }
  } catch (error) {
    return sendJson(response, 400, { status: 'error', message: error.message });
  }
}

async function serveStatic(request, response) {
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  const resolved = path.resolve(publicDirectory, relative);
  if (!resolved.startsWith(`${path.resolve(publicDirectory)}${path.sep}`) && resolved !== path.join(publicDirectory, 'index.html')) {
    response.writeHead(403); response.end('Forbidden'); return;
  }
  try {
    const content = await readFile(resolved);
    response.writeHead(200, { 'content-type': mime[path.extname(resolved)] || 'application/octet-stream' });
    response.end(content);
  } catch {
    response.writeHead(404); response.end('Not found');
  }
}

const config = await readConfig();
const port = Number(process.env.PORT || config.port || 4312);
const server = http.createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/api/readiness') {
    const blenderPath = await findBlender(config.blenderPath);
    return sendJson(response, 200, { offline: true, blender: { available: Boolean(blenderPath), path: blenderPath }, gpu: 'Detected separately by system tools' });
  }
  if (request.method === 'POST' && request.url === '/api/jobs') return createSceneJob(request, response, config);
  if (request.method === 'GET') return serveStatic(request, response);
  response.writeHead(405); response.end('Method not allowed');
});

server.listen(port, '127.0.0.1', () => {
  console.log(`3D Auto is running at http://127.0.0.1:${port}`);
  console.log('Local-only mode: no external network interface is exposed.');
});

