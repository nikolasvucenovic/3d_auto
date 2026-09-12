import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const [url, destination, expectedSizeText, expectedSha256, concurrencyText = '8'] = process.argv.slice(2);
if (!url || !destination || !expectedSizeText || !expectedSha256) {
  console.error('Usage: node download-ranges.mjs URL DESTINATION EXPECTED_SIZE EXPECTED_SHA256 [CONCURRENCY]'); process.exit(2);
}
const expectedSize = Number(expectedSizeText);
const concurrency = Math.min(16, Math.max(1, Number(concurrencyText)));
const chunkSize = 256 * 1024 * 1024;
const existingSize = (await stat(destination)).size;
if (existingSize > expectedSize) throw new Error('Destination is larger than the catalog entry.');

const cache = path.join(path.dirname(path.dirname(destination)), '..', '..', '..', 'cache', 'model-chunks', `${path.basename(destination)}-from-${existingSize}`);
await mkdir(cache, { recursive: true });
const chunks = [];
for (let start = existingSize, index = 0; start < expectedSize; start += chunkSize, index += 1) {
  const end = Math.min(expectedSize - 1, start + chunkSize - 1);
  chunks.push({ index, start, end, file: path.join(cache, `${String(index).padStart(4, '0')}-${start}-${end}.part`) });
}

let transferred = 0;
let lastReport = Date.now();
async function acquire(chunk, attempt = 1) {
  const required = chunk.end - chunk.start + 1;
  let present = 0;
  try { present = (await stat(chunk.file)).size; } catch {}
  if (present > required) throw new Error(`Cached chunk is too large: ${chunk.file}`);
  if (present === required) { transferred += present; return; }
  const rangeStart = chunk.start + present;
  try {
    const response = await fetch(url, { headers: { range: `bytes=${rangeStart}-${chunk.end}` }, redirect: 'follow' });
    if (response.status !== 206) throw new Error(`Expected HTTP 206, received ${response.status}`);
    const contentRange = response.headers.get('content-range') || '';
    if (!contentRange.startsWith(`bytes ${rangeStart}-${chunk.end}/`)) throw new Error(`Unexpected Content-Range: ${contentRange}`);
    const progress = new TransformStream({ transform(data, controller) {
      transferred += data.byteLength;
      if (Date.now() - lastReport >= 5000) {
        const total = existingSize + transferred;
        console.log(`${((total / expectedSize) * 100).toFixed(1)}% ${total}/${expectedSize} using ${concurrency} ranges`);
        lastReport = Date.now();
      }
      controller.enqueue(data);
    }});
    await pipeline(Readable.fromWeb(response.body.pipeThrough(progress)), createWriteStream(chunk.file, { flags: present ? 'a' : 'wx' }));
    if ((await stat(chunk.file)).size !== required) throw new Error('Range ended before the requested byte count.');
  } catch (error) {
    if (attempt >= 6) throw error;
    console.warn(`Retrying range ${chunk.index} after: ${error.message}`);
    return acquire(chunk, attempt + 1);
  }
}

let cursor = 0;
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (cursor < chunks.length) { const chunk = chunks[cursor]; cursor += 1; await acquire(chunk); }
}));

for (const chunk of chunks) await pipeline(createReadStream(chunk.file), createWriteStream(destination, { flags: 'a' }));
const finalSize = (await stat(destination)).size;
if (finalSize !== expectedSize) throw new Error(`Size mismatch: expected ${expectedSize}, received ${finalSize}.`);
const hash = createHash('sha256');
await pipeline(createReadStream(destination), hash);
const actualSha256 = hash.digest('hex');
if (actualSha256.toLowerCase() !== expectedSha256.toLowerCase()) throw new Error(`SHA-256 mismatch: ${actualSha256}`);
console.log(`VERIFIED ${actualSha256} ${destination}`);
