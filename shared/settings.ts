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
  /** Item ids that can't be flipped, so the job never picks them. */
  notFlippableIds: readonly number[];
  /** My order may be at most this share of what trades in my buy window. */
  volumeShare: number;
  /**
   * Volume tabs on the page: "High" when my order is at most this share of what
   * usually trades in my buy window, "Low" when it's more.
   */
  highVolumeShare: number;
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
  // The Wiki's "Exempt from tax" list (Grand Exchange page, checked 2026-11-17).
  taxExemptIds: [
    13190, // Old school bond
    3008,
    3010,
    3012,
    3014, // Energy potion (4) to (1)
    882,
    884,
    886, // Bronze, iron, steel arrow
    806,
    807,
    808, // Bronze, iron, steel dart
    558, // Mind rune
    // Low-level food: bass, bread, cake, cooked chicken, cooked meat, herring,
    // lobster, mackerel, meat pie, pike, salmon, shrimps, tuna
    365,
    2309,
    1891,
    2140,
    2142,
    347,
    379,
    355,
    2327,
    351,
    329,
    315,
    361,
    // Teleport tablets: Varrock, Lumbridge, Falador, Camelot, Ardougne,
    // house, Kourend castle, Civitas illa fortis
    8007,
    8008,
    8009,
    8010,
    8011,
    8013,
    28790,
    28824,
    3853, // Games necklace(8)
    2552, // Ring of dueling(8)
    // Tools: chisel, gardening trowel, glassblowing pipe, hammer, needle,
    // pestle and mortar, rake, saw, secateurs, seed dibber, shears, spade,
    // watering can
    1755,
    5325,
    1785,
    2347,
    1733,
    233,
    5341,
    8794,
    5329,
    5343,
    1735,
    952,
    5331,
  ],
  // Old school bond: buying one on the Grand Exchange makes it untradeable,
  // and making it tradeable again costs 10% of its price.
  notFlippableIds: [13190],
  volumeShare: 0.1,
  highVolumeShare: 0.02,
  trendDays: 7,
  trendFlatPerDay: 0.005,
  fallingPenalty: 0.5,
  spikeAbove: 0.25,
  thinWindowVolume: 30,
  taxHeavyShare: 0.6,
  staleHours: 6,
  historyCap: 300,
  defaultCashPerSlot: 50_000_000,
};
