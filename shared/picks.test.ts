import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseHistoryFile, parsePicksFile } from './picks.ts';

describe('parsePicksFile', () => {
  it('accepts the saved sample results file', () => {
    const sample: unknown = JSON.parse(
      readFileSync(new URL('../samples/picks.sample.json', import.meta.url), 'utf8'),
    );
    const picks = parsePicksFile(sample);
    expect(picks.items.length).toBeGreaterThan(0);
    expect(picks.items[0]).toMatchObject({ id: 4151, name: 'Abyssal whip' });
  });

  it('keeps fields it does not know yet', () => {
    const picks = parsePicksFile({ generatedAt: '2026-11-16T06:00:00Z', items: [], extra: 1 });
    expect(picks).toHaveProperty('extra', 1);
  });

  it.each([
    ['not an object', null],
    ['no update time', { items: [] }],
    ['a bad update time', { generatedAt: 'soon', items: [] }],
    ['no item list', { generatedAt: '2026-11-16T06:00:00Z' }],
    ['an item without a name', { generatedAt: '2026-11-16T06:00:00Z', items: [{ id: 1 }] }],
  ])('rejects a file with %s', (_reason, value) => {
    expect(() => parsePicksFile(value)).toThrow();
  });
});

describe('parseHistoryFile', () => {
  const sample: unknown = JSON.parse(
    readFileSync(new URL('../samples/published/history/27226.json', import.meta.url), 'utf8'),
  );

  it('accepts a real history file', () => {
    const history = parseHistoryFile(sample, 27226);
    expect(history.points.length).toBeGreaterThan(300);
  });

  it('refuses a file for another item or without hours', () => {
    expect(() => parseHistoryFile(sample, 1)).toThrow();
    expect(() => parseHistoryFile({ id: 1 }, 1)).toThrow();
  });

  it('drops hours in an unexpected shape and sorts the rest', () => {
    const history = parseHistoryFile(
      {
        id: 1,
        points: [
          [7200, 10, 9, 1, 1],
          [3600, null, 8, 0, 2],
          [10800, 'x', 9, 1, 1],
          [14400, 10],
        ],
      },
      1,
    );
    expect(history.points.map((point) => point[0])).toEqual([3600, 7200]);
  });
});
