import { describe, expect, it } from 'vitest';
import { formatAgo, formatManilaTime } from './time.ts';

const at = new Date('2026-11-16T06:37:00Z');
const later = (ms: number) => new Date(at.getTime() + ms);
const MIN = 60_000;

describe('formatManilaTime', () => {
  it('shows Manila time (UTC+8), 24-hour', () => {
    expect(formatManilaTime(at)).toBe('14:37');
    expect(formatManilaTime(new Date('2026-11-16T16:05:00Z'))).toBe('00:05');
  });
});

describe('formatAgo', () => {
  it.each([
    [30_000, 'just now'],
    [23 * MIN, '23 min ago'],
    [59 * MIN + 59_000, '59 min ago'],
    [60 * MIN, '1 h ago'],
    [125 * MIN, '2 h 5 min ago'],
    [24 * 60 * MIN, '1 day ago'],
    [3 * 24 * 60 * MIN, '3 days ago'],
  ])('%d ms later reads "%s"', (elapsed, text) => {
    expect(formatAgo(at, later(elapsed))).toBe(text);
  });

  it('never goes negative when the phone clock is behind', () => {
    expect(formatAgo(at, later(-5 * MIN))).toBe('just now');
  });
});
