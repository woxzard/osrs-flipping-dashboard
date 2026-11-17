import type { ReactNode } from 'react';
import { formatExactGp, formatGp, formatPercent } from '../shared/format.ts';
import { fillWord, type RankedPick } from '../shared/rank.ts';
import { ItemIcon } from './ItemIcon.tsx';
import { RowLink } from './RowLink.tsx';
import type { Settings } from '../shared/settings.ts';
import { flagText, TREND_TEXT } from './labels.ts';

/** One pick: what to offer, what it ties up, what it should make, how often it worked. */
export function PickRow({
  pick,
  settings,
  href,
  onOpen,
  watched = false,
  actions,
}: {
  pick: RankedPick;
  settings: Settings;
  /** The item's own address, so the row is a real link (new tab, copy link). */
  href: string;
  onOpen: () => void;
  /** Marked "Watching" when it's on my watchlist. */
  watched?: boolean;
  /** The row's buttons ("I'm flipping this", "Remove"), kept above the card's link. */
  actions: ReactNode;
}) {
  const { item } = pick;
  // Out of the full count even for a newer item, as the ranking does (docs/spec.md §5).
  const nights = Math.max(settings.nights, item.nights.length);
  const trend = TREND_TEXT[item.trend];
  return (
    <article className="pick" aria-label={item.name}>
      <header className="pick-head">
        <ItemIcon key={item.icon} icon={item.icon} name={item.name} />
        <h2 className="pick-name">
          {/* The link covers the whole card (see .row-link in styles.css). */}
          <RowLink href={href} name={item.name} onOpen={onOpen} />
        </h2>
        {watched && (
          <span className="tag">
            <span aria-hidden="true">★</span> Watching
          </span>
        )}
      </header>
      <dl className="pick-stats">
        <div>
          <dt>Buy at</dt>
          <dd className="price">{formatExactGp(item.buyPrice)}</dd>
        </div>
        <div>
          <dt>Sell at</dt>
          <dd className="price">{formatExactGp(item.sellPrice)}</dd>
        </div>
        <div>
          <dt>Quantity</dt>
          <dd>
            {formatExactGp(pick.quantity)}{' '}
            <span className="muted-inline">for {formatGp(pick.cost)}</span>
          </dd>
        </div>
        <div>
          <dt>Profit after tax</dt>
          <dd>
            <strong>{formatGp(pick.profit)}</strong>{' '}
            <span className="muted-inline">· {formatPercent(pick.returnShare)}</span>
          </dd>
        </div>
      </dl>
      <p className="pick-meta">
        <span>
          {item.fillNights} of {nights} nights · {fillWord(item.fillNights, nights)}
        </span>
        <span>
          <span aria-hidden="true">{trend.arrow}</span> {trend.word}
        </span>
      </p>
      {item.flags.length > 0 && (
        <ul className="flags" aria-label="Warnings">
          {[...new Set(item.flags)].map((flag) => (
            <li key={flag}>
              <span aria-hidden="true">⚠</span> {flagText(flag, settings)}
            </li>
          ))}
        </ul>
      )}
      <div className="pick-actions">{actions}</div>
    </article>
  );
}
