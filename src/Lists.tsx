/** The My flips and Watchlist tabs (docs/spec.md §7.7). */
import { formatExactGp, formatGp } from '../shared/format.ts';
import { formatAgo } from '../shared/time.ts';
import { useNow } from './Freshness.tsx';
import { ItemIcon } from './ItemIcon.tsx';
import type { Flip } from './personal.ts';
import { itemHref } from './route.ts';

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

/** Said on a list's screen when this browser won't keep what's on it. */
export function UnsavedNotice() {
  return (
    <p className="stale" role="alert">
      <span aria-hidden="true">⚠</span> This browser isn't keeping your lists (private browsing or
      blocked storage), so they'll be gone when it closes.
    </p>
  );
}

function FlipRow({
  flip,
  now,
  sellNow,
  onOpen,
  onSold,
}: {
  flip: Flip;
  now: Date;
  /** This hour's suggested sell price, if the item is in the latest update. */
  sellNow?: number;
  onOpen: () => void;
  onSold: () => void;
}) {
  return (
    <article className="pick" aria-label={flip.name}>
      <header className="pick-head">
        <ItemIcon key={flip.icon} icon={flip.icon} name={flip.name} />
        <h2 className="pick-name">
          <a
            className="row-link"
            href={itemHref(window.location.search, flip.id)}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
              event.preventDefault();
              onOpen();
            }}
          >
            {flip.name}
          </a>
        </h2>
      </header>
      <dl className="pick-stats">
        <div>
          <dt>Buy at</dt>
          <dd className="price">{formatExactGp(flip.buyPrice)}</dd>
        </div>
        <div>
          <dt>Sell at</dt>
          <dd className="price">{formatExactGp(flip.sellPrice)}</dd>
        </div>
        <div>
          <dt>Quantity</dt>
          <dd>{formatExactGp(flip.quantity)}</dd>
        </div>
        <div>
          <dt>Profit after tax</dt>
          <dd>
            <strong>{formatGp(flip.profit)}</strong>
          </dd>
        </div>
      </dl>
      <p className="pick-meta">
        <span>Ticked {formatAgo(new Date(flip.at), now)}</span>
        {sellNow !== undefined && sellNow !== flip.sellPrice && (
          <span>This hour: sell at {formatExactGp(sellNow)}</span>
        )}
      </p>
      <div className="pick-actions">
        <button
          type="button"
          className="button secondary"
          aria-label={`Sold: ${flip.name}`}
          onClick={onSold}
        >
          Sold
        </button>
      </div>
    </article>
  );
}

export function MyFlips({
  shown,
  flips,
  sellNow,
  unsaved,
  onOpen,
  onSold,
  onShowPicks,
}: {
  /** False while another tab is shown: the "ticked … ago" clock pauses. */
  shown: boolean;
  flips: Flip[];
  /** This hour's suggested sell price per item id, from the latest update. */
  sellNow: ReadonlyMap<number, number>;
  unsaved: boolean;
  onOpen: (id: number) => void;
  onSold: (id: number) => void;
  onShowPicks: () => void;
}) {
  const now = useNow(shown);
  return (
    <>
      <header className="page-header">
        <h1>My flips</h1>
        <p className="muted">Items you're flipping, until you mark them sold.</p>
      </header>
      {unsaved && <UnsavedNotice />}
      {flips.length === 0 ? (
        <Empty
          id="flips-empty"
          title="No flips yet"
          text="Tap “I'm flipping this” on a pick: it leaves the picks and waits here until you mark it sold."
          onShowPicks={onShowPicks}
        />
      ) : (
        <ol className="list" aria-label="My flips">
          {flips.map((flip) => (
            <li key={flip.id}>
              <FlipRow
                flip={flip}
                now={now}
                sellNow={sellNow.get(flip.id)}
                onOpen={() => onOpen(flip.id)}
                onSold={() => onSold(flip.id)}
              />
            </li>
          ))}
        </ol>
      )}
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
