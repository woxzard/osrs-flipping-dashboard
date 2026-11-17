import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { formatExactGp, formatGp } from '../shared/format.ts';
import type { HistoryFile } from '../shared/picks.ts';
import { buyWindowsBetween } from '../shared/scoring.ts';
import type { Settings } from '../shared/settings.ts';
import { formatManilaDay, formatManilaDayTime } from '../shared/time.ts';

const DAY = 24 * 3600;
/** Manila is GMT+8 all year (no daylight saving). */
const MANILA_OFFSET = 8 * 3600;
const HEIGHT = 210;
const MARGIN = { top: 10, right: 10, bottom: 24, left: 46 };

type Point = HistoryFile['points'][number];

/** A line through the hours that have a price, broken where an hour has none. */
function linePath(
  points: readonly Point[],
  column: 1 | 2,
  x: (time: number) => number,
  y: (price: number) => number,
): string {
  let path = '';
  let drawing = false;
  for (const point of points) {
    const price = point[column];
    if (price === null) {
      drawing = false;
      continue;
    }
    path += `${drawing ? 'L' : 'M'}${x(point[0]).toFixed(1)},${y(price).toFixed(1)}`;
    drawing = true;
  }
  return path;
}

/** About four round gridline prices between low and high. */
function niceTicks(low: number, high: number): number[] {
  const rough = (high - low) / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * power >= rough) ?? 10) * power;
  const ticks: number[] = [];
  for (let tick = Math.ceil(low / step) * step; tick <= high; tick += step) ticks.push(tick);
  return ticks;
}

/** The chart's width follows its box on the page. */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(340);
  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(240, Math.floor(entry.contentRect.width)));
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * The last 14 days of hourly prices, with my buy and sell offers drawn on
 * and my night hours shaded. Touch or hover reads out one hour.
 */
export function PriceChart({
  history,
  buyPrice,
  sellPrice,
  generatedAt,
  settings,
}: {
  history: HistoryFile;
  buyPrice: number;
  sellPrice: number;
  /** When the results were made (ISO 8601): the chart ends here. */
  generatedAt: string;
  settings: Settings;
}) {
  const [boxRef, width] = useWidth();
  const [active, setActive] = useState<number | null>(null);

  const chart = useMemo(() => {
    const to = Math.floor(Date.parse(generatedAt) / 1000);
    const from = to - settings.nights * DAY;
    const points = history.points.filter((point) => point[0] >= from && point[0] <= to);
    const prices = points.flatMap((point) => [point[1] ?? [], point[2] ?? []].flat());
    if (points.length < 2 || prices.length === 0) return null;

    const low = Math.min(...prices, buyPrice);
    const high = Math.max(...prices, sellPrice);
    const pad = (high - low) * 0.06 || high * 0.01;
    const yMin = low - pad;
    const yMax = high + pad;
    const plotWidth = width - MARGIN.left - MARGIN.right;
    const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
    const x = (time: number) => MARGIN.left + ((time - from) / (to - from)) * plotWidth;
    const y = (price: number) => MARGIN.top + (1 - (price - yMin) / (yMax - yMin)) * plotHeight;

    // My night hours in Manila, one band per night (the same windows the scoring uses).
    const nights = buyWindowsBetween(from, to, settings).map(([start, stop]) => ({
      x1: x(start),
      x2: x(stop),
    }));

    // A date label at Manila midnight, every few days so they never crowd.
    const every = width < 360 ? 4 : 3;
    const days: { x: number; label: string }[] = [];
    const firstMidnight = Math.ceil((from + MANILA_OFFSET) / DAY) * DAY - MANILA_OFFSET;
    for (let day = firstMidnight, n = 0; day < to; day += DAY, n += 1) {
      if (n % every === 1) days.push({ x: x(day), label: formatManilaDay(new Date(day * 1000)) });
    }

    return {
      points,
      x,
      y,
      nights,
      days,
      ticks: niceTicks(yMin, yMax),
      sold: linePath(points, 2, x, y),
      bought: linePath(points, 1, x, y),
      plotWidth,
    };
  }, [history, buyPrice, sellPrice, generatedAt, settings, width]);

  if (!chart) {
    return <p className="muted">Not enough recent trades to draw a chart.</p>;
  }

  const pick = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const left = event.clientX - box.left;
    let best = 0;
    chart.points.forEach((point, index) => {
      const current = chart.points[best];
      if (current && Math.abs(chart.x(point[0]) - left) < Math.abs(chart.x(current[0]) - left)) {
        best = index;
      }
    });
    setActive(best);
  };

  const hour = active === null ? undefined : chart.points[active];
  const right = MARGIN.left + chart.plotWidth;

  return (
    <figure className="chart" ref={boxRef}>
      <figcaption className="chart-legend">
        <span>
          <i className="swatch sold" /> Sold at once (your buy fills here)
        </span>
        <span>
          <i className="swatch bought" /> Bought at once (your sell fills here)
        </span>
        <span>
          <i className="swatch night" /> Your night hours
        </span>
      </figcaption>
      <p className="chart-readout" aria-live="polite">
        {hour
          ? `${formatManilaDayTime(new Date(hour[0] * 1000))} · sold ${hour[2] === null ? '–' : formatGp(hour[2])} · bought ${hour[1] === null ? '–' : formatGp(hour[1])}`
          : 'Touch the chart to read an hour.'}
      </p>
      <svg
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        role="img"
        aria-label={`Hourly prices over the last ${settings.nights} days, with your buy at ${formatExactGp(buyPrice)} and sell at ${formatExactGp(sellPrice)}.`}
        onPointerDown={pick}
        onPointerMove={pick}
        onPointerLeave={(event) => {
          // A finger lifting also "leaves": keep the touched hour on screen.
          if (event.pointerType === 'mouse') setActive(null);
        }}
      >
        {chart.nights.map((band) => (
          <rect
            key={band.x1}
            className="night-band"
            x={band.x1}
            y={MARGIN.top}
            width={band.x2 - band.x1}
            height={HEIGHT - MARGIN.top - MARGIN.bottom}
          />
        ))}
        {chart.ticks.map((tick) => (
          <g key={tick}>
            <line
              className="grid"
              x1={MARGIN.left}
              x2={right}
              y1={chart.y(tick)}
              y2={chart.y(tick)}
            />
            <text
              className="axis"
              x={MARGIN.left - 6}
              y={chart.y(tick)}
              dy="0.32em"
              textAnchor="end"
            >
              {formatGp(tick)}
            </text>
          </g>
        ))}
        {chart.days.map((day) => (
          <text key={day.x} className="axis" x={day.x} y={HEIGHT - 6} textAnchor="middle">
            {day.label}
          </text>
        ))}
        <path className="series sold" d={chart.sold} />
        <path className="series bought" d={chart.bought} />
        <line
          className="offer sold"
          x1={MARGIN.left}
          x2={right}
          y1={chart.y(buyPrice)}
          y2={chart.y(buyPrice)}
        />
        <line
          className="offer bought"
          x1={MARGIN.left}
          x2={right}
          y1={chart.y(sellPrice)}
          y2={chart.y(sellPrice)}
        />
        <text className="offer-label" x={right - 4} y={chart.y(sellPrice) - 5} textAnchor="end">
          Sell at
        </text>
        <text className="offer-label" x={right - 4} y={chart.y(buyPrice) + 14} textAnchor="end">
          Buy at
        </text>
        {hour && (
          <g className="crosshair">
            <line
              x1={chart.x(hour[0])}
              x2={chart.x(hour[0])}
              y1={MARGIN.top}
              y2={HEIGHT - MARGIN.bottom}
            />
            {hour[2] !== null && (
              <circle className="sold" cx={chart.x(hour[0])} cy={chart.y(hour[2])} r={4} />
            )}
            {hour[1] !== null && (
              <circle className="bought" cx={chart.x(hour[0])} cy={chart.y(hour[1])} r={4} />
            )}
          </g>
        )}
      </svg>
    </figure>
  );
}
