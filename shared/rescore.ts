/**
 * Scoring with my own night hours, on the phone (docs/spec.md §7.7): the
 * same `scoreItem` the hourly job runs, fed from the item's published hourly
 * history instead of the price site. With the job's hours it gives the job's
 * numbers exactly.
 */
import type { HistoryFile, PublishedItem } from './picks.ts';
import { hoursBetween, scoreItem, type HourPoint } from './scoring.ts';
import type { Settings } from './settings.ts';

/** The window hours I can change; the rest of the settings stay the job's. */
export type WindowHours = Pick<
  Settings,
  'buyStartHour' | 'buyEndHour' | 'sellStartHour' | 'sellEndHour'
>;

/** A published history row back in the price site's shape. */
export function toHourPoints(history: HistoryFile): HourPoint[] {
  return history.points.map(([timestamp, high, low, highVolume, lowVolume]) => ({
    timestamp,
    avgHighPrice: high,
    avgLowPrice: low,
    highPriceVolume: highVolume,
    lowPriceVolume: lowVolume,
  }));
}

/**
 * The item scored with these settings, as of when the results file was made,
 * or null when its history can't support a score with these hours. The
 * "stale" flag depends on when each side last traded, which the history
 * doesn't hold, so it's kept from the job.
 */
export function rescoreItem(
  item: PublishedItem,
  history: HistoryFile,
  generatedAt: string,
  settings: Settings,
): PublishedItem | null {
  const score = scoreItem(
    item.id,
    toHourPoints(history),
    new Date(generatedAt),
    undefined,
    settings,
  );
  if (!score) return null;
  const flags = item.flags.includes('stale') ? [...score.flags, 'stale' as const] : score.flags;
  return { ...item, ...score, flags };
}

/** True when both name the same window hours. */
export function sameHours(a: WindowHours, b: WindowHours): boolean {
  return (
    a.buyStartHour === b.buyStartHour &&
    a.buyEndHour === b.buyEndHour &&
    a.sellStartHour === b.sellStartHour &&
    a.sellEndHour === b.sellEndHour
  );
}

const isHour = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23;

/**
 * Why these window hours can't be scored, in plain words, or null when they
 * can. The scoring measures a night from the buy window's start to the sell
 * window's end, so both must be open and fit in 24 hours.
 */
export function hoursProblem(hours: WindowHours): string | null {
  const { buyStartHour, buyEndHour, sellStartHour, sellEndHour } = hours;
  if (![buyStartHour, buyEndHour, sellStartHour, sellEndHour].every(isHour)) {
    return 'Choose a whole hour for each.';
  }
  if (hoursBetween(buyStartHour, buyEndHour) === 0) return 'Buying needs at least an hour.';
  if (hoursBetween(sellStartHour, sellEndHour) === 0) return 'Selling needs at least an hour.';
  if (hoursBetween(buyStartHour, sellStartHour) + hoursBetween(sellStartHour, sellEndHour) > 24) {
    return 'Buying and selling together must fit in 24 hours, before the next night starts.';
  }
  return null;
}

/** Does a night with these hours end on the day after it starts? */
export const endsNextDay = (hours: WindowHours): boolean =>
  hours.buyStartHour +
    hoursBetween(hours.buyStartHour, hours.sellStartHour) +
    hoursBetween(hours.sellStartHour, hours.sellEndHour) >
  24;
