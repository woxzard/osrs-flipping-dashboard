import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { formatExactGp, formatGp, formatPercent } from '../shared/format.ts';
import type { HistoryFile, PublishedItem } from '../shared/picks.ts';
import { fillWord, type Choice } from '../shared/rank.ts';
import { cashPerSlot, nightStarts, sizePick } from '../shared/scoring.ts';
import type { Settings } from '../shared/settings.ts';
import { formatManilaDay, formatManilaDayTime } from '../shared/time.ts';
import { loadHistory } from './data.ts';
import { BackButton } from './BackButton.tsx';
import { ItemIcon } from './ItemIcon.tsx';
import { flagText, TREND_TEXT, wikiPageUrl } from './labels.ts';
import { PriceChart } from './PriceChart.tsx';

/** Buy offers this far under the last hour's price only fill on a dip: say so. */
const DIP_NOTE_FROM = 0.02;

type HistoryState =
  | { status: 'loading' }
  | { status: 'none' }
  | { status: 'error' }
  | { status: 'ready'; history: HistoryFile };

function useHistory(id: number) {
  const [state, setState] = useState<HistoryState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    loadHistory(id, controller.signal).then(
      (history) => setState(history ? { status: 'ready', history } : { status: 'none' }),
      () => {
        if (!controller.signal.aborted) setState({ status: 'error' });
      },
    );
    return () => controller.abort();
  }, [id, attempt]);
  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);
  return { state, retry };
}

/** An "hour" this many seconds before the update still counts as the last hour. */
const RECENT = 2 * 3600;

/**
 * The newest hour with a "sold at once" price up to the update, and how far
 * my buy sits under it. An older hour is named by its time, not "last hour".
 */
function lastHourLine(history: HistoryFile, buyPrice: number, generatedAt: string): string | null {
  const until = Date.parse(generatedAt) / 1000;
  let last: HistoryFile['points'][number] | undefined;
  for (const point of history.points) if (point[0] <= until && point[2] !== null) last = point;
  const sold = last?.[2];
  if (!last || sold == null) return null;
  const bought = last[1];
  const when =
    until - last[0] <= RECENT
      ? 'Last hour'
      : `Last trade, ${formatManilaDayTime(new Date(last[0] * 1000))}`;
  const prices = `${when}: sold at ${formatGp(sold)}${bought === null ? '' : `, bought at ${formatGp(bought)}`}.`;
  const under = (sold - buyPrice) / sold;
  return under >= DIP_NOTE_FROM
    ? `${prices} Your buy is ${Math.floor(under * 100)}% under, so it fills only if the price dips.`
    : prices;
}

export function ItemDetail({
  item,
  choice,
  settings,
  generatedAt,
  onBack,
  notice,
}: {
  item: PublishedItem;
  choice: Choice;
  settings: Settings;
  generatedAt: string;
  onBack: () => void;
  /** Shown under the item's name: the stale-data warning. */
  notice?: ReactNode;
}) {
  const { state, retry } = useHistory(item.id);
  const perSlot = cashPerSlot(choice.cash, choice.freeSlots);
  const sized = sizePick(item, perSlot, settings);
  const nights = Math.max(settings.nights, item.nights.length);
  const dates = nightStarts(new Date(generatedAt), item.nights.length, settings);
  const trend = TREND_TEXT[item.trend];

  // Start at the top, and say which screen this is.
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${item.name} · Overnight flips`;
    return () => {
      document.title = 'OSRS overnight flips';
    };
  }, [item.id, item.name]);

  return (
    <article className="detail" aria-labelledby="detail-title">
      <BackButton onBack={onBack} />
      <header className="pick-head detail-head">
        <ItemIcon key={item.icon} icon={item.icon} name={item.name} />
        <h1 id="detail-title" className="pick-name">
          {item.name}
        </h1>
      </header>
      {notice}

      <dl className="pick-stats card">
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
            {formatExactGp(sized.quantity)}{' '}
            <span className="muted-inline">for {formatGp(sized.cost)}</span>
          </dd>
        </div>
        <div>
          <dt>Profit after tax</dt>
          <dd>
            <strong>{formatGp(sized.profit)}</strong>
            {sized.cost > 0 && (
              <span className="muted-inline"> · {formatPercent(sized.profit / sized.cost)}</span>
            )}
          </dd>
        </div>
      </dl>
      <p className="muted small">Sized for {formatGp(perSlot)} per slot.</p>

      {item.flags.length > 0 && (
        <ul className="flags" aria-label="Warnings">
          {[...new Set(item.flags)].map((flag) => (
            <li key={flag}>
              <span aria-hidden="true">⚠</span> {flagText(flag, settings)}
            </li>
          ))}
        </ul>
      )}

      <section className="detail-section" aria-labelledby="chart-title">
        <h2 id="chart-title">Last {settings.nights} days</h2>
        {state.status === 'loading' && (
          <div className="chart-placeholder skeleton" aria-busy="true" aria-label="Loading chart" />
        )}
        {state.status === 'error' && (
          <div className="card chart-placeholder" role="alert">
            <p>Couldn't load the price history. Check your connection, then try again.</p>
            <button type="button" className="button" onClick={retry}>
              Try again
            </button>
          </div>
        )}
        {state.status === 'none' && (
          <p className="muted">No price history was published for this item.</p>
        )}
        {state.status === 'ready' && (
          <>
            <p className="last-hour">{lastHourLine(state.history, item.buyPrice, generatedAt)}</p>
            <PriceChart
              history={state.history}
              buyPrice={item.buyPrice}
              sellPrice={item.sellPrice}
              generatedAt={generatedAt}
              settings={settings}
            />
          </>
        )}
      </section>

      <section className="detail-section" aria-labelledby="nights-title">
        <h2 id="nights-title">
          {item.fillNights} of {nights} nights · {fillWord(item.fillNights, nights)}
        </h2>
        <p className="muted small">
          Would both your buy and your sell have filled? Each night runs from{' '}
          {String(settings.buyStartHour).padStart(2, '0')}:00 to{' '}
          {String(settings.sellEndHour).padStart(2, '0')}:00 the next day, Manila time.
        </p>
        <ol className="nights" aria-label="Nights, oldest first">
          {item.nights.map((hit, index) => {
            const date = dates[index];
            return (
              <li key={date?.getTime() ?? index} className={hit ? 'hit' : 'miss'}>
                <span className="night-mark" aria-hidden="true">
                  {hit ? '✓' : '✗'}
                </span>
                <span className="night-date">{date ? formatManilaDay(date) : ''}</span>
                <span className="visually-hidden">{hit ? 'filled' : 'missed'}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="detail-section" aria-labelledby="facts-title">
        <h2 id="facts-title">Market</h2>
        <dl className="facts">
          <div>
            <dt>Buy limit</dt>
            <dd>{formatExactGp(item.limit)} per 4 hours</dd>
          </div>
          <div>
            <dt>Daily volume</dt>
            <dd>{formatGp(item.dailyVolume)} traded</dd>
          </div>
          <div>
            <dt>In your night hours</dt>
            <dd>{formatGp(item.buyWindowVolume)} sold on a usual night</dd>
          </div>
          <div>
            <dt>Tax per item</dt>
            <dd>{formatExactGp(item.taxPerItem)}</dd>
          </div>
          <div>
            <dt>Trend</dt>
            <dd>
              <span aria-hidden="true">{trend.arrow}</span> {trend.word} (
              {formatPercent(item.trendPerDay)} a day)
            </dd>
          </div>
        </dl>
      </section>

      <a className="wiki-link" href={wikiPageUrl(item.name)} target="_blank" rel="noreferrer">
        {item.name} on the OSRS Wiki <span aria-hidden="true">↗</span>
      </a>
    </article>
  );
}
