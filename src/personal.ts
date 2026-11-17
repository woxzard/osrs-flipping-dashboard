/**
 * What's mine, kept in this phone's browser storage (docs/spec.md §7.7): the
 * items I'm flipping, my watchlist and my blocklist. Each entry keeps the
 * item's name and icon, so the lists still read well when an item drops out
 * of the hourly results.
 */

/** An item on one of my lists, and when it was put there (ISO 8601). */
export interface SavedItem {
  id: number;
  name: string;
  icon: string;
  at: string;
}

/** An item I'm flipping, with the offer as it was when I ticked it. */
export interface Flip extends SavedItem {
  buyPrice: number;
  sellPrice: number;
  quantity: number;
  profit: number;
}

/** The offer as sized when I ticked it. */
export type Offer = Pick<Flip, 'buyPrice' | 'sellPrice' | 'quantity' | 'profit'>;

export interface Personal {
  /** Newest first, as are the other lists. */
  flips: Flip[];
  watch: SavedItem[];
  block: SavedItem[];
}

export const EMPTY: Personal = { flips: [], watch: [], block: [] };

const STORAGE_KEY = 'osrs-flips:personal';
/** Raised if the stored shape ever changes, so old data can be moved over. */
const VERSION = 1;

const isId = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;
const isGp = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function readSaved(value: unknown): SavedItem | null {
  const { id, name, icon, at } = (value ?? {}) as Record<string, unknown>;
  if (!isId(id) || typeof name !== 'string' || !name) return null;
  return {
    id,
    name,
    icon: typeof icon === 'string' ? icon : '',
    at: typeof at === 'string' && !Number.isNaN(Date.parse(at)) ? at : new Date(0).toISOString(),
  };
}

function readFlip(value: unknown): Flip | null {
  const saved = readSaved(value);
  const { buyPrice, sellPrice, quantity, profit } = (value ?? {}) as Record<string, unknown>;
  if (!saved || !isGp(buyPrice) || !isGp(sellPrice) || !isGp(quantity) || !isGp(profit)) {
    return null;
  }
  return { ...saved, buyPrice, sellPrice, quantity, profit };
}

/** One entry per item, newest first. */
function tidy<T extends SavedItem>(list: unknown, read: (value: unknown) => T | null): T[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<number>();
  const kept: T[] = [];
  for (const value of list) {
    const entry = read(value);
    if (entry && !seen.has(entry.id)) {
      seen.add(entry.id);
      kept.push(entry);
    }
  }
  return kept.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/** Reads stored lists; a damaged entry is dropped, never the whole list. */
export function parsePersonal(text: string | null): Personal {
  if (!text) return EMPTY;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return EMPTY;
  }
  const { flips, watch, block } = (value ?? {}) as Record<string, unknown>;
  return {
    flips: tidy(flips, readFlip),
    watch: tidy(watch, readSaved),
    block: tidy(block, readSaved),
  };
}

export function loadPersonal(): Personal {
  try {
    return parsePersonal(localStorage.getItem(STORAGE_KEY));
  } catch {
    return EMPTY; // private mode or blocked storage
  }
}

/** Saves the lists; false if this browser won't keep them. */
export function storePersonal(personal: Personal): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, ...personal }));
    return true;
  } catch {
    return false;
  }
}

/** Another tab of the page changed the lists. */
export const isPersonalKey = (key: string | null) => key === STORAGE_KEY;

export type ListName = keyof Personal;

/** The list with this entry added (or moved to its own time), newest first. */
export function withEntry<K extends ListName>(
  personal: Personal,
  list: K,
  entry: Personal[K][number],
): Personal {
  const others = (personal[list] as SavedItem[]).filter((saved) => saved.id !== entry.id);
  const next = [...others, entry].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return { ...personal, [list]: next };
}

/** The list without this item. */
export function withoutEntry(personal: Personal, list: ListName, id: number): Personal {
  const current = personal[list] as SavedItem[];
  if (!current.some((saved) => saved.id === id)) return personal;
  return { ...personal, [list]: current.filter((saved) => saved.id !== id) };
}
