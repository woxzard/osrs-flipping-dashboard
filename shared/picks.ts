/**
 * The results file the hourly job publishes and the page reads
 * (docs/spec.md §6). Fields are only ever added, so an older page keeps
 * working with a newer file.
 */
import type { ItemScore } from './scoring.ts';
import type { Settings } from './settings.ts';

export interface PickItem {
  id: number;
  name: string;
}

/** One candidate as the job publishes it: the item plus its per-item numbers. */
export interface PublishedItem extends PickItem, ItemScore {
  /** File name of the item's icon on the Wiki. */
  icon: string;
  members: boolean;
  /** Buy limit per 4 hours. */
  limit: number;
  /** Items traded over the last 24 hours, both sides. */
  dailyVolume: number;
}

/** The settings a results file was scored with. */
export type PublishedSettings = Pick<
  Settings,
  | 'buyStartHour'
  | 'buyEndHour'
  | 'sellStartHour'
  | 'sellEndHour'
  | 'nights'
  | 'buyLevel'
  | 'sellLevel'
  | 'volumeShare'
  | 'fallingPenalty'
>;

export interface PicksFile {
  /** When the job produced this file (ISO 8601, UTC). */
  generatedAt: string;
  /** Best first, for the default cash per slot. Older files have only id and name. */
  items: (PickItem & Partial<PublishedItem>)[];
  settings?: PublishedSettings;
}

/** An item's hourly history, loaded when the item is opened: `history/<id>.json`. */
export interface HistoryFile {
  id: number;
  /** [hour start (seconds since 1970), sell-side price, buy-side price, sell-side volume, buy-side volume] */
  points: [number, number | null, number | null, number, number][];
}

/** Checks a downloaded results file; throws with a plain reason if it's unusable. */
export function parsePicksFile(value: unknown): PicksFile {
  if (typeof value !== 'object' || value === null) throw new Error('Results file is not an object');
  const { generatedAt, items } = value as Record<string, unknown>;
  if (typeof generatedAt !== 'string' || Number.isNaN(Date.parse(generatedAt))) {
    throw new Error('Results file has no valid update time');
  }
  if (!Array.isArray(items)) throw new Error('Results file has no item list');
  for (const item of items as unknown[]) {
    const { id, name } = (item ?? {}) as Record<string, unknown>;
    if (typeof id !== 'number' || typeof name !== 'string') {
      throw new Error('Results file has an item without an id or name');
    }
  }
  return value as PicksFile;
}

/** Checks a downloaded history file; throws with a plain reason if it's unusable. */
export function parseHistoryFile(value: unknown, id: number): HistoryFile {
  const { id: fileId, points } = (value ?? {}) as Record<string, unknown>;
  if (fileId !== id) throw new Error('History file is for another item');
  if (!Array.isArray(points)) throw new Error('History file has no hours');
  const price = (cell: unknown) => cell === null || (typeof cell === 'number' && cell > 0);
  const clean = (points as unknown[]).filter(
    (point): point is HistoryFile['points'][number] =>
      Array.isArray(point) &&
      point.length >= 5 &&
      typeof point[0] === 'number' &&
      Number.isFinite(point[0]) &&
      price(point[1]) &&
      price(point[2]) &&
      typeof point[3] === 'number' &&
      typeof point[4] === 'number',
  );
  return { id, points: clean.sort((a, b) => a[0] - b[0]) };
}
