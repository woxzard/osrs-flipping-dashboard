import { describe, expect, it } from 'vitest';
import { formatExactGp, formatGp, formatGpParam, formatPercent, parseGp } from './format.ts';

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

describe('formatExactGp', () => {
  it.each([
    [0, '0'],
    [3_962, '3,962'],
    [13_751_666, '13,751,666'],
    [2_147_483_647, '2,147,483,647'],
  ])('shows %d as %s', (amount, text) => {
    expect(formatExactGp(amount)).toBe(text);
  });

  it('handles bad input', () => {
    expect(formatExactGp(-0.4)).toBe('0');
    expect(formatExactGp(Number.NaN)).toBe('–');
  });
});

describe('formatPercent', () => {
  it.each([
    [0.04341, '4.3%'],
    [0.0499, '4.9%'],
    [0.025, '2.5%'],
    [0.001, '0.1%'],
    [0, '0.0%'],
    [1, '100.0%'],
    [-0.0125, '-1.2%'],
  ])('shows %d as %s', (share, text) => {
    expect(formatPercent(share)).toBe(text);
  });

  it('handles bad input', () => {
    expect(formatPercent(Number.POSITIVE_INFINITY)).toBe('–');
  });
});

describe('parseGp', () => {
  it.each([
    ['25m', 25_000_000],
    ['1.5b', 1_500_000_000],
    ['750k', 750_000],
    ['750K', 750_000],
    ['2.5 m', 2_500_000],
    ['25,000,000', 25_000_000],
    [' 12 ', 12],
    ['.5m', 500_000],
  ])('reads %s', (text, amount) => {
    expect(parseGp(text)).toBe(amount);
  });

  it('takes a plain number in the unit asked for', () => {
    expect(parseGp('25', 1e6)).toBe(25_000_000);
    expect(parseGp('0.75', 1e6)).toBe(750_000);
    expect(parseGp('750k', 1e6)).toBe(750_000);
  });

  it.each(['', 'abc', '-5m', '5x', '1.2.3', '5mm'])('refuses %j', (text) => {
    expect(parseGp(text)).toBeNaN();
  });
});

describe('formatGpParam', () => {
  it.each([
    [50_000_000, '50m'],
    [1_500_000_000, '1500m'],
    [750_000, '750k'],
    [12_345_678, '12345678'],
    [0, '0'],
  ])('writes %d as %s', (amount, text) => {
    expect(formatGpParam(amount)).toBe(text);
    expect(parseGp(text)).toBe(amount);
  });
});
