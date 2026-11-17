import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PicksFile } from '../shared/picks.ts';
import { rankPicks, settingsFor, type Choice } from '../shared/rank.ts';
import { formatAgo, formatManilaTime } from '../shared/time.ts';
import { loadPicks } from './data.ts';
import { PickRow } from './PickRow.tsx';

type State =
  | { status: 'loading' }
  | { status: 'none' }
  | { status: 'error' }
  | { status: 'ready'; picks: PicksFile };

/** Until the controls arrive: 50m in one slot, every volume. */
const DEFAULT_CHOICE: Choice = { cash: 50_000_000, freeSlots: 1, volume: 'all' };

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

function Picks({ picks, choice }: { picks: PicksFile; choice: Choice }) {
  const settings = useMemo(() => settingsFor(picks.settings), [picks.settings]);
  const ranking = useMemo(
    () => rankPicks(picks.items, choice, settings),
    [picks.items, choice, settings],
  );

  if (ranking.picks.length === 0) {
    return (
      <section className="card" aria-labelledby="empty-title">
        <h2 id="empty-title">Nothing qualifies right now</h2>
        <p>The last update found no flips worth listing.</p>
      </section>
    );
  }

  return (
    <>
      <ol className="list" aria-label="Picks">
        {ranking.picks.map((pick) => (
          <li key={pick.item.id}>
            <PickRow pick={pick} settings={settings} />
          </li>
        ))}
      </ol>
      <p className="note">
        <strong>Nights:</strong> on how many of the last {settings.nights} nights both your buy and
        your sell would have filled. Even the best items manage about 10 of 14.
      </p>
    </>
  );
}

export function App() {
  const { state, retry } = usePicks();

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

      {state.status === 'ready' && <Picks picks={state.picks} choice={DEFAULT_CHOICE} />}
      <footer className="footer">Prices and icons: OSRS Wiki</footer>
    </main>
  );
}
