/**
 * The open item in the address, and the list's scroll position while an item
 * is open (ux-fundamentals, owner's rule 1).
 */
const SCROLL_KEY = 'osrs-flips:list-scroll';

/** The item id in `?item=…`, or null for the list. Only plain digits count. */
export function readItemId(search: string): number | null {
  const text = new URLSearchParams(search).get('item') ?? '';
  return /^\d{1,9}$/.test(text) ? Number(text) : null;
}

/** The address of an item, keeping the list's cash, slots and tab. */
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

/** Remembers where the list was scrolled to, for the list with this query. */
export function saveListScroll(search: string, y: number): void {
  try {
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ search: withoutItem(search), y }));
  } catch {
    // Storage blocked: back still works, from the top.
  }
}

/** Scrolls the list back to where it was, if it's the same list. */
export function restoreListScroll(search: string): void {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY) ?? 'null') as {
      search?: string;
      y?: number;
    } | null;
    sessionStorage.removeItem(SCROLL_KEY); // used once
    if (saved && saved.search === withoutItem(search) && typeof saved.y === 'number') {
      window.scrollTo(0, saved.y);
    }
  } catch {
    // Nothing saved, or storage blocked.
  }
}
