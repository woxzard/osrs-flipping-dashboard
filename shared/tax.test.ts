import { describe, expect, it } from 'vitest';
import { SETTINGS } from './settings.ts';
import { taxPerItem } from './tax.ts';

const WHIP = 4151;
const BOND = 13190;

describe('taxPerItem', () => {
  it.each([
    [49, 0],
    [50, 1],
    [99, 1],
    [100, 2],
    [149, 2],
    [150, 3],
    [650_069, 13_001],
    [17_141_902, 342_838],
  ])('selling at %d gp pays %d gp (2%%, rounded down)', (price, tax) => {
    expect(taxPerItem(WHIP, price)).toBe(tax);
  });

  it('pays nothing under 50 gp', () => {
    for (const price of [1, 3, 25, 49]) expect(taxPerItem(WHIP, price)).toBe(0);
  });

  it('is capped at 5m per item', () => {
    expect(taxPerItem(WHIP, 249_999_999)).toBe(4_999_999);
    expect(taxPerItem(WHIP, 250_000_000)).toBe(5_000_000);
    expect(taxPerItem(WHIP, 1_600_000_000)).toBe(5_000_000);
  });

  it('never taxes bonds', () => {
    expect(taxPerItem(BOND, 10_317_201)).toBe(0);
  });

  it("never taxes the other items on the Wiki's exempt list", () => {
    // Lobster, Varrock teleport tablet, hammer, energy potion(4), mind rune.
    for (const id of [379, 8007, 2347, 3008, 558]) expect(taxPerItem(id, 1_000)).toBe(0);
    expect(SETTINGS.taxExemptIds).toHaveLength(48);
    expect(new Set(SETTINGS.taxExemptIds).size).toBe(48);
  });

  it('pays nothing for a missing or nonsense price', () => {
    expect(taxPerItem(WHIP, Number.NaN)).toBe(0);
    expect(taxPerItem(WHIP, -5)).toBe(0);
  });

  it('follows the settings file', () => {
    const settings = { ...SETTINGS, taxRate: 0.01, taxExemptIds: [WHIP] };
    expect(taxPerItem(BOND, 1_000, settings)).toBe(10);
    expect(taxPerItem(WHIP, 1_000, settings)).toBe(0);
  });
});
