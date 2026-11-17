const UNITS = [
  { size: 1_000_000_000, suffix: 'b' },
  { size: 1_000_000, suffix: 'm' },
  { size: 1_000, suffix: 'k' },
] as const;

/**
 * Short gp amounts: 950 → "950", 950,000 → "950k", 12,400,000 → "12.4m".
 * Up to three significant digits, cut off rather than rounded, so an amount
 * never reads as more than it is (999,999 is "999k", not "1m").
 */
export function formatGp(amount: number): string {
  if (!Number.isFinite(amount)) return '–';
  const value = Math.trunc(Math.abs(amount));
  const sign = amount < 0 && value > 0 ? '-' : '';

  for (const { size, suffix } of UNITS) {
    if (value < size) continue;
    const whole = Math.floor(value / size);
    const decimals = whole >= 100 ? 0 : whole >= 10 ? 1 : 2;
    // Integer maths only: no floating-point surprises on .x5 boundaries.
    const step = size / 10 ** decimals;
    const fraction = Math.floor((value % size) / step);
    const digits = decimals ? String(fraction).padStart(decimals, '0').replace(/0+$/, '') : '';
    return `${sign}${whole}${digits ? `.${digits}` : ''}${suffix}`;
  }
  return `${sign}${value}`;
}

const exact = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** Exact gp, for prices typed into the Grand Exchange: 13751666 → "13,751,666". */
export function formatExactGp(amount: number): string {
  if (!Number.isFinite(amount)) return '–';
  return exact.format(Math.trunc(amount) || 0); // never "-0"
}

/** A share as a percentage with one decimal, cut off: 0.04347 → "4.3%". */
export function formatPercent(share: number): string {
  if (!Number.isFinite(share)) return '–';
  const tenths = Math.trunc(Math.round(share * 1e6) / 1e3);
  return `${tenths < 0 ? '-' : ''}${Math.floor(Math.abs(tenths) / 10)}.${Math.abs(tenths) % 10}%`;
}
