import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parsePicksFile, type PublishedItem } from './picks.ts';
import {
  fillWord,
  isPublishedItem,
  rankPicks,
  settingsFor,
  TOP_PICKS,
  volumeGroup,
} from './rank.ts';
import { SETTINGS } from './settings.ts';

// The first real hourly run, copied from the `data` branch (samples/published/README.md).
const published = parsePicksFile(
  JSON.parse(
    readFileSync(new URL('../samples/published/picks.json', import.meta.url), 'utf8'),
  ) as unknown,
);

const item = (overrides: Partial<PublishedItem> = {}): PublishedItem => ({
  id: 1,
  name: 'Test item',
  icon: 'Test item.png',
  members: true,
  limit: 100,
  dailyVolume: 10_000,
  buyPrice: 1_000,
  sellPrice: 1_100,
  taxPerItem: 22,
  profitPerItem: 78,
  buyWindowVolume: 5_000,
  nights: Array<boolean>(14).fill(true),
  fillNights: 14,
  trend: 'flat',
  trendPerDay: 0,
  flags: [],
  ...overrides,
});

describe('rankPicks on the real published run', () => {
  it('puts Purple sweets first for 50m in one slot, at its buy limit', () => {
    const { picks, cashPerSlot } = rankPicks(published.items, {
      cash: 50_000_000,
      freeSlots: 1,
      volume: 'all',
    });
    expect(cashPerSlot).toBe(50_000_000);
    expect(picks).toHaveLength(TOP_PICKS);
    expect(picks[0]).toMatchObject({
      item: { name: 'Purple sweets' },
      quantity: 10_000,
      cost: 10_000 * 3_962,
    });
    expect(picks[0]?.returnShare).toBeCloseTo(172 / 3_962);
  });

  it('splits the cash across the free slots', () => {
    const { picks, cashPerSlot } = rankPicks(published.items, {
      cash: 50_000_000,
      freeSlots: 4,
      volume: 'all',
    });
    expect(cashPerSlot).toBe(12_500_000);
    for (const pick of picks) expect(pick.cost).toBeLessThanOrEqual(12_500_000);
  });

  it('sorts best first and lists only profitable picks', () => {
    const { picks } = rankPicks(published.items, {
      cash: 100_000_000,
      freeSlots: 1,
      volume: 'all',
    });
    for (const pick of picks) expect(pick.profit).toBeGreaterThan(0);
    const ranks = picks.map((pick) => pick.rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => b - a));
  });

  it('High and Low together make All (78 + 131 at 50m in one slot)', () => {
    const choice = { cash: 50_000_000, freeSlots: 1 };
    const high = rankPicks(published.items, { ...choice, volume: 'high' });
    const low = rankPicks(published.items, { ...choice, volume: 'low' });
    expect(high.qualifying).toBe(78);
    expect(low.qualifying).toBe(131);
    expect(high.qualifyingAll).toBe(209);
    for (const pick of high.picks) expect(pick.volume).toBe('high');
    for (const pick of low.picks) expect(pick.volume).toBe('low');
  });

  it('can find fewer than six, and says how many there are in all', () => {
    const ranking = rankPicks(published.items, { cash: 5_000_000, freeSlots: 4, volume: 'low' });
    expect(ranking.picks.length).toBeLessThan(6);
    expect(ranking.qualifyingAll).toBeGreaterThan(ranking.qualifying);
  });
});

describe('rankPicks rules', () => {
  it('skips entries without full details instead of failing', () => {
    const { picks } = rankPicks(
      [{ id: 9, name: 'Old file entry' }, item(), { ...item({ id: 2 }), buyPrice: Number.NaN }],
      { cash: 1_000_000, freeSlots: 1, volume: 'all' },
    );
    expect(picks.map((pick) => pick.item.id)).toEqual([1]);
  });

  it('leaves out items that lose money or that the cash cannot buy one of', () => {
    const { picks } = rankPicks(
      [item({ id: 1, profitPerItem: -5 }), item({ id: 2, buyPrice: 2_000_000 }), item({ id: 3 })],
      { cash: 1_000_000, freeSlots: 1, volume: 'all' },
    );
    expect(picks.map((pick) => pick.item.id)).toEqual([3]);
  });

  it('breaks ties by profit, then by item id', () => {
    const { picks } = rankPicks([item({ id: 5 }), item({ id: 4 })], {
      cash: 1_000_000,
      freeSlots: 1,
      volume: 'all',
    });
    expect(picks.map((pick) => pick.item.id)).toEqual([4, 5]);
  });
});

describe('rankPicks with bad controls', () => {
  it.each([
    ['cash', { cash: Number.NaN, freeSlots: 1 }],
    ['slots', { cash: 50_000_000, freeSlots: Number.NaN }],
  ])('lists nothing when the %s cannot be read', (_what, choice) => {
    expect(rankPicks(published.items, { ...choice, volume: 'all' }).picks).toEqual([]);
  });
});

describe('settingsFor', () => {
  it('uses the values the results file was scored with', () => {
    const settings = settingsFor({ volumeShare: 0.05, nights: 21 });
    expect(settings.volumeShare).toBe(0.05);
    expect(settings.nights).toBe(21);
    expect(settings.highVolumeShare).toBe(SETTINGS.highVolumeShare);
  });

  it('ignores values that are missing, unknown or not numbers', () => {
    const settings = settingsFor({ volumeShare: Number.NaN, unknown: 3 } as never);
    expect(settings).toEqual(SETTINGS);
    expect(settingsFor(undefined)).toEqual(SETTINGS);
  });
});

describe('volumeGroup', () => {
  it('is High up to 2% of what trades in my buy window', () => {
    expect(volumeGroup(20, 1_000)).toBe('high');
    expect(volumeGroup(21, 1_000)).toBe('low');
  });

  it('is Low when nothing trades in my buy window', () => {
    expect(volumeGroup(0, 0)).toBe('low');
  });
});

describe('isPublishedItem', () => {
  it('accepts a full entry from the real run', () => {
    expect(published.items.every(isPublishedItem)).toBe(true);
  });

  it.each([
    ['no icon', { icon: undefined }],
    ['a zero buy limit', { limit: 0 }],
    ['an unknown trend', { trend: 'sideways' }],
    ['nights that are not yes/no', { nights: [1, 0] }],
    ['more fill nights than nights', { fillNights: 15 }],
    ['an unreadable trend', { trendPerDay: Number.NaN }],
  ])('rejects an entry with %s', (_reason, overrides) => {
    expect(isPublishedItem({ ...item(), ...(overrides as Partial<PublishedItem>) })).toBe(false);
  });
});

describe('fillWord', () => {
  it.each([
    [14, 'strong'],
    [10, 'strong'],
    [9, 'typical'],
    [8, 'typical'],
    [7, 'below typical'],
    [0, 'below typical'],
  ])('%i of 14 nights reads as %s', (nights, word) => {
    expect(fillWord(nights)).toBe(word);
  });

  it('judges a share of the measured nights', () => {
    expect(fillWord(10, 21)).toBe('below typical');
    expect(fillWord(15, 21)).toBe('strong');
  });
});
