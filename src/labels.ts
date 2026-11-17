import type { Flag, Trend } from '../shared/scoring.ts';
import type { Settings } from '../shared/settings.ts';

/**
 * Warning flags (docs/spec.md §7.5): always shown as a symbol plus these
 * words, worded with the settings the results file was scored with.
 */
export function flagText(flag: Flag, settings: Settings): string {
  switch (flag) {
    case 'falling':
      return 'Price falling for days';
    case 'spike':
      return 'Sudden price jump: often a game update';
    case 'thin':
      return 'Few trades in your hours: prices are rougher';
    case 'tax-heavy':
      return 'Tax takes over half the margin';
    case 'stale':
      return `No trades for ${settings.staleHours}+ hours`;
    case 'short-history':
      return `Under ${settings.nights} days of history`;
    default:
      // A flag added by a newer job: show its name rather than nothing.
      return String(flag);
  }
}

export const TREND_TEXT: Record<Trend, { arrow: string; word: string }> = {
  rising: { arrow: '↑', word: 'Rising' },
  flat: { arrow: '→', word: 'Flat' },
  falling: { arrow: '↓', word: 'Falling' },
};

const WIKI = 'https://oldschool.runescape.wiki';

/** A page or file title as the Wiki writes it in addresses. */
const wikiTitle = (title: string) => encodeURIComponent(title.replaceAll(' ', '_'));

/** The item's icon among the Wiki's image files (the API's `icon` file name). */
export function wikiIconUrl(icon: string): string {
  return `${WIKI}/images/${wikiTitle(icon)}`;
}
