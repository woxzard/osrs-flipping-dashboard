/**
 * My night hours, kept on this phone (docs/spec.md §7.7). Nothing stored
 * means the job's hours. Selling starts when buying stops (I wake up).
 */
import { hoursProblem, type WindowHours } from '../shared/rescore.ts';

export { hoursProblem };

const STORAGE_KEY = 'osrs-flips:hours';

/** The three choices on the Settings screen, as window hours. */
export const fromChoices = (bed: number, wake: number, stop: number): WindowHours => ({
  buyStartHour: bed,
  buyEndHour: wake,
  sellStartHour: wake,
  sellEndHour: stop,
});

/** My hours, if I set any and they still make sense. */
export function parseHours(text: string | null): WindowHours | null {
  if (!text) return null;
  try {
    const value = JSON.parse(text) as Partial<WindowHours> | null;
    if (!value) return null;
    const hours = {
      buyStartHour: value.buyStartHour,
      buyEndHour: value.buyEndHour,
      sellStartHour: value.sellStartHour,
      sellEndHour: value.sellEndHour,
    } as WindowHours;
    return hoursProblem(hours) === null ? hours : null;
  } catch {
    return null;
  }
}

export function loadHours(): WindowHours | null {
  try {
    return parseHours(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Saves my hours (null goes back to the job's); false if the browser won't keep them. */
export function storeHours(hours: WindowHours | null): boolean {
  try {
    if (hours) localStorage.setItem(STORAGE_KEY, JSON.stringify(hours));
    else localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export const formatHour = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

/** "22:00–07:00, 07:00–22:00": buying, then selling. */
export const formatHours = (hours: WindowHours) =>
  `${formatHour(hours.buyStartHour)}–${formatHour(hours.buyEndHour)}, ${formatHour(hours.sellStartHour)}–${formatHour(hours.sellEndHour)}`;
