/**
 * Every starting value the scoring uses, in one place (docs/spec.md §5).
 * The job publishes the ones it used inside the results file. They get tuned
 * in the backtest batch; change them here, nowhere else.
 */
export interface Settings {
  /** Buy window (while I sleep) and sell window (the following day), Manila clock hours. */
  buyStartHour: number;
  buyEndHour: number;
  sellStartHour: number;
  sellEndHour: number;
  /** How many past nights are measured. */
  nights: number;
  /** Fewer measured nights than this and the item isn't scored at all. */
  minNights: number;
  /** The suggested buy and sell prices were each reached on about this share of nights. */
  buyLevel: number;
  sellLevel: number;
  /** Tax: a share of the sell price, rounded down, with a cap per item. */
  taxRate: number;
  taxCapPerItem: number;
  /** Sales under this price pay no tax. */
  taxFreeUnder: number;
  /** Item ids that never pay tax. */
  taxExemptIds: readonly number[];
  /** My order may be at most this share of what trades in my buy window. */
  volumeShare: number;
  /** Trend: measured over this many days; under this change per day counts as flat. */
  trendDays: number;
  trendFlatPerDay: number;
  /** Rank is multiplied by this when the price is falling (which also raises the "falling" flag). */
  fallingPenalty: number;
  /** Flag "spike": today's level is this far above the usual level of the past nights. */
  spikeAbove: number;
  /** Flag "thin": fewer items than this trade in my buy window on a typical night. */
  thinWindowVolume: number;
  /** Flag "tax-heavy": tax takes at least this share of the margin before tax. */
  taxHeavyShare: number;
  /** Flag "stale": the last trade on either side is older than this many hours. */
  staleHours: number;
  /** The job fetches hourly history for at most this many items an hour. */
  historyCap: number;
  /** What the picks are sized for until the page has controls: cash per slot, in gp. */
  defaultCashPerSlot: number;
}

export const SETTINGS: Settings = {
  buyStartHour: 22,
  buyEndHour: 7,
  sellStartHour: 7,
  sellEndHour: 22,
  nights: 14,
  minNights: 5,
  buyLevel: 0.7,
  sellLevel: 0.7,
  taxRate: 0.02,
  taxCapPerItem: 5_000_000,
  taxFreeUnder: 50,
  // Old school bond. The Wiki's full exempt list is still unchecked
  // (docs/status.md); taxing an exempt item only makes its profit look smaller.
  taxExemptIds: [13190],
  volumeShare: 0.1,
  trendDays: 7,
  trendFlatPerDay: 0.005,
  fallingPenalty: 0.5,
  spikeAbove: 0.25,
  thinWindowVolume: 30,
  taxHeavyShare: 0.5,
  staleHours: 6,
  historyCap: 300,
  defaultCashPerSlot: 50_000_000,
};
