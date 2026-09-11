import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const [url, destination, expectedSizeText, expectedSha256] = process.argv.slice(2);
if (!url || !destination || !expectedSizeText || !expectedSha256) {
  console.error('Usage: node download.mjs URL DESTINATION EXPECTED_SIZE EXPECTED_SHA256');
  process.exit(2);
}

const expectedSize = Number(expectedSizeText);
await mkdir(path.dirname(destination), { recursive: true });
let currentSize = 0;
try { currentSize = (await stat(destination)).size; } catch {}

if (currentSize > expectedSize) {
  throw new Error(`Existing file is larger than the catalog entry: ${destination}`);
}

if (currentSize < expectedSize) {
  const headers = currentSize > 0 ? { range: `bytes=${currentSize}-` } : {};
  const response = await fetch(url, { headers, redirect: 'follow' });
  if (!response.ok) throw new Error(`Download failed with HTTP ${response.status}: ${url}`);
  if (currentSize > 0 && response.status !== 206) {
    throw new Error(`Server would not resume the existing ${currentSize}-byte file. Refusing to overwrite it.`);
  }

  let received = currentSize;
  let lastReport = Date.now();
  const progress = new TransformStream({
    transform(chunk, controller) {
      received += chunk.byteLength;
      if (Date.now() - lastReport >= 5000) {
        const percent = ((received / expectedSize) * 100).toFixed(1);
        console.log(`${percent}% ${received}/${expectedSize} ${path.basename(destination)}`);
        lastReport = Date.now();
      }
      controller.enqueue(chunk);
    },
  });

  await pipeline(
    Readable.fromWeb(response.body.pipeThrough(progress)),
    createWriteStream(destination, { flags: currentSize > 0 ? 'a' : 'wx' }),
  );
}

const finalSize = (await stat(destination)).size;
if (finalSize !== expectedSize) throw new Error(`Size mismatch: expected ${expectedSize}, received ${finalSize}.`);

const hash = createHash('sha256');
await pipeline(createReadStream(destination), hash);
const actualSha256 = hash.digest('hex');
if (actualSha256.toLowerCase() !== expectedSha256.toLowerCase()) {
  throw new Error(`SHA-256 mismatch for ${destination}. Expected ${expectedSha256}; received ${actualSha256}.`);
}
console.log(`VERIFIED ${actualSha256} ${destination}`);

