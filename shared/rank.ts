/**
 * The page's last step (docs/spec.md §5, §7.2–7.3): size every published item
 * for the cash and slots chosen on the phone, sort them, and keep the volume
 * group asked for. The sizing itself is `sizePick`, the same code the job uses.
 */
import type { PickItem, PublishedItem, PublishedSettings } from './picks.ts';
import { cashPerSlot, sizePick, type SizedPick } from './scoring.ts';
import { SETTINGS, type Settings } from './settings.ts';

/** The picks list shows at most this many. */
export const TOP_PICKS = 10;
/** Fewer than this and the page says why the list is short. */
export const FEW_PICKS = 6;

export type VolumeGroup = 'high' | 'low';
export type VolumeTab = VolumeGroup | 'all';

/** What the controls on the page choose. */
export interface Choice {
  /** Cash to spend, in gp, split evenly across the free slots. */
  cash: number;
  freeSlots: number;
  volume: VolumeTab;
}

export interface RankedPick extends SizedPick {
  item: PublishedItem;
  volume: VolumeGroup;
  /** Profit as a share of the cash it ties up (0.025 = 2.5%). */
  returnShare: number;
}

export interface Ranking {
  /** Best first, at most TOP_PICKS. */
  picks: RankedPick[];
  /** Cash each pick is sized for. */
  cashPerSlot: number;
  /** How many items make a profit at this cash per slot, in the chosen tab and in all tabs. */
  qualifying: number;
  qualifyingAll: number;
  /** Entries with full details in the results file, profitable or not. */
  published: number;
}

const TRENDS = new Set(['rising', 'flat', 'falling']);
const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

/**
 * Does this entry carry every number the page needs? Older results files list
 * only id and name, and a damaged entry is skipped instead of breaking the page.
 */
export function isPublishedItem(item: PickItem & Partial<PublishedItem>): item is PublishedItem {
  return (
    typeof item.icon === 'string' &&
    isCount(item.limit) &&
    item.limit > 0 &&
    isCount(item.dailyVolume) &&
    isCount(item.buyPrice) &&
    item.buyPrice > 0 &&
    isCount(item.sellPrice) &&
    isCount(item.taxPerItem) &&
    typeof item.profitPerItem === 'number' &&
    Number.isFinite(item.profitPerItem) &&
    isCount(item.buyWindowVolume) &&
    Array.isArray(item.nights) &&
    item.nights.every((night) => typeof night === 'boolean') &&
    isCount(item.fillNights) &&
    typeof item.trend === 'string' &&
    TRENDS.has(item.trend) &&
    item.fillNights <= Math.max(item.nights.length, 1) &&
    typeof item.trendPerDay === 'number' &&
    Number.isFinite(item.trendPerDay) &&
    Array.isArray(item.flags) &&
    item.flags.every((flag) => typeof flag === 'string')
  );
}

/**
 * The settings to size picks with: the ones the results file says it was
 * scored with, over the page's own. Keeps the page in step with the job when
 * `next` and `main` have different starting values.
 */
export function settingsFor(published?: Partial<PublishedSettings>): Settings {
  const merged: Settings = { ...SETTINGS };
  for (const [key, value] of Object.entries(published ?? {})) {
    if (key in SETTINGS && typeof value === 'number' && Number.isFinite(value)) {
      (merged as unknown as Record<string, number>)[key] = value;
    }
  }
  return merged;
}

/** "High" when my order is a small part of what trades in my buy window. */
export function volumeGroup(
  quantity: number,
  buyWindowVolume: number,
  settings: Settings = SETTINGS,
): VolumeGroup {
  return buyWindowVolume > 0 && quantity <= buyWindowVolume * settings.highVolumeShare
    ? 'high'
    : 'low';
}

/** The best picks for the chosen cash, slots and volume tab. */
export function rankPicks(
  items: readonly (PickItem & Partial<PublishedItem>)[],
  choice: Choice,
  settings: Settings = SETTINGS,
): Ranking {
  const perSlot = cashPerSlot(choice.cash, choice.freeSlots);
  const all: RankedPick[] = [];
  let published = 0;
  for (const item of items) {
    if (!isPublishedItem(item)) continue;
    published += 1;
    const sized = sizePick(item, perSlot, settings);
    // Also catches NaN (an unreadable cash amount or slot count).
    if (!(sized.quantity > 0 && sized.profit > 0)) continue;
    all.push({
      ...sized,
      item,
      volume: volumeGroup(sized.quantity, item.buyWindowVolume, settings),
      returnShare: sized.profit / sized.cost,
    });
  }
  const chosen =
    choice.volume === 'all' ? all : all.filter((pick) => pick.volume === choice.volume);
  chosen.sort((a, b) => b.rank - a.rank || b.profit - a.profit || a.item.id - b.item.id);
  return {
    picks: chosen.slice(0, TOP_PICKS),
    cashPerSlot: perSlot,
    qualifying: chosen.length,
    qualifyingAll: all.length,
    published,
  };
}

export type FillWord = 'strong' | 'typical' | 'below typical';

/**
 * A word for the fill nights, judged against what real picks reach: both the
 * buy and the sell have to fill, so even the best manage about 10 of 14.
 * Counted as a share of the measured nights, so it still holds if that changes.
 */
export function fillWord(fillNights: number, nights: number = SETTINGS.nights): FillWord {
  const share = fillNights / Math.max(nights, 1);
  if (share >= 10 / 14) return 'strong';
  if (share >= 8 / 14) return 'typical';
  return 'below typical';
}
