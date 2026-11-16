import { useCallback, useEffect, useState } from 'react';
import type { PicksFile } from '../shared/picks.ts';
import { formatAgo, formatManilaTime } from '../shared/time.ts';
import { loadPicks } from './data.ts';

type State =
  | { status: 'loading' }
  | { status: 'none' }
  | { status: 'error' }
  | { status: 'ready'; picks: PicksFile };

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
          <li />
          <li />
          <li />
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

      {state.status === 'ready' &&
        (state.picks.items.length > 0 ? (
          <ul className="list" aria-label="Picks">
            {state.picks.items.map((item) => (
              <li key={item.id}>{item.name}</li>
            ))}
          </ul>
        ) : (
          <section className="card" aria-labelledby="empty-title">
            <h2 id="empty-title">Nothing qualifies right now</h2>
            <p>The last update found no flips worth listing.</p>
          </section>
        ))}
    </main>
  );
}
