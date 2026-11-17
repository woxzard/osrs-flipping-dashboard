import { SETTINGS, type Settings } from './settings.ts';

/**
 * Grand Exchange tax on selling one item at `sellPrice` (docs/spec.md §5):
 * 2% rounded down, capped per item, nothing under 50 gp, exempt items pay none.
 */
export function taxPerItem(itemId: number, sellPrice: number, settings: Settings = SETTINGS) {
  if (!(sellPrice >= settings.taxFreeUnder)) return 0;
  if (settings.taxExemptIds.includes(itemId)) return 0;
  // The tiny nudge stops 2% of a round price landing a hair under a whole number.
  const tax = Math.floor(Math.round(sellPrice) * settings.taxRate + 1e-9);
  return Math.min(tax, settings.taxCapPerItem);
}
