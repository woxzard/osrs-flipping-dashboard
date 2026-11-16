import { describe, expect, it } from 'vitest';
import { formatGp } from './format.ts';

describe('formatGp', () => {
  it.each([
    [0, '0'],
    [49, '49'],
    [950, '950'],
    [1_000, '1k'],
    [1_250, '1.25k'],
    [12_400, '12.4k'],
    [950_000, '950k'],
    [1_000_000, '1m'],
    [12_400_000, '12.4m'],
    [50_000_000, '50m'],
    [100_000_000, '100m'],
    [2_147_483_647, '2.14b'],
  ])('shows %d as %s', (amount, text) => {
    expect(formatGp(amount)).toBe(text);
  });

  it('cuts off instead of rounding up', () => {
    expect(formatGp(999_999)).toBe('999k');
    expect(formatGp(12_499_999)).toBe('12.4m');
    expect(formatGp(1_999_999_999)).toBe('1.99b');
  });

  it('handles losses and bad input', () => {
    expect(formatGp(-35_500)).toBe('-35.5k');
    expect(formatGp(-0.4)).toBe('0');
    expect(formatGp(Number.NaN)).toBe('–');
  });
});
