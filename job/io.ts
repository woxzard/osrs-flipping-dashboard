/**
 * Where a run reads from (the live Wiki or the saved samples) and how its
 * results are written to a folder.
 */
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { LIVE_LIMITS, type Limits, type Results, type Source } from './build.ts';
import { fetch24h, fetchHourly, fetchLatest, fetchMapping } from './wiki.ts';

export const liveSource: Source = {
  mapping: fetchMapping,
  latest: fetchLatest,
  day: fetch24h,
  hourly: fetchHourly,
};

/** The saved samples hold a few hundred items and history for a handful. */
export const SAMPLE_LIMITS: Limits = {
  ...LIVE_LIMITS,
  minItems: 100,
  minCandidates: 5,
  minScored: 5,
};

export async function sampleSource(folder: string): Promise<{ source: Source; capturedAt: Date }> {
  const read = async <T>(name: string) =>
    JSON.parse(await readFile(join(folder, name), 'utf8')) as T;
  const historyIds = (await readdir(join(folder, 'history')))
    .map((name) => Number(name.replace(/\.json$/, '')))
    .filter(Number.isInteger);
  const { capturedAt } = await read<{ capturedAt: string }>('README.json');
  return {
    capturedAt: new Date(capturedAt),
    source: {
      mapping: () => read('mapping.json'),
      latest: () => read('latest.json'),
      day: () => read('24h.json'),
      hourly: (id) => read(`history/${id}.json`),
      historyIds,
    },
  };
}

/** Replaces the folder's results with this run's. */
export async function writeResults(folder: string, results: Results) {
  await rm(join(folder, 'history'), { recursive: true, force: true });
  await mkdir(join(folder, 'history'), { recursive: true });
  for (const history of results.histories) {
    await writeFile(join(folder, 'history', `${history.id}.json`), `${JSON.stringify(history)}\n`);
  }
  // Last, so a half-written folder never has a fresh picks.json.
  await writeFile(join(folder, 'picks.json'), `${JSON.stringify(results.picks)}\n`);
}
