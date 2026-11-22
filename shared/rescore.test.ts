import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseHistoryFile, type PicksFile, type PublishedItem } from './picks.ts';
import { isPublishedItem, settingsFor } from './rank.ts';
import { endsNextDay, hoursProblem, rescoreItem } from './rescore.ts';

const read = (path: string) =>
  JSON.parse(
    readFileSync(new URL(`../samples/published/${path}`, import.meta.url), 'utf8'),
  ) as unknown;
const picks = read('picks.json') as PicksFile;
const settings = settingsFor(picks.settings);
const SAMPLE_IDS = [27226, 10476, 19707];

const sample = (id: number) => {
  const item = picks.items.find((entry) => entry.id === id);
  if (!item || !isPublishedItem(item)) throw new Error(`no item ${id}`);
  return { item, history: parseHistoryFile(read(`history/${id}.json`), id) };
};

describe('rescoreItem', () => {
  it.each(SAMPLE_IDS)('gives the job’s own numbers with the job’s hours (%i)', (id) => {
    const { item, history } = sample(id);
    const again = rescoreItem(item, history, picks.generatedAt, settings);
    expect(again).toEqual(item);
  });

  it('moves the prices and nights when the hours change', () => {
    const { item, history } = sample(10476);
    const late = {
      ...settings,
      buyStartHour: 2,
      buyEndHour: 10,
      sellStartHour: 10,
      sellEndHour: 20,
    };
    const again = rescoreItem(item, history, picks.generatedAt, late) as PublishedItem;
    expect(again).not.toBeNull();
    expect(again.nights).toHaveLength(item.nights.length);
    expect([again.buyPrice, again.sellPrice, again.buyWindowVolume]).not.toEqual([
      item.buyPrice,
      item.sellPrice,
      item.buyWindowVolume,
    ]);
    expect(again.limit).toBe(item.limit); // what isn't about the hours stays
  });

  it('keeps the job’s "stale" flag, which the history can’t tell', () => {
    const { item, history } = sample(27226);
    const stale = { ...item, flags: [...item.flags, 'stale' as const] };
    expect(rescoreItem(stale, history, picks.generatedAt, settings)?.flags).toContain('stale');
  });

  it('gives nothing when the history is too short for these hours', () => {
    const { item, history } = sample(27226);
    const short = { ...history, points: history.points.slice(-48) };
    expect(rescoreItem(item, short, picks.generatedAt, settings)).toBeNull();
  });
});

const hours = (bed: number, wake: number, stop: number) => ({
  buyStartHour: bed,
  buyEndHour: wake,
  sellStartHour: wake,
  sellEndHour: stop,
});

describe('window hours', () => {
  it('accept the default and other sensible hours', () => {
    expect(hoursProblem(hours(22, 7, 22))).toBeNull();
    expect(hoursProblem(hours(0, 8, 23))).toBeNull();
    expect(hoursProblem(hours(23, 6, 12))).toBeNull();
  });

  it('refuse empty windows and windows past the next night', () => {
    expect(hoursProblem(hours(22, 22, 7))).toBe('Buying needs at least an hour.');
    expect(hoursProblem(hours(22, 7, 7))).toBe('Selling needs at least an hour.');
    // 9 hours buying + 16 selling = 25.
    expect(hoursProblem(hours(22, 7, 23))).toMatch(/must fit in 24 hours/);
    expect(hoursProblem({ ...hours(22, 7, 22), buyStartHour: 24 })).toBe(
      'Choose a whole hour for each.',
    );
  });

  it('know when a night ends the next day', () => {
    expect(endsNextDay(hours(22, 7, 22))).toBe(true);
    expect(endsNextDay(hours(2, 10, 20))).toBe(false);
    expect(endsNextDay(hours(0, 8, 23))).toBe(false);
  });
});
