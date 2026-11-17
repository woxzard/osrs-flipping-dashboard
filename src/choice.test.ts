import { describe, expect, it } from 'vitest';
import { DEFAULT_CHOICE, readChoice, writeChoice } from './choice.ts';

describe('readChoice', () => {
  it('starts at 50m, one slot, all volumes', () => {
    expect(readChoice('', null)).toEqual(DEFAULT_CHOICE);
  });

  it('reads the address', () => {
    expect(readChoice('?cash=25m&slots=4&vol=low', null)).toEqual({
      cash: 25_000_000,
      freeSlots: 4,
      volume: 'low',
    });
    expect(readChoice('?cash=12345678', null).cash).toBe(12_345_678);
  });

  it('falls back to the last choice on this phone, then the defaults', () => {
    const stored = { cash: 100_000_000, freeSlots: 3 };
    expect(readChoice('', stored)).toEqual({ ...stored, volume: 'all' });
    expect(readChoice('?cash=10m', stored)).toMatchObject({ cash: 10_000_000, freeSlots: 3 });
  });

  it.each([
    ['cash under 100k', '?cash=99k'],
    ['cash over the game limit', '?cash=2148m'],
    ['unreadable cash', '?cash=lots'],
    ['zero slots', '?slots=0'],
    ['nine slots', '?slots=9'],
    ['half a slot', '?slots=1.5'],
    ['slots written oddly', '?slots=0x8'],
    ['an unknown tab', '?vol=medium'],
  ])('ignores %s', (_what, search) => {
    expect(readChoice(search, null)).toEqual(DEFAULT_CHOICE);
  });

  it('ignores a damaged stored choice', () => {
    expect(readChoice('', { cash: -1, freeSlots: 'two' as never })).toEqual(DEFAULT_CHOICE);
  });
});

describe('writeChoice', () => {
  it('writes the choice and keeps the rest of the address', () => {
    const search = writeChoice(
      { cash: 1_500_000_000, freeSlots: 2, volume: 'high' },
      '?item=27226&cash=1m',
    );
    expect(search).toBe('?item=27226&cash=1500m&slots=2&vol=high');
    expect(readChoice(search, null)).toEqual({
      cash: 1_500_000_000,
      freeSlots: 2,
      volume: 'high',
    });
  });
});
