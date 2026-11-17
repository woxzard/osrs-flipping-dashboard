import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cashPerSlot, scoreItem, sizePick, type HourPoint, type Sizable } from './scoring.ts';
import { SETTINGS } from './settings.ts';

const HOUR = 3600;
const DAY = 24 * HOUR;
const seconds = (iso: string) => Date.parse(iso) / 1000;

/** 02:00 in Manila: the newest finished night ran 15 Nov 22:00 → 16 Nov 22:00 Manila. */
const NOW = new Date('2026-11-16T18:00:00Z');
const LAST_NIGHT_START = seconds('2026-11-15T14:00:00Z');

type Tweak = (night: number, hour: number) => Partial<HourPoint> | 'no trades' | undefined;

/**
 * Hourly history covering `nights` finished nights and the hours since. Every
 * hour trades 100 each way at 970 (sold into buy offers) and 1,030 (bought
 * from sell offers), so the level is exactly 1,000 unless `tweak` changes an
 * hour. `night` 0 is the oldest; `hour` 0 is 22:00 Manila, 9 is 07:00.
 */
function makeHistory(nights: number, tweak: Tweak = () => undefined): HourPoint[] {
  const start = LAST_NIGHT_START - (nights - 1) * DAY;
  const points: HourPoint[] = [];
  for (let timestamp = start; timestamp < NOW.getTime() / 1000; timestamp += HOUR) {
    const night = Math.floor((timestamp - start) / DAY);
    const change = night < nights ? tweak(night, ((timestamp - start) % DAY) / HOUR) : undefined;
    if (change === 'no trades') continue;
    points.push({
      timestamp,
      avgHighPrice: 1030,
      highPriceVolume: 100,
      avgLowPrice: 970,
      lowPriceVolume: 100,
      ...change,
    });
  }
  return points;
}

/** A one-hour dip (or rise), weightless so the night's average level stays at 1,000. */
const low = (price: number) => ({ avgLowPrice: price, lowPriceVolume: 0, highPriceVolume: 0 });
const high = (price: number) => ({ avgHighPrice: price, highPriceVolume: 0, lowPriceVolume: 0 });

describe('scoreItem: windows in Manila time', () => {
  it('counts a dip inside the buy window (22:00–07:00) and ignores one outside it', () => {
    const inside = scoreItem(
      1,
      makeHistory(14, (_night, hour) => (hour === 8 ? low(900) : undefined)), // 06:00
      NOW,
    );
    const outside = scoreItem(
      1,
      makeHistory(14, (_night, hour) => (hour === 9 ? low(900) : undefined)), // 07:00
      NOW,
    );
    expect(inside?.buyPrice).toBe(900);
    expect(outside?.buyPrice).toBe(970);
  });

  it('counts a rise inside the sell window (07:00–22:00) and ignores one during the night', () => {
    const inside = scoreItem(
      1,
      makeHistory(14, (_night, hour) => (hour === 23 ? high(1100) : undefined)), // 21:00
      NOW,
    );
    const outside = scoreItem(
      1,
      makeHistory(14, (_night, hour) => (hour === 0 ? high(1100) : undefined)), // 22:00
      NOW,
    );
    expect(inside?.sellPrice).toBe(1100);
    expect(outside?.sellPrice).toBe(1030);
  });

  it('leaves out the night that is still running', () => {
    // A crash in the hours after the last finished night must not count as a night.
    const history = makeHistory(14).map((point) =>
      point.timestamp >= LAST_NIGHT_START + DAY ? { ...point, ...low(500) } : point,
    );
    const score = scoreItem(1, history, NOW);
    expect(score?.nights).toHaveLength(14);
    expect(score?.buyPrice).toBe(970);
  });

  it('measures 14 nights when the history is longer', () => {
    expect(scoreItem(1, makeHistory(20), NOW)?.nights).toHaveLength(14);
  });
});

describe('scoreItem: the 70% levels', () => {
  // Ten nights; night n dips to 970 − 10n gp, so each night goes deeper.
  const history = makeHistory(10, (night, hour) =>
    hour === 3 ? low(970 - 10 * night) : undefined,
  );
  const score = scoreItem(1, history, NOW);

  it('suggests a buy price reached on 7 of the 10 nights', () => {
    // Nights 3–9 dipped to 940 or lower; nights 0–2 did not.
    expect(score?.buyPrice).toBe(940);
    expect(score?.nights).toEqual([false, false, false, true, true, true, true, true, true, true]);
    expect(score?.fillNights).toBe(7);
  });

  it('works out tax and profit per item from the suggested prices', () => {
    expect(score).toMatchObject({ sellPrice: 1030, taxPerItem: 20, profitPerItem: 70 });
  });

  it('suggests a sell price reached on 7 of 10 days, and a night needs both sides to hit', () => {
    // Day n peaks at 1,030 + 10n; the buy side dips to 950 on the first 5 nights only.
    const both = scoreItem(
      1,
      makeHistory(10, (night, hour) =>
        hour === 12 ? high(1030 + 10 * night) : hour === 3 && night < 5 ? low(950) : undefined,
      ),
      NOW,
    );
    expect(both?.sellPrice).toBe(1060);
    expect(both?.buyPrice).toBe(970);
    expect(both?.fillNights).toBe(7); // every night reaches 970; days 3–9 reach 1,060
  });

  it('applies the levels to today’s price, so a drifting item gets sensible prices', () => {
    // Same pattern at twice the price over the last 24 hours.
    const doubled = history.map((point) =>
      point.timestamp >= NOW.getTime() / 1000 - DAY
        ? { ...point, avgHighPrice: 2060, avgLowPrice: 1940 }
        : point,
    );
    expect(scoreItem(1, doubled, NOW)?.buyPrice).toBe(1880);
  });
});

describe('scoreItem: gaps and short history', () => {
  it('treats a night with no trades in the buy window as a miss', () => {
    const history = makeHistory(14, (night, hour) =>
      night >= 12 && hour < 9 ? { avgLowPrice: null, lowPriceVolume: 0 } : undefined,
    );
    const score = scoreItem(1, history, NOW);
    expect(score?.nights.slice(-2)).toEqual([false, false]);
    expect(score?.fillNights).toBe(12);
  });

  it('copes with hours missing from the history altogether', () => {
    const history = makeHistory(14, (night, hour) =>
      night % 2 === 0 && hour % 3 !== 0 ? 'no trades' : undefined,
    );
    expect(scoreItem(1, history, NOW)).toMatchObject({ buyPrice: 970, sellPrice: 1030 });
  });

  it('gives no score when prices are too rare to find a 70% level', () => {
    const history = makeHistory(14, (night, hour) =>
      night < 6 && hour < 9 ? { avgLowPrice: null, lowPriceVolume: 0 } : undefined,
    );
    expect(scoreItem(1, history, NOW)).toBeNull();
  });

  it('flags items with under 14 nights of history, and still scores them', () => {
    const score = scoreItem(1, makeHistory(9), NOW);
    expect(score?.nights).toHaveLength(9);
    expect(score?.flags).toContain('short-history');
    expect(scoreItem(1, makeHistory(14), NOW)?.flags).not.toContain('short-history');
  });

  it('gives no score with fewer than 5 nights, or no history', () => {
    expect(scoreItem(1, makeHistory(4), NOW)).toBeNull();
    expect(scoreItem(1, [], NOW)).toBeNull();
  });
});

describe('scoreItem: trend and warning flags', () => {
  const drifting = (perDay: number) =>
    makeHistory(14, (night) => ({
      avgHighPrice: Math.round(1030 * (1 + perDay) ** night),
      avgLowPrice: Math.round(970 * (1 + perDay) ** night),
    }));

  it('calls a steady price flat, with no flags', () => {
    expect(scoreItem(1, makeHistory(14), NOW)).toMatchObject({ trend: 'flat', flags: [] });
  });

  it('calls a price dropping 2% a day falling, and flags it', () => {
    const score = scoreItem(1, drifting(-0.02), NOW);
    expect(score?.trend).toBe('falling');
    expect(score?.trendPerDay).toBeCloseTo(-0.02, 2);
    expect(score?.flags).toContain('falling');
  });

  it('calls a price climbing 2% a day rising', () => {
    expect(scoreItem(1, drifting(0.02), NOW)).toMatchObject({ trend: 'rising' });
  });

  it('flags a sudden spike in the last 24 hours', () => {
    const history = makeHistory(14).map((point) =>
      point.timestamp >= NOW.getTime() / 1000 - DAY
        ? { ...point, avgHighPrice: 1515, avgLowPrice: 1485 }
        : point,
    );
    expect(scoreItem(1, history, NOW)?.flags).toContain('spike');
  });

  it('flags few trades in my hours', () => {
    const history = makeHistory(14, (_night, hour) =>
      hour < 9 ? { lowPriceVolume: 2 } : undefined,
    );
    const score = scoreItem(1, history, NOW);
    expect(score?.buyWindowVolume).toBe(18);
    expect(score?.flags).toContain('thin');
  });

  it('flags tax eating most of the margin', () => {
    // Usual margin before tax 60 gp against 20 gp tax; squeezed to 10 gp it's mostly tax.
    expect(scoreItem(1, makeHistory(14), NOW)?.flags).not.toContain('tax-heavy');
    const tight = makeHistory(14, () => ({ avgHighPrice: 1010, avgLowPrice: 1000 }));
    expect(scoreItem(1, tight, NOW)?.flags).toContain('tax-heavy');
  });

  it('flags an old last trade on either side', () => {
    const now = NOW.getTime() / 1000;
    const fresh = { highTime: now - 600, lowTime: now - 5 * HOUR };
    const old = { highTime: now - 600, lowTime: now - 7 * HOUR };
    const history = makeHistory(14);
    expect(scoreItem(1, history, NOW, fresh)?.flags).not.toContain('stale');
    expect(scoreItem(1, history, NOW, old)?.flags).toContain('stale');
    expect(scoreItem(1, history, NOW, { highTime: null, lowTime: now })?.flags).toContain('stale');
  });
});

describe('scoreItem: the saved samples', () => {
  const captured = new Date('2026-11-16T18:55:56Z');
  const load = (name: string) =>
    JSON.parse(readFileSync(new URL(`../samples/${name}`, import.meta.url), 'utf8')) as {
      data: unknown;
    };
  const latest = load('latest.json').data as Record<string, { highTime: number; lowTime: number }>;
  const score = (id: number) =>
    scoreItem(id, load(`history/${id}.json`).data as HourPoint[], captured, latest[id]);

  it('Abyssal whip: a small margin after tax on 14 measured nights', () => {
    const whip = score(4151);
    expect(whip?.nights).toHaveLength(14);
    expect(whip?.buyPrice).toBeGreaterThan(600_000);
    expect(whip?.sellPrice).toBeLessThan(700_000);
    expect(whip?.taxPerItem).toBe(Math.floor((whip?.sellPrice ?? 0) * 0.02));
    expect(whip?.profitPerItem).toBeGreaterThan(0);
    expect(whip?.profitPerItem).toBeLessThan(30_000);
    expect(whip?.flags).not.toContain('thin');
  });

  it('Old school bond: no tax', () => {
    const bond = score(13190);
    expect(bond?.taxPerItem).toBe(0);
    expect(bond?.profitPerItem).toBe((bond?.sellPrice ?? 0) - (bond?.buyPrice ?? 0));
  });

  it('3rd age amulet: scored despite many hours with no trades, and flagged thin', () => {
    const amulet = score(10344);
    expect(amulet?.nights).toHaveLength(14);
    expect(amulet?.fillNights).toBeLessThan(14);
    expect(amulet?.buyWindowVolume).toBeLessThan(10);
    expect(amulet?.flags).toContain('thin');
    expect(amulet?.flags).toContain('stale');
  });

  it('Feather: under 50 gp, so no tax', () => {
    expect(score(314)).toMatchObject({ taxPerItem: 0 });
  });
});

describe('sizePick', () => {
  const item: Sizable = {
    limit: 70,
    buyPrice: 1_000,
    profitPerItem: 50,
    buyWindowVolume: 10_000,
    nights: new Array<boolean>(14).fill(true),
    fillNights: 7,
    trend: 'flat',
  };

  it('buys the buy limit when cash and volume allow', () => {
    expect(sizePick(item, 1_000_000)).toEqual({
      quantity: 70,
      cost: 70_000,
      profit: 3_500,
      rank: 1_750,
    });
  });

  it('buys what the cash for the slot can afford', () => {
    expect(sizePick(item, 25_500)).toMatchObject({ quantity: 25, cost: 25_000 });
    expect(sizePick(item, 999)).toMatchObject({ quantity: 0, cost: 0, profit: 0, rank: 0 });
  });

  it('buys at most 10% of what trades in my buy window', () => {
    expect(sizePick({ ...item, buyWindowVolume: 305 }, 1_000_000).quantity).toBe(30);
  });

  it('ranks by profit × fill chance, halved when the price is falling', () => {
    expect(sizePick({ ...item, fillNights: 14 }, 1_000_000).rank).toBe(3_500);
    expect(sizePick({ ...item, trend: 'falling' }, 1_000_000).rank).toBe(875);
    expect(sizePick({ ...item, trend: 'rising' }, 1_000_000).rank).toBe(1_750);
  });

  it('keeps a loss-making item at the bottom', () => {
    expect(sizePick({ ...item, profitPerItem: -5 }, 1_000_000).rank).toBeLessThan(0);
  });

  it('follows the settings file', () => {
    const settings = { ...SETTINGS, volumeShare: 0.001 };
    expect(sizePick(item, 1_000_000, settings).quantity).toBe(10);
  });
});

describe('cashPerSlot', () => {
  it('splits the cash evenly across the free slots', () => {
    expect(cashPerSlot(50_000_000, 2)).toBe(25_000_000);
    expect(cashPerSlot(10_000_000, 3)).toBe(3_333_333);
    expect(cashPerSlot(10_000_000, 0)).toBe(10_000_000);
  });
});
