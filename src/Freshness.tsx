import { useEffect, useState } from 'react';
import { formatAgo, formatManilaTime } from '../shared/time.ts';

/**
 * Older than this and the page warns (docs/spec.md §7.6): the job runs every
 * hour, but GitHub's schedule is approximate and can stall.
 */
export const STALE_AFTER_MS = 2 * 60 * 60 * 1000;

export const isStale = (at: Date, now: Date): boolean =>
  now.getTime() - at.getTime() > STALE_AFTER_MS;

/** The current time, refreshed often enough for "23 min ago" to stay true. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** "Updated 23 min ago · 12:37 Manila time", and the warning once that's too old. */
export function Freshness({ generatedAt }: { generatedAt: string }) {
  const now = useNow();
  const at = new Date(generatedAt);
  return (
    <>
      <p className="muted">
        Updated {formatAgo(at, now)} · <time dateTime={generatedAt}>{formatManilaTime(at)}</time>{' '}
        Manila time
      </p>
      <StaleWarning at={at} now={now} />
    </>
  );
}

/**
 * Always on the page (empty while the data is fresh), so screen readers
 * announce it when it fills in.
 */
function StaleWarning({ at, now }: { at: Date; now: Date }) {
  const stale = isStale(at, now);
  return (
    <p className={stale ? 'stale' : 'visually-hidden'} role="status">
      {stale && (
        <>
          <span aria-hidden="true">⚠</span> These prices are{' '}
          {formatAgo(at, now).replace(/ ago$/, '')} old. The hourly update may have stalled, so
          offers could be off. Check the live price in the game before you buy.
        </>
      )}
    </p>
  );
}

/** Just the warning, for screens that don't show the update time. */
export function StaleNotice({ generatedAt }: { generatedAt: string }) {
  const now = useNow();
  return <StaleWarning at={new Date(generatedAt)} now={now} />;
}
