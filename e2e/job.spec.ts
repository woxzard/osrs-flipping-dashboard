import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { buildResults } from '../job/build.ts';
import { SAMPLE_LIMITS, sampleSource, writeResults } from '../job/io.ts';

const SAMPLES = fileURLToPath(new URL('../samples/', import.meta.url));
const EXPECTED = join(SAMPLES, 'expected');

/** Every file under a folder, as "relative/path" → contents. */
async function filesIn(folder: string): Promise<Record<string, string>> {
  const names = (await readdir(folder, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
  const files: Record<string, string> = {};
  for (const name of names.sort()) {
    files[name.slice(folder.length + 1).replaceAll('\\', '/')] = await readFile(name, 'utf8');
  }
  return files;
}

// The data job, end to end on the saved API responses: no browser, no network.
// After a deliberate change to the scoring or the samples, refresh the
// expected result with `npm run samples:expected` and read the diff.
test('a sample run of the data job matches the saved expected result', async () => {
  const { source, capturedAt } = await sampleSource(SAMPLES);
  const out = await mkdtemp(join(tmpdir(), 'osrs-job-'));
  try {
    await writeResults(out, await buildResults(source, capturedAt, undefined, SAMPLE_LIMITS));
    const actual = await filesIn(out);
    const expected = await filesIn(EXPECTED);

    expect(Object.keys(actual)).toEqual(Object.keys(expected));
    expect(JSON.parse(actual['picks.json'] ?? 'null')).toEqual(
      JSON.parse(expected['picks.json'] ?? 'null'),
    );
    expect(actual).toEqual(expected);
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
