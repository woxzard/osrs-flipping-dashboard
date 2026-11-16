/**
 * The only place that talks to the OSRS Wiki real-time prices API
 * (docs/spec.md §4). Every request carries the project's User-Agent, and
 * requests go out one at a time with a pause between them.
 */

export const API_BASE = 'https://prices.runescape.wiki/api/v1/osrs';

// Required by the Wiki: says what the tool is and how to reach its owner.
export const USER_AGENT =
  'osrs-flipping-dashboard (hourly overnight-flip picks; https://github.com/woxzard/osrs-flipping-dashboard)';

const PAUSE_MS = 250;
const TIMEOUT_MS = 30_000;

export interface MappingItem {
  id: number;
  name: string;
  icon: string;
  members: boolean;
  /** Buy limit per 4 hours. Missing for some items. */
  limit?: number;
  examine?: string;
  value?: number;
  lowalch?: number;
  highalch?: number;
}

export interface LatestPrice {
  high: number | null;
  highTime: number | null;
  low: number | null;
  lowTime: number | null;
}

export interface AveragePrice {
  avgHighPrice: number | null;
  highPriceVolume: number;
  avgLowPrice: number | null;
  lowPriceVolume: number;
}

export interface HourPoint extends AveragePrice {
  /** Start of the hour, in seconds since 1970 (UTC). */
  timestamp: number;
}

export interface LatestResponse {
  data: Record<string, LatestPrice>;
}

export interface DayResponse {
  data: Record<string, AveragePrice>;
  timestamp: number;
}

export interface TimeseriesResponse {
  data: HourPoint[];
  itemId?: number;
}

let lastRequestAt = 0;
let queue: Promise<unknown> = Promise.resolve();

async function politeFetch(path: string): Promise<unknown> {
  const wait = lastRequestAt + PAUSE_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Wiki prices API ${path}: HTTP ${response.status}`);
    return await response.json();
  } finally {
    lastRequestAt = Date.now();
  }
}

/** Requests run one after another, however many are asked for at once. */
function get<T>(path: string): Promise<T> {
  const result = queue.then(() => politeFetch(path));
  queue = result.catch(() => undefined);
  return result as Promise<T>;
}

export const fetchMapping = () => get<MappingItem[]>('/mapping');
export const fetchLatest = () => get<LatestResponse>('/latest');
export const fetch24h = () => get<DayResponse>('/24h');
export const fetchHourly = (id: number) =>
  get<TimeseriesResponse>(`/timeseries?timestep=1h&id=${id}`);
