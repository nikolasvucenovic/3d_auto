import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 42) || 'scene';
}

function timestamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export async function createJob(root, prompt) {
  const jobsRoot = path.join(root, 'jobs');
  await mkdir(jobsRoot, { recursive: true });
  const stem = `${timestamp()}_${slugify(prompt)}`;

  for (let revision = 1; revision < 1000; revision += 1) {
    const suffix = revision === 1 ? '' : `_v${String(revision).padStart(3, '0')}`;
    const id = `${stem}${suffix}`;
    const directory = path.join(jobsRoot, id);
    try {
      await mkdir(directory, { recursive: false });
      await mkdir(path.join(directory, 'events'));
      await mkdir(path.join(directory, 'output'));
      return { id, directory };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
  throw new Error('Could not allocate a unique job directory.');
}

export async function writeNewJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
}

export async function appendEvent(jobDirectory, sequence, type, details = {}) {
  const event = {
    sequence,
    type,
    at: new Date().toISOString(),
    ...details,
  };
  const name = `${String(sequence).padStart(3, '0')}-${type}.json`;
  await writeNewJson(path.join(jobDirectory, 'events', name), event);
}

