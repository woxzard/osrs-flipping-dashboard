import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { formatGp } from '../shared/format.ts';
import type { PublishedItem } from '../shared/picks.ts';
import { rankItem, type Choice } from '../shared/rank.ts';
import { cashPerSlot } from '../shared/scoring.ts';
import type { Settings } from '../shared/settings.ts';
import { ItemIcon } from './ItemIcon.tsx';
import { Empty, UnsavedNotice } from './Lists.tsx';
import type { SavedItem } from './personal.ts';
import { PickRow } from './PickRow.tsx';
import { itemHref } from './route.ts';
import { RowLink } from './RowLink.tsx';
import { searchItems } from './search.ts';
import type { ItemRef } from './usePersonal.ts';

/** At most this many search results, so the list under it stays in reach. */
const MAX_RESULTS = 8;

/** Where the latest update is: the Watchlist needs it for numbers and the search. */
export type UpdateStatus = 'loading' | 'ready' | 'error' | 'none';

/**
 * The search text, kept in the address so refresh and back bring it back.
 * Written at most every 300 ms: Safari refuses a burst of address changes.
 */
function useQuery(shown: boolean) {
  const [query, setQuery] = useState(
    () => new URLSearchParams(window.location.search).get('q') ?? '',
  );
  useEffect(() => {
    if (!shown) return; // other tabs don't carry it
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if ((params.get('q') ?? '') === query) return;
      if (query) params.set('q', query);
      else params.delete('q');
      try {
        window.history.replaceState(window.history.state, '', `?${params.toString()}`);
      } catch {
        // Too many changes at once: the search still works, the address catches up next time.
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, shown]);
  return [query, setQuery] as const;
}

/** Why a watched item has no numbers at this cash, in words that say what would help. */
function noProfitReason(item: PublishedItem, perSlot: number): string {
  if (item.profitPerItem <= 0) return 'No margin after tax this hour.';
  if (item.buyPrice > perSlot) return `Costs more than the ${formatGp(perSlot)} per slot.`;
  return 'Too little trades in your night hours to size an order.';
}

/** A watched item without numbers to show: why, and the way to remove it. */
function ShortRow({
  saved,
  note,
  actions,
  onOpen,
}: {
  saved: SavedItem;
  note: string;
  actions: ReactNode;
  onOpen: () => void;
}) {
  return (
    <article className="pick" aria-label={saved.name}>
      <header className="pick-head">
        <ItemIcon key={saved.icon} icon={saved.icon} name={saved.name} />
        <h2 className="pick-name">
          <RowLink
            href={itemHref(window.location.search, saved.id)}
            name={saved.name}
            onOpen={onOpen}
          />
        </h2>
      </header>
      <p className="pick-meta muted-inline">{note}</p>
      <div className="pick-actions">{actions}</div>
    </article>
  );
}

export function Watchlist({
  shown,
  watch,
  watched,
  unscored,
  items,
  status,
  retry,
  choice,
  settings,
  flipping,
  blocked,
  unsaved,
  onWatch,
  onUnwatch,
  onOpen,
  onShowPicks,
}: {
  /** False while another tab or an item is shown. */
  shown: boolean;
  watch: SavedItem[];
  /** The same items, by id. */
  watched: ReadonlySet<number>;
  /** In the update, but not scorable with my night hours. */
  unscored: ReadonlySet<number>;
  /** The items in the latest update (the ~290 scored each hour). */
  items: readonly PublishedItem[];
  status: UpdateStatus;
  retry: () => void;
  choice: Choice;
  settings: Settings;
  /** Items I'm flipping, said on their rows. */
  flipping: ReadonlySet<number>;
  /** Items I blocked: still watched, but never in the picks. */
  blocked: ReadonlySet<number>;
  unsaved: boolean;
  onWatch: (item: ItemRef) => void;
  onUnwatch: (id: number) => void;
  onOpen: (id: number) => void;
  onShowPicks: () => void;
}) {
  const [query, setQuery] = useQuery(shown);
  const searchId = useId();
  const searchBox = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const results = useMemo(() => searchItems(items, query), [items, query]);
  const perSlot = cashPerSlot(choice.cash, choice.freeSlots);

  const remove = (saved: SavedItem) => (
    <button
      type="button"
      className="button secondary"
      aria-label={`Remove from watchlist: ${saved.name}`}
      onClick={() => {
        onUnwatch(saved.id);
        list.current?.focus({ preventScroll: true }); // the row is gone: stay on the list
      }}
    >
      Remove
    </button>
  );

  // Why a watched item has no numbers when the update itself isn't there.
  const missingNote =
    status === 'loading'
      ? "Loading this hour's numbers…"
      : status === 'ready'
        ? "Not in this hour's update: it shows again when it's among the items scored."
        : "This hour's numbers couldn't be loaded.";

  return (
    <>
      <header className="page-header">
        <h1>Watchlist</h1>
        <p className="muted">Items you follow, with this hour's numbers for your cash.</p>
      </header>
      {unsaved && <UnsavedNotice />}

      {status === 'error' && (
        <section className="card" role="alert" aria-labelledby="watch-error-title">
          <h2 id="watch-error-title">Couldn't load this hour's numbers</h2>
          <p>Check your connection, then try again.</p>
          <button type="button" className="button" onClick={retry}>
            Try again
          </button>
        </section>
      )}

      <section className="watch-search" aria-label="Add an item">
        <label htmlFor={searchId} className="control-label">
          Add an item
        </label>
        <input
          id={searchId}
          ref={searchBox}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Item name"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {status === 'ready' ? (
          <p className="small muted">Searches the {items.length} items scored this hour.</p>
        ) : (
          <p className="small muted">
            {status === 'loading'
              ? 'Search works once this hour’s items have loaded.'
              : 'Search needs this hour’s items, which aren’t here yet.'}
          </p>
        )}
        {status === 'ready' && query.trim() !== '' && (
          <>
            {results.length === 0 ? (
              <p className="search-none">
                No item called “{query.trim()}” this hour.{' '}
                <button type="button" className="link-button" onClick={() => setQuery('')}>
                  Clear search
                </button>
              </p>
            ) : (
              <ul className="search-results" aria-label="Search results">
                {results.slice(0, MAX_RESULTS).map((item) => (
                  <li key={item.id}>
                    <ItemIcon key={item.icon} icon={item.icon} name={item.name} />
                    <span className="search-name">{item.name}</span>
                    {watched.has(item.id) ? (
                      <span className="tag">
                        <span aria-hidden="true">★</span> Watching
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="button secondary"
                        aria-label={`Watch ${item.name}`}
                        onClick={() => {
                          onWatch(item);
                          setQuery(''); // the new item shows first in the list below
                          searchBox.current?.focus({ preventScroll: true });
                        }}
                      >
                        Watch
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {results.length > MAX_RESULTS && (
              <p className="small muted">
                {results.length - MAX_RESULTS} more: type more of the name.
              </p>
            )}
          </>
        )}
      </section>

      {watch.length === 0 ? (
        <Empty
          id="watch-empty"
          title="Nothing watched yet"
          text="Search above, or open an item and tap Watch, to follow it here even when it isn't a top pick."
          onShowPicks={onShowPicks}
        />
      ) : (
        <ol className="list" aria-label="Watchlist" ref={list} tabIndex={-1}>
          {watch.map((saved) => {
            const item = byId.get(saved.id);
            const open = () => onOpen(saved.id);
            const pick = item && rankItem(item, perSlot, settings);
            return (
              <li key={saved.id}>
                {pick ? (
                  <PickRow
                    pick={pick}
                    settings={settings}
                    href={itemHref(window.location.search, saved.id)}
                    onOpen={open}
                    actions={
                      <>
                        {flipping.has(saved.id) && (
                          <span className="tag">You're flipping this</span>
                        )}
                        {blocked.has(saved.id) && <span className="tag">Blocked</span>}
                        {remove(saved)}
                      </>
                    }
                  />
                ) : (
                  <ShortRow
                    saved={saved}
                    note={
                      item
                        ? noProfitReason(item, perSlot)
                        : unscored.has(saved.id)
                          ? "Your night hours don't leave enough trading to score it this hour."
                          : missingNote
                    }
                    actions={remove(saved)}
                    onOpen={open}
                  />
                )}
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
