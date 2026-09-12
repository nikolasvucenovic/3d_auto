import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

const root = path.resolve(import.meta.dirname, '..', '..');
const bundle = path.join(root, 'offline_bundle');
const catalog = JSON.parse(await readFile(path.join(bundle, 'catalog.json'), 'utf8'));
let failed = false;

for (const component of catalog.components) {
  const file = path.resolve(bundle, component.relativePath);
  if (!file.startsWith(`${bundle}${path.sep}`)) throw new Error(`Catalog path escapes bundle: ${component.relativePath}`);
  try {
    const details = await stat(file);
    if (details.size !== component.size) throw new Error(`size ${details.size}, expected ${component.size}`);
    const hash = createHash('sha256');
    await pipeline(createReadStream(file), hash);
    const actual = hash.digest('hex');
    if (actual !== component.sha256.toLowerCase()) throw new Error(`SHA-256 ${actual}, expected ${component.sha256}`);
    console.log(`VERIFIED ${component.id}`);
  } catch (error) {
    failed = true; console.error(`FAILED ${component.id}: ${error.message}`);
  }
}

if (failed) process.exitCode = 1;
