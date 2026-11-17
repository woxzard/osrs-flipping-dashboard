import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PicksFile } from '../shared/picks.ts';
import { formatGp } from '../shared/format.ts';
import {
  FEW_PICKS,
  isPublishedItem,
  rankPicks,
  settingsFor,
  type Choice,
  type Ranking,
} from '../shared/rank.ts';
import { cashPerSlot } from '../shared/scoring.ts';
import { SETTINGS } from '../shared/settings.ts';
import { loadStoredChoice, readChoice, storeChoice, writeChoice } from './choice.ts';
import { BackButton } from './BackButton.tsx';
import { Controls } from './Controls.tsx';
import { Freshness, isStale, StaleNotice } from './Freshness.tsx';
import { loadPicks } from './data.ts';
import { ItemDetail } from './ItemDetail.tsx';
import { PickRow } from './PickRow.tsx';
import {
  itemHref,
  readItemId,
  readView,
  savedScroll,
  saveScroll,
  VIEW_NAME,
  viewHref,
  withoutItem,
  type View,
} from './route.ts';
import { MyFlips, Watchlist } from './Lists.tsx';
import { SettingsScreen } from './SettingsScreen.tsx';
import { TabBar } from './TabBar.tsx';

type State =
  | { status: 'loading' }
  | { status: 'none' }
  | { status: 'error' }
  | { status: 'ready'; picks: PicksFile };

/** The controls' choice, kept in the address and remembered on this phone. */
function useChoice() {
  const [choice, setChoice] = useState<Choice>(() =>
    readChoice(window.location.search, loadStoredChoice()),
  );

  // Write the choice into the address (replacing, so back isn't a trail of
  // chip taps) and remember it for the next visit.
  useEffect(() => {
    const search = writeChoice(choice, window.location.search);
    if (search !== window.location.search) {
      window.history.replaceState(window.history.state, '', search + window.location.hash);
    }
  }, [choice]);

  // Remembered only when changed here: opening a pasted link doesn't
  // overwrite the last choice on this phone.
  const change = useCallback((next: Choice) => {
    setChoice(next);
    storeChoice(next);
  }, []);

  // Back and forward bring their own address: follow it.
  useEffect(() => {
    const onPop = () => setChoice(readChoice(window.location.search, loadStoredChoice()));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return [choice, change] as const;
}

/**
 * Where the page is: the tab and the open item, both kept in the address.
 * Opening an item or switching tabs adds a history entry, so back (button,
 * gesture or the page's own) returns to the list it came from, which stays
 * mounted underneath, at the same scroll position.
 */
function useNav(picksShown: boolean) {
  const [place, setPlace] = useState(readPlace);

  useEffect(() => {
    const onPop = () => setPlace(readPlace());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // A list position waiting to be put back: on arriving at a list (back from
  // an item, or another tab) and on a refresh. It waits for the picks to load,
  // so the page is tall enough to get there.
  const pending = useRef<number | null>(
    place.itemId === null ? savedScroll(window.location.search) : null,
  );
  const ready = place.view !== 'picks' || picksShown;
  const previous = useRef(place);
  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = place;
    if (before.view !== place.view || before.itemId !== place.itemId) {
      pending.current = place.itemId === null ? (savedScroll(window.location.search) ?? 0) : null;
    }
    if (pending.current !== null && ready) {
      window.scrollTo(0, pending.current);
      pending.current = null;
    }
  }, [place, ready]);

  // Remember where each list is scrolled to (not an item: it starts at the
  // top), at most once a frame, and not while a position waits to go back.
  const save = useCallback(() => {
    if (pending.current === null && readItemId(window.location.search) === null) {
      saveScroll(window.location.search, window.scrollY);
    }
  }, []);
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        save();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [save]);

  const go = useCallback(
    (href: string) => {
      save();
      window.history.pushState({ fromList: true }, '', href);
      // The page puts lists back itself on the entries it makes.
      window.history.scrollRestoration = 'manual';
      setPlace(readPlace());
    },
    [save],
  );

  const open = useCallback((id: number) => go(itemHref(window.location.search, id)), [go]);

  const close = useCallback(() => {
    if ((window.history.state as { fromList?: boolean } | null)?.fromList) {
      window.history.back(); // popstate closes it
      return;
    }
    // Opened from a link: there's no list entry to go back to, so make one.
    window.history.replaceState(null, '', withoutItem(window.location.search));
    setPlace(readPlace());
  }, []);

  const showView = useCallback(
    (view: View) => {
      const current = readPlace();
      if (view !== current.view) {
        go(viewHref(window.location.search, view));
      } else if (current.itemId !== null) {
        close(); // the open item's own tab: back to its list
      } else {
        window.scrollTo(0, 0); // the tab already shown: back to its top
      }
    },
    [go, close],
  );

  return { ...place, open, close, showView };
}

function readPlace() {
  return {
    view: readView(window.location.search),
    itemId: readItemId(window.location.search),
  };
}

const VOLUME_NAME = { all: '', high: 'High-volume ', low: 'Low-volume ' } as const;

/** Why the list is short, and what to try (docs/spec.md §7.3). */
function shortListReason(ranking: Ranking, choice: Choice): string {
  const perSlot = formatGp(ranking.cashPerSlot);
  const count = ranking.picks.length;
  const what = `${VOLUME_NAME[choice.volume]}${count === 1 ? 'flip' : 'flips'}`;
  const found = count === 0 ? `No ${what}` : `Only ${count} ${what}`;
  switch (choice.volume) {
    case 'low':
      return `${found} at ${perSlot} per slot. A small order is a small part of the trading, so most items count as High volume. Try All, or more cash per slot.`;
    case 'high':
      return `${found} at ${perSlot} per slot. A large order is a big part of the trading, so most items count as Low volume. Try All, or less cash per slot.`;
    default:
      return `${found} ${count === 1 ? 'makes' : 'make'} a profit at ${perSlot} per slot. Try more cash per slot.`;
  }
}

function usePicks() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    loadPicks(controller.signal).then(
      (picks) => setState(picks ? { status: 'ready', picks } : { status: 'none' }),
      () => {
        if (!controller.signal.aborted) setState({ status: 'error' });
      },
    );
    return () => controller.abort();
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  // Quietly fetch again when the page comes back into view, and every few
  // minutes while the shown file is over two hours old: an open tab mustn't
  // keep an old copy and blame the hourly job for it. Failures change nothing.
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);
  useEffect(() => {
    let lastCheck = Date.now();
    let controller: AbortController | undefined;
    const refresh = () => {
      const current = latest.current;
      if (current.status !== 'ready' || Date.now() - lastCheck < 60_000) return;
      lastCheck = Date.now();
      controller?.abort();
      controller = new AbortController();
      loadPicks(controller.signal).then(
        (picks) => {
          if (picks && picks.generatedAt !== current.picks.generatedAt) {
            setState({ status: 'ready', picks });
          }
        },
        () => {},
      );
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const timer = setInterval(() => {
      const current = latest.current;
      if (
        document.visibilityState === 'visible' &&
        current.status === 'ready' &&
        isStale(new Date(current.picks.generatedAt), new Date())
      ) {
        refresh();
      }
    }, 5 * 60_000);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      controller?.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return { state, retry };
}

function Picks({
  picks,
  choice,
  onShowAll,
  onOpen,
}: {
  picks: PicksFile;
  choice: Choice;
  onShowAll: () => void;
  onOpen: (id: number) => void;
}) {
  const settings = useMemo(() => settingsFor(picks.settings), [picks.settings]);
  const ranking = useMemo(
    () => rankPicks(picks.items, choice, settings),
    [picks.items, choice, settings],
  );

  if (ranking.published === 0) {
    return (
      <section className="card" aria-labelledby="empty-title">
        <h2 id="empty-title">Nothing qualifies right now</h2>
        <p>The last update found no flips worth listing. Check back after the next update.</p>
      </section>
    );
  }

  const short = ranking.picks.length < FEW_PICKS && (
    <section className="card" aria-labelledby="short-title">
      <h2 id="short-title">{ranking.picks.length === 0 ? 'Nothing qualifies' : 'A short list'}</h2>
      <p>{shortListReason(ranking, choice)}</p>
      {choice.volume !== 'all' && ranking.qualifyingAll > ranking.qualifying && (
        <button type="button" className="button" onClick={onShowAll}>
          Show all volumes
        </button>
      )}
    </section>
  );

  const summary =
    ranking.picks.length < FEW_PICKS
      ? shortListReason(ranking, choice)
      : `${ranking.picks.length} picks for ${formatGp(ranking.cashPerSlot)} per slot.`;

  return (
    <>
      {/* Always present, so screen readers announce each change of the list. */}
      <p className="visually-hidden" role="status">
        {summary}
      </p>
      {short}
      {ranking.picks.length > 0 && (
        <ol className="list" aria-label="Picks">
          {ranking.picks.map((pick) => (
            <li key={pick.item.id}>
              <PickRow
                pick={pick}
                settings={settings}
                href={itemHref(window.location.search, pick.item.id)}
                onOpen={() => onOpen(pick.item.id)}
              />
            </li>
          ))}
        </ol>
      )}
      <p className="note">
        <strong>Nights:</strong> on how many of the last {settings.nights} nights both your buy and
        your sell would have filled. Even the best items manage about 10 of 14.
      </p>
    </>
  );
}

function PicksStates({ state, retry }: { state: State; retry: () => void }) {
  return (
    <>
      {state.status === 'loading' && (
        <ul className="list skeleton" aria-busy="true" aria-label="Loading picks">
          {[1, 2, 3].map((row) => (
            <li key={row} className="pick-placeholder" />
          ))}
        </ul>
      )}

      {state.status === 'none' && (
        <section className="card" aria-labelledby="none-title">
          <h2 id="none-title">No picks yet</h2>
          <p>The hourly price job hasn't published anything yet. Check back after its first run.</p>
        </section>
      )}

      {state.status === 'error' && (
        <section className="card" role="alert" aria-labelledby="error-title">
          <h2 id="error-title">Couldn't load the picks</h2>
          <p>Check your connection, then try again.</p>
          <button type="button" className="button" onClick={retry}>
            Try again
          </button>
        </section>
      )}
    </>
  );
}

function Detail({
  itemId,
  state,
  retry,
  choice,
  backLabel,
  onBack,
}: {
  itemId: number;
  state: State;
  retry: () => void;
  choice: Choice;
  backLabel: string;
  onBack: () => void;
}) {
  if (state.status !== 'ready') {
    return (
      <>
        <BackButton label={backLabel} onBack={onBack} />
        <PicksStates state={state} retry={retry} />
      </>
    );
  }
  const item = state.picks.items.find((entry) => entry.id === itemId);
  if (!item || !isPublishedItem(item)) {
    return (
      <>
        <BackButton label={backLabel} onBack={onBack} />
        <section className="card" aria-labelledby="gone-title">
          <h2 id="gone-title">Not in the latest update</h2>
          <p>This item isn't among the flips the last hourly update looked at.</p>
        </section>
      </>
    );
  }
  return (
    <ItemDetail
      item={item}
      choice={choice}
      settings={settingsFor(state.picks.settings)}
      generatedAt={state.picks.generatedAt}
      backLabel={backLabel}
      onBack={onBack}
      notice={<StaleNotice generatedAt={state.picks.generatedAt} />}
    />
  );
}

export function App() {
  const { state, retry } = usePicks();
  const [choice, setChoice] = useChoice();
  const { view, itemId, open, close, showView } = useNav(state.status !== 'loading');
  const settings = state.status === 'ready' ? settingsFor(state.picks.settings) : SETTINGS;
  const onList = itemId === null;

  // Say which screen this is (an item names itself).
  useEffect(() => {
    if (onList) {
      document.title =
        view === 'picks' ? 'OSRS overnight flips' : `${VIEW_NAME[view]} · Overnight flips`;
    }
  }, [view, onList]);

  return (
    <main className="page">
      {/* Every list stays mounted under an open item or another tab, so back finds it as it was. */}
      <div hidden={!onList || view !== 'picks'}>
        <header className="page-header">
          <h1>Overnight flips</h1>
          {state.status === 'ready' ? (
            <Freshness generatedAt={state.picks.generatedAt} />
          ) : (
            <p className="muted">Old School RuneScape</p>
          )}
        </header>

        <Controls
          choice={choice}
          cashPerSlot={cashPerSlot(choice.cash, choice.freeSlots)}
          highVolumeShare={settings.highVolumeShare}
          onChange={setChoice}
        />

        <PicksStates state={state} retry={retry} />

        {state.status === 'ready' && (
          <Picks
            picks={state.picks}
            choice={choice}
            onShowAll={() => setChoice({ ...choice, volume: 'all' })}
            onOpen={open}
          />
        )}
      </div>

      <div hidden={!onList || view !== 'flips'}>
        <MyFlips onShowPicks={() => showView('picks')} />
      </div>
      <div hidden={!onList || view !== 'watch'}>
        <Watchlist onShowPicks={() => showView('picks')} />
      </div>
      <div hidden={!onList || view !== 'settings'}>
        <SettingsScreen settings={settings} />
      </div>

      {itemId !== null && (
        <Detail
          itemId={itemId}
          state={state}
          retry={retry}
          choice={choice}
          backLabel={VIEW_NAME[view]}
          onBack={close}
        />
      )}

      <footer className="footer">Prices and icons: OSRS Wiki</footer>

      <TabBar
        current={view}
        search={writeChoice(choice, window.location.search)}
        onSelect={showView}
      />
    </main>
  );
}
