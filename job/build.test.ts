import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parsePicksFile } from '../shared/picks.ts';
import { SETTINGS } from '../shared/settings.ts';
import { buildResults, type Source } from './build.ts';
import { SAMPLE_LIMITS, sampleSource, writeResults } from './io.ts';

const SAMPLES = fileURLToPath(new URL('../samples/', import.meta.url));
const { source, capturedAt } = await sampleSource(SAMPLES);
const run = (changes: Partial<Source> = {}, now = capturedAt, limits = SAMPLE_LIMITS) =>
  buildResults({ ...source, ...changes }, now, SETTINGS, limits);

describe('buildResults on the saved samples', () => {
  it('scores every item that has history, best first', async () => {
    const { picks, histories } = await run();
    expect(picks.generatedAt).toBe(capturedAt.toISOString());
    expect(picks.items).toHaveLength(8);
    expect(picks.items[0]).toMatchObject({ id: 13190, name: 'Old school bond', taxPerItem: 0 });
    expect(picks.items.map((item) => item.id).sort()).toEqual(
      histories.map((history) => history.id).sort(),
    );
    expect(picks.settings).toMatchObject({ buyStartHour: 22, buyEndHour: 7, buyLevel: 0.7 });
  });

  it('publishes a file the page accepts', async () => {
    const { picks } = await run();
    const reread = parsePicksFile(JSON.parse(JSON.stringify(picks)));
    expect(reread.items[0]).toMatchObject({ limit: 100, icon: 'Old school bond.png' });
  });

  it('keeps about 16 days of hourly history per item, oldest first', async () => {
    const { histories } = await run();
    const whip = histories.find((history) => history.id === 4151);
    const times = whip?.points.map((point) => point[0]) ?? [];
    expect(times.length).toBeGreaterThan(300);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(times[0]).toBeGreaterThanOrEqual(capturedAt.getTime() / 1000 - 16 * 86_400);
  });

  it('asks for history only for the candidates, up to the cap', async () => {
    const asked: number[] = [];
    const hourly: Source['hourly'] = (id) => {
      asked.push(id);
      return source.hourly(id);
    };
    await run({ hourly }, capturedAt, { ...SAMPLE_LIMITS, minCandidates: 1, minScored: 1 });
    expect(asked).toHaveLength(8);

    asked.length = 0;
    await buildResults(
      { ...source, hourly },
      capturedAt,
      { ...SETTINGS, historyCap: 3 },
      {
        ...SAMPLE_LIMITS,
        minCandidates: 1,
        minScored: 1,
      },
    );
    // The three with the most gp traded in the last 24 hours.
    expect(asked).toHaveLength(3);
  });

  it('skips items without a buy limit or without trades on both sides', async () => {
    const mapping = (await source.mapping()).map((item) =>
      item.id === 4151 ? { ...item, limit: undefined } : item,
    );
    const day = await source.day();
    const quiet = { ...day, data: { ...day.data, 536: { ...day.data[536]!, lowPriceVolume: 0 } } };
    const { picks } = await run({ mapping: async () => mapping, day: async () => quiet });
    const ids = picks.items.map((item) => item.id);
    expect(ids).not.toContain(4151);
    expect(ids).not.toContain(536);
    expect(ids).toHaveLength(6);
  });
});

describe('buildResults when the Wiki fails or returns nonsense', () => {
  it('fails when a request fails', async () => {
    const down = () => Promise.reject(new Error('Wiki prices API /latest: HTTP 503'));
    await expect(run({ latest: down })).rejects.toThrow('HTTP 503');
  });

  it('fails on an empty or tiny item list', async () => {
    await expect(run({ mapping: async () => [] })).rejects.toThrow('nonsense');
  });

  it('fails when the price lists are empty', async () => {
    await expect(run({ latest: async () => ({ data: {} }) })).rejects.toThrow('nonsense');
    await expect(run({ day: async () => ({ data: {}, timestamp: 0 }) })).rejects.toThrow(
      'nonsense',
    );
  });

  it('fails when the prices are stuck in the past', async () => {
    const later = new Date(capturedAt.getTime() + 5 * 3_600_000);
    await expect(run({}, later)).rejects.toThrow('hours old');
  });

  it('fails when too few items qualify or can be scored', async () => {
    await expect(run({}, capturedAt, { ...SAMPLE_LIMITS, minCandidates: 9 })).rejects.toThrow(
      'candidates',
    );
    await expect(run({ hourly: async () => ({ data: [] }) })).rejects.toThrow('could be scored');
  });

  it('carries on without an item or two whose history fails', async () => {
    const hourly: Source['hourly'] = (id) =>
      id === 4151 ? Promise.reject(new Error('timeout')) : source.hourly(id);
    const { picks, summary } = await run({ hourly }, capturedAt, {
      ...SAMPLE_LIMITS,
      maxHistoryFailures: 0.2,
    });
    expect(picks.items).toHaveLength(7);
    expect(summary).toContain('1 history requests failed');
  });

  it('fails when many history requests fail', async () => {
    const hourly = () => Promise.reject(new Error('timeout'));
    await expect(run({ hourly })).rejects.toThrow('Too many history requests failed');
  });
});

describe('writeResults', () => {
  it('writes picks.json and one history file per item, replacing an earlier run', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'osrs-job-test-'));
    try {
      const results = await run();
      await writeResults(folder, results);
      expect((await readdir(join(folder, 'history'))).length).toBe(8);

      const fewer = { ...results, histories: results.histories.slice(0, 2) };
      await writeResults(folder, fewer);
      expect((await readdir(join(folder, 'history'))).length).toBe(2);
      const picks: unknown = JSON.parse(await readFile(join(folder, 'picks.json'), 'utf8'));
      expect(parsePicksFile(picks).items).toHaveLength(8);
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  });
});
