/**
 * One run of the data job, without the reading and writing: fetch, narrow to
 * candidates, fetch their hourly history, score (docs/spec.md §5, §7.1).
 *
 * If the Wiki fails or returns nonsense this throws, so nothing is published
 * and the last good results stay in place.
 */
import type { HistoryFile, PicksFile, PublishedItem } from '../shared/picks.ts';
import { scoreItem, sizePick } from '../shared/scoring.ts';
import { SETTINGS, type Settings } from '../shared/settings.ts';
import type { DayResponse, LatestResponse, MappingItem, TimeseriesResponse } from './wiki.ts';

/** Where the price data comes from: the live Wiki, or the saved samples. */
export interface Source {
  mapping(): Promise<MappingItem[]>;
  latest(): Promise<LatestResponse>;
  day(): Promise<DayResponse>;
  hourly(id: number): Promise<TimeseriesResponse>;
  /** Only these items have history (the saved samples). Unset: any item. */
  historyIds?: readonly number[];
}

/** What counts as "the Wiki returned nonsense". The defaults fit the live API. */
export interface Limits {
  /** The item list and both price lists must each have at least this many items. */
  minItems: number;
  minCandidates: number;
  minScored: number;
  /** The newest trade anywhere must be younger than this, or the prices are stuck. */
  maxPriceAgeHours: number;
  /** More failed history requests than this share fails the run. */
  maxHistoryFailures: number;
}

export const LIVE_LIMITS: Limits = {
  minItems: 2000,
  minCandidates: 100,
  minScored: 50,
  maxPriceAgeHours: 2,
  maxHistoryFailures: 0.1,
};

export interface Results {
  picks: PicksFile;
  histories: HistoryFile[];
  /** A one-line account of the run, for the log. */
  summary: string;
}

const HOUR = 3600;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isPrice = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

function nonsense(what: string): never {
  throw new Error(`The Wiki returned nonsense: ${what}. Nothing published.`);
}

export async function buildResults(
  source: Source,
  now: Date,
  settings: Settings = SETTINGS,
  limits: Limits = LIVE_LIMITS,
): Promise<Results> {
  const nowSeconds = now.getTime() / 1000;
  const mapping = await source.mapping();
  const latest = await source.latest();
  const day = await source.day();

  if (!Array.isArray(mapping) || mapping.length < limits.minItems) {
    nonsense(`the item list has ${Array.isArray(mapping) ? mapping.length : 'no'} items`);
  }
  for (const [name, list] of [
    ['latest prices', latest],
    ['24-hour data', day],
  ] as const) {
    const size = isRecord(list) && isRecord(list.data) ? Object.keys(list.data).length : 0;
    if (size < limits.minItems) nonsense(`the ${name} cover ${size} items`);
  }
  const newestTrade = Math.max(
    0,
    ...Object.values(latest.data).map((price) =>
      Math.max(price?.highTime ?? 0, price?.lowTime ?? 0),
    ),
  );
  if (nowSeconds - newestTrade > limits.maxPriceAgeHours * HOUR) {
    nonsense(`the newest trade is ${Math.round((nowSeconds - newestTrade) / HOUR)} hours old`);
  }

  // Candidates: a buy limit, traded both ways in the last 24 hours, and both
  // a buy and a sell price right now. The most-traded (by gp) come first.
  const candidates = mapping
    .flatMap((item) => {
      if (!isRecord(item) || typeof item.id !== 'number' || typeof item.name !== 'string')
        return [];
      if (source.historyIds && !source.historyIds.includes(item.id)) return [];
      const traded = day.data[item.id];
      const price = latest.data[item.id];
      if (!isPrice(item.limit) || !traded || !price) return [];
      if (!isPrice(traded.avgHighPrice) || !isPrice(traded.avgLowPrice)) return [];
      if (!isPrice(traded.highPriceVolume) || !isPrice(traded.lowPriceVolume)) return [];
      if (!isPrice(price.high) || !isPrice(price.low)) return [];
      const dailyVolume = traded.highPriceVolume + traded.lowPriceVolume;
      const dailyValue =
        traded.avgHighPrice * traded.highPriceVolume + traded.avgLowPrice * traded.lowPriceVolume;
      return [{ item, limit: item.limit, price, dailyVolume, dailyValue }];
    })
    .sort((a, b) => b.dailyValue - a.dailyValue || a.item.id - b.item.id)
    .slice(0, settings.historyCap);
  if (candidates.length < limits.minCandidates) {
    nonsense(`only ${candidates.length} items qualify as candidates`);
  }

  const items: PublishedItem[] = [];
  const histories: HistoryFile[] = [];
  let failed = 0;
  let unscored = 0;
  for (const { item, limit, price, dailyVolume } of candidates) {
    let points: TimeseriesResponse['data'];
    try {
      const response = await source.hourly(item.id);
      if (!isRecord(response) || !Array.isArray(response.data)) throw new Error('no data');
      points = response.data
        .filter((point) => isRecord(point) && typeof point.timestamp === 'number')
        .sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      failed += 1;
      console.warn(`history for ${item.name} (${item.id}) failed: ${String(error)}`);
      if (failed > candidates.length * limits.maxHistoryFailures) {
        throw new Error(`Too many history requests failed (${failed}). Nothing published.`, {
          cause: error,
        });
      }
      continue;
    }
    const score = scoreItem(item.id, points, now, price, settings);
    if (!score) {
      unscored += 1;
      continue;
    }
    items.push({
      id: item.id,
      name: item.name,
      icon: item.icon,
      members: item.members,
      limit,
      dailyVolume,
      ...score,
    });
    // The page draws the measured nights plus today.
    const from = nowSeconds - (settings.nights + 2) * 24 * HOUR;
    histories.push({
      id: item.id,
      points: points
        .filter((point) => point.timestamp >= from)
        .map((point) => [
          point.timestamp,
          point.avgHighPrice,
          point.avgLowPrice,
          point.highPriceVolume,
          point.lowPriceVolume,
        ]),
    });
  }
  if (items.length < limits.minScored) nonsense(`only ${items.length} items could be scored`);

  // Best first for the default cash, so the page can list the top before it has controls.
  const rank = new Map(
    items.map((item) => [item.id, sizePick(item, settings.defaultCashPerSlot, settings).rank]),
  );
  items.sort((a, b) => (rank.get(b.id) ?? 0) - (rank.get(a.id) ?? 0) || a.id - b.id);

  return {
    picks: {
      generatedAt: now.toISOString(),
      settings: {
        buyStartHour: settings.buyStartHour,
        buyEndHour: settings.buyEndHour,
        sellStartHour: settings.sellStartHour,
        sellEndHour: settings.sellEndHour,
        nights: settings.nights,
        buyLevel: settings.buyLevel,
        sellLevel: settings.sellLevel,
        volumeShare: settings.volumeShare,
        fallingPenalty: settings.fallingPenalty,
      },
      items,
    },
    histories,
    summary:
      `${mapping.length} items, ${candidates.length} candidates, ${items.length} scored, ` +
      `${unscored} with too little history, ${failed} history requests failed`,
  };
}
