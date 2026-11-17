/** The My flips and Watchlist tabs (docs/spec.md §7.7). */

function Empty({
  id,
  title,
  text,
  onShowPicks,
}: {
  id: string;
  title: string;
  text: string;
  onShowPicks: () => void;
}) {
  return (
    <section className="card" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      <p>{text}</p>
      <button type="button" className="button" onClick={onShowPicks}>
        See the picks
      </button>
    </section>
  );
}

export function MyFlips({ onShowPicks }: { onShowPicks: () => void }) {
  return (
    <>
      <header className="page-header">
        <h1>My flips</h1>
        <p className="muted">Items you're flipping, until you mark them sold.</p>
      </header>
      <Empty
        id="flips-empty"
        title="No flips yet"
        text="Tap “I'm flipping this” on a pick: it leaves the picks and waits here until you mark it sold."
        onShowPicks={onShowPicks}
      />
    </>
  );
}

export function Watchlist({ onShowPicks }: { onShowPicks: () => void }) {
  return (
    <>
      <header className="page-header">
        <h1>Watchlist</h1>
        <p className="muted">Items you follow, with this hour's numbers for your cash.</p>
      </header>
      <Empty
        id="watch-empty"
        title="Nothing watched yet"
        text="Open an item and tap Watch to follow it here, even when it isn't a top pick."
        onShowPicks={onShowPicks}
      />
    </>
  );
}
