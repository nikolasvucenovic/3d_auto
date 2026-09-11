import { access, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

async function exists(filePath) {
  try { await access(filePath); return true; } catch { return false; }
}

export async function findBlender(configuredPath = '') {
  const candidates = [configuredPath, process.env.BLENDER_PATH].filter(Boolean);
  const foundation = 'C:\\Program Files\\Blender Foundation';
  try {
    const folders = await readdir(foundation, { withFileTypes: true });
    for (const folder of folders.filter((entry) => entry.isDirectory()).reverse()) {
      candidates.push(path.join(foundation, folder.name, 'blender.exe'));
    }
  } catch {}
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  return null;
}

export function blenderCommand(blenderPath, executorPath, planPath, outputDirectory) {
  return {
    executable: blenderPath || '<BLENDER_PATH>',
    args: ['--background', '--factory-startup', '--python', executorPath, '--', '--plan', planPath, '--output', outputDirectory],
  };
}

export function runBlender(command, onOutput = () => {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command.executable, command.args, { windowsHide: true, shell: false });
    child.stdout.on('data', (chunk) => onOutput(chunk.toString()));
    child.stderr.on('data', (chunk) => onOutput(chunk.toString()));
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Blender exited with code ${code}.`)));
  });
}

