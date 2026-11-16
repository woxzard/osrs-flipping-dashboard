/**
 * The results file the hourly job publishes and the page reads
 * (docs/spec.md §6). Fields are only ever added, so an older page keeps
 * working with a newer file.
 */
export interface PickItem {
  id: number;
  name: string;
}

export interface PicksFile {
  /** When the job produced this file (ISO 8601, UTC). */
  generatedAt: string;
  items: PickItem[];
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
