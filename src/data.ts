import {
  parseHistoryFile,
  parsePicksFile,
  type HistoryFile,
  type PicksFile,
} from '../shared/picks.ts';

/**
 * Where the hourly job publishes its results: the `data` branch, read
 * straight from GitHub so a refresh never needs a deploy (docs/spec.md §3).
 */
export const PICKS_URL: string =
  import.meta.env.VITE_PICKS_URL ??
  'https://raw.githubusercontent.com/woxzard/osrs-flipping-dashboard/data/picks.json';

/** An item's hourly history sits next to the results file: `history/<id>.json`. */
export const historyUrl = (id: number): string =>
  new URL(`history/${id}.json`, new URL(PICKS_URL, window.location.href)).toString();

/** The published picks, or `null` when the job hasn't published anything yet. */
export async function loadPicks(signal?: AbortSignal): Promise<PicksFile | null> {
  const response = await fetch(PICKS_URL, { signal, cache: 'no-cache' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Loading picks failed: HTTP ${response.status}`);
  return parsePicksFile(await response.json());
}

/** One item's hourly history, loaded when the item is opened; `null` if none was published. */
export async function loadHistory(id: number, signal?: AbortSignal): Promise<HistoryFile | null> {
  const response = await fetch(historyUrl(id), { signal, cache: 'no-cache' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Loading history failed: HTTP ${response.status}`);
  return parseHistoryFile(await response.json(), id);
}
