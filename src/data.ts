import { parsePicksFile, type PicksFile } from '../shared/picks.ts';

/**
 * Where the hourly job publishes its results: the `data` branch, read
 * straight from GitHub so a refresh never needs a deploy (docs/spec.md §3).
 */
export const PICKS_URL: string =
  import.meta.env.VITE_PICKS_URL ??
  'https://raw.githubusercontent.com/woxzard/osrs-flipping-dashboard/data/picks.json';

/** The published picks, or `null` when the job hasn't published anything yet. */
export async function loadPicks(signal?: AbortSignal): Promise<PicksFile | null> {
  const response = await fetch(PICKS_URL, { signal, cache: 'no-cache' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Loading picks failed: HTTP ${response.status}`);
  return parsePicksFile(await response.json());
}
