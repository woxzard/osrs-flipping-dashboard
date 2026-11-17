/**
 * The controls' state (docs/spec.md §7.2): kept in the address so refresh,
 * back and a pasted link bring the same view back, and the last cash and
 * slots remembered on this phone for the next visit without an address.
 */
import { formatGpParam, parseGp } from '../shared/format.ts';
import type { Choice, VolumeTab } from '../shared/rank.ts';

export const CASH_PRESETS = [10_000_000, 50_000_000, 100_000_000] as const;
/** Custom cash limits: 100k up to the game's cash stack limit. */
export const CASH_MIN = 100_000;
export const CASH_MAX = 2_147_483_647;
export const SLOTS_MIN = 1;
export const SLOTS_MAX = 8;

export const DEFAULT_CHOICE: Choice = { cash: 50_000_000, freeSlots: 1, volume: 'all' };

const VOLUMES: readonly VolumeTab[] = ['all', 'high', 'low'];
const STORAGE_KEY = 'osrs-flips:last-choice';

export const isValidCash = (cash: unknown): cash is number =>
  typeof cash === 'number' && Number.isInteger(cash) && cash >= CASH_MIN && cash <= CASH_MAX;

export const isValidSlots = (slots: unknown): slots is number =>
  typeof slots === 'number' && Number.isInteger(slots) && slots >= SLOTS_MIN && slots <= SLOTS_MAX;

const isVolume = (volume: unknown): volume is VolumeTab =>
  typeof volume === 'string' && (VOLUMES as readonly string[]).includes(volume);

/** The address wins, then the last choice on this phone, then the defaults. */
export function readChoice(search: string, stored: Partial<Choice> | null): Choice {
  const params = new URLSearchParams(search);
  const cash = parseGp(params.get('cash') ?? '');
  const slotsText = params.get('slots') ?? '';
  const slots = /^\d+$/.test(slotsText) ? Number(slotsText) : Number.NaN;
  const volume = params.get('vol');
  return {
    cash: isValidCash(cash) ? cash : isValidCash(stored?.cash) ? stored.cash : DEFAULT_CHOICE.cash,
    freeSlots: isValidSlots(slots)
      ? slots
      : isValidSlots(stored?.freeSlots)
        ? stored.freeSlots
        : DEFAULT_CHOICE.freeSlots,
    volume: isVolume(volume) ? volume : DEFAULT_CHOICE.volume,
  };
}

/** The address's query with this choice written in; anything else in it is kept. */
export function writeChoice(choice: Choice, search: string): string {
  const params = new URLSearchParams(search);
  params.set('cash', formatGpParam(choice.cash));
  params.set('slots', String(choice.freeSlots));
  params.set('vol', choice.volume);
  return `?${params.toString()}`;
}

/** The last cash and slots chosen on this phone, if the browser kept them. */
export function loadStoredChoice(): Partial<Choice> | null {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    return text ? (JSON.parse(text) as Partial<Choice>) : null;
  } catch {
    return null; // private mode, blocked storage or a damaged value
  }
}

export function storeChoice(choice: Choice): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ cash: choice.cash, freeSlots: choice.freeSlots }),
    );
  } catch {
    // Storage unavailable: the address still holds the choice.
  }
}
