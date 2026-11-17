/**
 * Where the page is, kept in the address: the tab (`?view=flips`) and the
 * open item (`?item=27226`). Scroll positions are remembered per list so back
 * and tab switches return to the same place (ux-fundamentals, owner's rule 1).
 */

/** The bottom bar's tabs. Picks is the default and has no `view` in the address. */
export type View = 'picks' | 'flips' | 'watch' | 'settings';

export const VIEWS: readonly View[] = ['picks', 'flips', 'watch', 'settings'];

export const VIEW_NAME: Record<View, string> = {
  picks: 'Picks',
  flips: 'My flips',
  watch: 'Watchlist',
  settings: 'Settings',
};

const isView = (text: string | null): text is View =>
  text !== null && (VIEWS as readonly string[]).includes(text);

/** The tab in `?view=…`; anything unknown is Picks. */
export function readView(search: string): View {
  const view = new URLSearchParams(search).get('view');
  return isView(view) ? view : 'picks';
}

/** The address of a tab's list, keeping the controls' choice and dropping any open item. */
export function viewHref(search: string, view: View): string {
  const params = new URLSearchParams(search);
  params.delete('q'); // a tab's search stays with that tab
  if (view === 'picks') params.delete('view');
  else params.set('view', view);
  return withoutItem(`?${params.toString()}`);
}

/** The item id in `?item=…`, or null for a list. Only plain digits count. */
export function readItemId(search: string): number | null {
  const text = new URLSearchParams(search).get('item') ?? '';
  return /^\d{1,9}$/.test(text) ? Number(text) : null;
}

/** The address of an item, keeping the tab it's opened from and the controls' choice. */
export function itemHref(search: string, id: number): string {
  const params = new URLSearchParams(search);
  params.set('item', String(id));
  return `?${params.toString()}`;
}

/** The list's address: the same query without the item. */
export function withoutItem(search: string): string {
  const params = new URLSearchParams(search);
  params.delete('item');
  const query = params.toString();
  return query ? `?${query}` : window.location.pathname;
}

const SCROLL_KEY = 'osrs-flips:scroll';
/** Enough lists for any back trail; older ones are dropped. */
const SCROLL_KEEP = 20;

/**
 * Which list a position belongs to: the picks for this cash, slots and
 * volume; any other tab whatever the choice, since its list doesn't depend on it.
 */
export function scrollKey(search: string): string {
  const view = readView(search);
  return view === 'picks' ? withoutItem(search) : `view=${view}`;
}

function loadScrolls(): Record<string, number> {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY) ?? 'null') as unknown;
    return typeof saved === 'object' && saved !== null ? (saved as Record<string, number>) : {};
  } catch {
    return {}; // nothing saved, storage blocked or a damaged value
  }
}

/** Remembers where the list with this address is scrolled to. */
export function saveScroll(search: string, y: number): void {
  const key = scrollKey(search);
  const scrolls = loadScrolls();
  delete scrolls[key]; // re-added last, so the newest are kept
  scrolls[key] = Math.max(0, Math.round(y));
  const keys = Object.keys(scrolls);
  for (const old of keys.slice(0, Math.max(0, keys.length - SCROLL_KEEP))) delete scrolls[old];
  try {
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify(scrolls));
  } catch {
    // Storage blocked: back still works, from the top.
  }
}

/** Where the list with this address was scrolled to, or null if it wasn't seen yet. */
export function savedScroll(search: string): number | null {
  const y = loadScrolls()[scrollKey(search)];
  return typeof y === 'number' && Number.isFinite(y) ? y : null;
}
