import { formatGp } from '../shared/format.ts';

export function App() {
  return (
    <main className="page">
      <header className="page-header">
        <h1>Overnight flips</h1>
        <p className="muted">Old School RuneScape · Manila time</p>
      </header>

      <section className="empty" aria-labelledby="empty-title">
        <h2 id="empty-title">No picks yet</h2>
        <p>
          The hourly price job isn't running yet. Once it is, the best flips for your cash (for
          example {formatGp(50_000_000)} across your free slots) will show up here.
        </p>
      </section>
    </main>
  );
}
