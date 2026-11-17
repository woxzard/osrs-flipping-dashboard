/**
 * How a flip is scored (docs/spec.md §5). Used by the hourly job for the
 * per-item numbers and by the page for the last step (quantity, profit, rank),
 * so the rules exist once. All starting values come from settings.ts.
 */
import { SETTINGS, type Settings } from './settings.ts';
import { taxPerItem } from './tax.ts';

/** One hour of an item's history, as the price API returns it. */
export interface HourPoint {
  /** Start of the hour, in seconds since 1970 (UTC). */
  timestamp: number;
  /** Average price people paid when buying at once: what my sell offer can get. */
  avgHighPrice: number | null;
  highPriceVolume: number;
  /** Average price people got when selling at once: what my buy offer can catch. */
  avgLowPrice: number | null;
  lowPriceVolume: number;
}

export type Trend = 'rising' | 'flat' | 'falling';

export type Flag = 'falling' | 'spike' | 'thin' | 'tax-heavy' | 'stale' | 'short-history';

/** The per-item numbers the job publishes. */
export interface ItemScore {
  /** Suggested buy and sell price, in gp. */
  buyPrice: number;
  sellPrice: number;
  taxPerItem: number;
  /** Sell − tax − buy, for one item. */
  profitPerItem: number;
  /** Items sold into buy offers during my buy window, on an average night. */
  buyWindowVolume: number;
  /** The measured nights, oldest first: would both the buy and the sell have gone through? */
  nights: boolean[];
  fillNights: number;
  trend: Trend;
  /** Change in the daily price level per day, as a fraction (0.01 = +1% a day). */
  trendPerDay: number;
  flags: Flag[];
}

const HOUR = 3600;
const DAY = 24 * HOUR;
const MANILA_OFFSET = 8 * HOUR;

const hoursBetween = (from: number, to: number) => (((to - from) % 24) + 24) % 24;

interface Night {
  /** Lowest hourly buy-side price in the buy window, if anything traded. */
  buyLow: number | null;
  /** Highest hourly sell-side price in the sell window after it. */
  sellHigh: number | null;
  /** Average traded price over the whole night and day. */
  level: number | null;
  buyWindowVolume: number;
}

function average(points: HourPoint[]): number | null {
  let value = 0;
  let volume = 0;
  for (const point of points) {
    if (point.avgHighPrice !== null) {
      value += point.avgHighPrice * point.highPriceVolume;
      volume += point.highPriceVolume;
    }
    if (point.avgLowPrice !== null) {
      value += point.avgLowPrice * point.lowPriceVolume;
      volume += point.lowPriceVolume;
    }
  }
  return volume > 0 ? value / volume : null;
}

/**
 * Splits the history into past nights in Manila time. A night starts when the
 * buy window opens and ends when the following sell window closes; only
 * finished nights inside the history count, newest last.
 */
function measureNights(history: HourPoint[], now: Date, settings: Settings): Night[] {
  const first = history[0];
  if (!first) return [];
  const buyHours = hoursBetween(settings.buyStartHour, settings.buyEndHour);
  const sellFrom = hoursBetween(settings.buyStartHour, settings.sellStartHour);
  const sellHours = hoursBetween(settings.sellStartHour, settings.sellEndHour);
  const shift = MANILA_OFFSET - settings.buyStartHour * HOUR;
  const nightOf = (timestamp: number) => Math.floor((timestamp + shift) / DAY);
  const startOf = (night: number) => night * DAY - shift;

  // The newest night whose sell window has closed.
  let last = nightOf(Math.floor(now.getTime() / 1000));
  while (startOf(last) + (sellFrom + sellHours) * HOUR > now.getTime() / 1000) last -= 1;

  const nights: Night[] = [];
  for (let night = last - settings.nights + 1; night <= last; night += 1) {
    const start = startOf(night);
    if (start < first.timestamp) continue; // before the history begins
    const inNight = history.filter((point) => nightOf(point.timestamp) === night);
    const hourOf = (point: HourPoint) => (point.timestamp - start) / HOUR;
    const buying = inNight.filter((point) => hourOf(point) < buyHours);
    const selling = inNight.filter(
      (point) => hourOf(point) >= sellFrom && hourOf(point) < sellFrom + sellHours,
    );
    const lows = buying.flatMap((point) => point.avgLowPrice ?? []);
    const highs = selling.flatMap((point) => point.avgHighPrice ?? []);
    nights.push({
      buyLow: lows.length ? Math.min(...lows) : null,
      sellHigh: highs.length ? Math.max(...highs) : null,
      level: average(inNight),
      buyWindowVolume: buying.reduce((sum, point) => sum + point.lowPriceVolume, 0),
    });
  }
  return nights;
}

/** Slope of a straight line through the values, per step, as a share of their mean. */
function slopePerStep(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((sum, value) => sum + value, 0) / n;
  let top = 0;
  let bottom = 0;
  values.forEach((value, x) => {
    top += (x - meanX) * (value - meanY);
    bottom += (x - meanX) ** 2;
  });
  return meanY > 0 ? top / bottom / meanY : 0;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle] ?? 0;
  return sorted.length % 2 ? upper : ((sorted[middle - 1] ?? upper) + upper) / 2;
}

/** When each side last traded, in seconds since 1970 (the API's `/latest`). */
export interface LastTrades {
  highTime: number | null;
  lowTime: number | null;
}

/**
 * Scores one item from its hourly history. Returns `null` when there is too
 * little to go on (too few nights, or prices too rare to find a 70% level).
 */
export function scoreItem(
  itemId: number,
  history: HourPoint[],
  now: Date,
  lastTrades?: LastTrades,
  settings: Settings = SETTINGS,
): ItemScore | null {
  const nights = measureNights(history, now, settings);
  if (nights.length < settings.minNights) return null;

  // How far below (above) that night's level the buy (sell) side reached.
  const dips: number[] = [];
  const rises: number[] = [];
  for (const { buyLow, sellHigh, level } of nights) {
    if (level === null) continue;
    if (buyLow !== null) dips.push(buyLow / level - 1);
    if (sellHigh !== null) rises.push(sellHigh / level - 1);
  }
  // The level reached on about 70% of the nights; nights without a trade are misses.
  const buyRank = Math.ceil(settings.buyLevel * nights.length);
  const sellRank = Math.ceil(settings.sellLevel * nights.length);
  const dip = dips.sort((a, b) => a - b)[buyRank - 1];
  const rise = rises.sort((a, b) => b - a)[sellRank - 1];
  if (dip === undefined || rise === undefined) return null;

  // Today's level: the last 24 hours, so a drifting price still gets sensible prices.
  const nowSeconds = now.getTime() / 1000;
  const today = average(
    history.filter((point) => point.timestamp >= nowSeconds - DAY && point.timestamp < nowSeconds),
  );
  const levels = nights.flatMap((night) => night.level ?? []);
  const level = today ?? levels.at(-1);
  if (level === undefined) return null;

  const buyPrice = Math.round(level * (1 + dip));
  const sellPrice = Math.round(level * (1 + rise));
  if (buyPrice < 1) return null;
  const tax = taxPerItem(itemId, sellPrice, settings);

  // Same test as the levels above, with a hair of slack for rounding.
  const hits = nights.map(
    ({ buyLow, sellHigh, level: nightLevel }) =>
      nightLevel !== null &&
      buyLow !== null &&
      sellHigh !== null &&
      buyLow / nightLevel - 1 <= dip + 1e-12 &&
      sellHigh / nightLevel - 1 >= rise - 1e-12,
  );

  const trendPerDay = slopePerStep(levels.slice(-settings.trendDays));
  const trend: Trend =
    trendPerDay > settings.trendFlatPerDay
      ? 'rising'
      : trendPerDay < -settings.trendFlatPerDay
        ? 'falling'
        : 'flat';

  const buyWindowVolume = Math.round(
    nights.reduce((sum, night) => sum + night.buyWindowVolume, 0) / nights.length,
  );

  const flags: Flag[] = [];
  if (trend === 'falling') flags.push('falling');
  if (level > median(levels) * (1 + settings.spikeAbove)) flags.push('spike');
  if (buyWindowVolume < settings.thinWindowVolume) flags.push('thin');
  // Only where there is a margin for the tax to eat.
  const margin = sellPrice - buyPrice;
  if (tax > 0 && margin > 0 && tax >= margin * settings.taxHeavyShare) flags.push('tax-heavy');
  if (lastTrades) {
    const oldest = Math.min(lastTrades.highTime ?? 0, lastTrades.lowTime ?? 0);
    if (nowSeconds - oldest > settings.staleHours * HOUR) flags.push('stale');
  }
  if (nights.length < settings.nights) flags.push('short-history');

  return {
    buyPrice,
    sellPrice,
    taxPerItem: tax,
    profitPerItem: sellPrice - tax - buyPrice,
    buyWindowVolume,
    nights: hits,
    fillNights: hits.filter(Boolean).length,
    trend,
    trendPerDay: Math.round(trendPerDay * 1e5) / 1e5,
    flags,
  };
}

/** What the last step needs from a published item. */
export type Sizable = Pick<
  ItemScore,
  'buyPrice' | 'profitPerItem' | 'buyWindowVolume' | 'nights' | 'fillNights' | 'trend'
> & { limit: number };

export interface SizedPick {
  quantity: number;
  /** Cash tied up while the flip runs. */
  cost: number;
  /** Expected profit after tax if it all fills. */
  profit: number;
  /** Profit × the share of the 14 nights it would have filled, less the falling-price penalty. */
  rank: number;
}

/**
 * The last step, for the cash one slot gets: how many to buy, what it ties
 * up, the profit, and the rank used to order the picks.
 */
export function sizePick(
  item: Sizable,
  cashPerSlot: number,
  settings: Settings = SETTINGS,
): SizedPick {
  const quantity = Math.max(
    0,
    Math.min(
      item.limit, // one buy limit per night
      Math.floor(cashPerSlot / item.buyPrice),
      Math.floor(item.buyWindowVolume * settings.volumeShare),
    ),
  );
  const profit = quantity * item.profitPerItem;
  // Out of the full 14 nights: nights a newer item has no history for count as misses.
  const fillChance = item.fillNights / Math.max(settings.nights, item.nights.length, 1);
  const penalty = item.trend === 'falling' ? settings.fallingPenalty : 1;
  return {
    quantity,
    cost: quantity * item.buyPrice,
    profit,
    rank: Math.round(profit * fillChance * (profit > 0 ? penalty : 1)),
  };
}

/** "Cash to spend" is split evenly across the free slots. */
export function cashPerSlot(cash: number, freeSlots: number): number {
  return Math.floor(cash / Math.max(1, Math.floor(freeSlots)));
}
