import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HistoryFile, PicksFile } from '../shared/picks.ts';
import { isPublishedItem, settingsFor } from '../shared/rank.ts';
import { rescoreItem, sameHours, type WindowHours } from '../shared/rescore.ts';
import { loadHistory } from './data.ts';

/** Histories loaded at once: quick on a phone, gentle on GitHub. */
const AT_ONCE = 6;
/** More failed downloads than this share and the scoring is called off (as the job does). */
const MAX_FAILED = 0.1;

export type MyHoursState =
  /** The job's picks are used as they are: my hours are the job's, or nothing's loaded. */
  | { status: 'job' }
  | { status: 'scoring'; done: number; total: number }
  | { status: 'error' }
  | {
      status: 'ready';
      picks: PicksFile;
      /** Items in the update that can't be scored with my hours. */
      unscored: ReadonlySet<number>;
    };

/** Histories already downloaded, for the results file they belong to. */
const cache = { generatedAt: '', histories: new Map<number, HistoryFile | null>() };

async function loadAll(
  ids: number[],
  generatedAt: string,
  signal: AbortSignal,
  onProgress: (done: number) => void,
): Promise<{ histories: Map<number, HistoryFile | null>; failed: number }> {
  if (cache.generatedAt !== generatedAt) {
    cache.generatedAt = generatedAt;
    cache.histories = new Map();
  }
  const { histories } = cache;
  let next = 0;
  let done = 0;
  let failed = 0;
  const worker = async () => {
    while (next < ids.length && !signal.aborted) {
      const id = ids[next++] as number;
      if (!histories.has(id)) {
        try {
          histories.set(id, await loadHistory(id, signal));
        } catch {
          if (signal.aborted) return;
          failed += 1; // not cached: a retry asks again
        }
      }
      done += 1;
      onProgress(done);
    }
  };
  await Promise.all(Array.from({ length: AT_ONCE }, worker));
  return { histories, failed };
}

const keyOf = (picks: PicksFile, hours: WindowHours) =>
  `${picks.generatedAt}|${hours.buyStartHour}|${hours.buyEndHour}|${hours.sellStartHour}|${hours.sellEndHour}`;
const hoursKey = (key: string) => key.slice(key.indexOf('|'));

/**
 * The picks scored with my night hours (docs/spec.md §7.7). When they differ
 * from the job's, every item's hourly history is downloaded (about 3.7 MB)
 * and scored here with the job's own rules, once per hourly update.
 *
 * Like the page's quiet refresh, a newer update doesn't take the list away:
 * the last one scored with the same hours stays until the new one is ready,
 * and stays if scoring the new one fails.
 */
export function useMyHours(picks: PicksFile | null, hours: WindowHours | null) {
  const [run, setRun] = useState<{ key: string; state: MyHoursState } | null>(null);
  const [last, setLast] = useState<{ key: string; state: MyHoursState } | null>(null);
  const [attempt, setAttempt] = useState(0);

  const jobSettings = useMemo(() => (picks ? settingsFor(picks.settings) : null), [picks]);
  const needed = Boolean(picks && jobSettings && hours && !sameHours(hours, jobSettings));
  const key = needed && picks && hours ? keyOf(picks, hours) : '';
  const total = useMemo(() => (picks ? picks.items.filter(isPublishedItem).length : 0), [picks]);

  useEffect(() => {
    if (!needed || !picks || !jobSettings || !hours) return;
    const controller = new AbortController();
    const items = picks.items.filter(isPublishedItem);
    let shown = -1;
    const set = (state: MyHoursState) => {
      if (!controller.signal.aborted) setRun({ key, state });
    };
    const progress = (done: number) => {
      // A few updates are enough for a progress bar.
      if (done === 0 || done === total || done - shown >= 10) {
        shown = done;
        set({ status: 'scoring', done, total });
      }
    };
    progress(0); // a retry replaces the error at once
    loadAll(
      items.map((item) => item.id),
      picks.generatedAt,
      controller.signal,
      progress,
    )
      .then(({ histories, failed }) => {
        if (failed > total * MAX_FAILED) throw new Error(`${failed} histories failed`);
        const settings = { ...jobSettings, ...hours };
        const unscored = new Set<number>();
        const scored = items.flatMap((item) => {
          const history = histories.get(item.id);
          const again = history && rescoreItem(item, history, picks.generatedAt, settings);
          if (again) return [again];
          unscored.add(item.id);
          return [];
        });
        const ready: MyHoursState = {
          status: 'ready',
          picks: {
            ...picks,
            items: scored,
            settings: { ...(picks.settings ?? jobSettings), ...hours },
          },
          unscored,
        };
        set(ready);
        if (!controller.signal.aborted) setLast({ key, state: ready });
      })
      .catch(() => set({ status: 'error' }));
    return () => controller.abort();
  }, [needed, key, total, picks, jobSettings, hours, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  let state: MyHoursState = { status: 'job' };
  if (needed) {
    // Until this run reports, it has only just started (never the job's or old hours' list).
    const current: MyHoursState =
      run?.key === key ? run.state : { status: 'scoring', done: 0, total };
    const previous = last && hoursKey(last.key) === hoursKey(key) ? last.state : null;
    state = current.status !== 'ready' && previous ? previous : current;
  }
  return { state, retry };
}
