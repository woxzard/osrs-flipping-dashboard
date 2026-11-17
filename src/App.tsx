import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PicksFile } from '../shared/picks.ts';
import { formatGp } from '../shared/format.ts';
import { FEW_PICKS, rankPicks, settingsFor, type Choice, type Ranking } from '../shared/rank.ts';
import { cashPerSlot } from '../shared/scoring.ts';
import { SETTINGS } from '../shared/settings.ts';
import { formatAgo, formatManilaTime } from '../shared/time.ts';
import { loadStoredChoice, readChoice, storeChoice, writeChoice } from './choice.ts';
import { Controls } from './Controls.tsx';
import { loadPicks } from './data.ts';
import { PickRow } from './PickRow.tsx';

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

  return { state, retry };
}

/** The current time, refreshed often enough for "23 min ago" to stay true. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function Freshness({ generatedAt }: { generatedAt: string }) {
  const now = useNow();
  const at = new Date(generatedAt);
  return (
    <p className="muted">
      Updated {formatAgo(at, now)} · <time dateTime={generatedAt}>{formatManilaTime(at)}</time>{' '}
      Manila time
    </p>
  );
}

function Picks({
  picks,
  choice,
  onShowAll,
}: {
  picks: PicksFile;
  choice: Choice;
  onShowAll: () => void;
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
    <section className="card" aria-labelledby="short-title" aria-live="polite">
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
              <PickRow pick={pick} settings={settings} />
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

export function App() {
  const { state, retry } = usePicks();
  const [choice, setChoice] = useChoice();

  return (
    <main className="page">
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
        highVolumeShare={
          (state.status === 'ready' ? settingsFor(state.picks.settings) : SETTINGS).highVolumeShare
        }
        onChange={setChoice}
      />

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

      {state.status === 'ready' && (
        <Picks
          picks={state.picks}
          choice={choice}
          onShowAll={() => setChoice({ ...choice, volume: 'all' })}
        />
      )}
      <footer className="footer">Prices and icons: OSRS Wiki</footer>
    </main>
  );
}
