import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  itemHref,
  readItemId,
  readView,
  savedScroll,
  saveScroll,
  viewHref,
  withoutItem,
} from './route.ts';

describe('tabs in the address', () => {
  beforeEach(() => vi.stubGlobal('window', { location: { pathname: '/' } }));
  afterEach(() => vi.unstubAllGlobals());

  it('reads the tab, with Picks for none or anything unknown', () => {
    expect(readView('?view=flips')).toBe('flips');
    expect(readView('?view=watch&item=2')).toBe('watch');
    expect(readView('?cash=50m')).toBe('picks');
    expect(readView('?view=admin')).toBe('picks');
  });

  it('switches tab keeping the choice and dropping the open item', () => {
    expect(viewHref('?cash=50m&slots=1&vol=all&item=27226', 'flips')).toBe(
      '?cash=50m&slots=1&vol=all&view=flips',
    );
    expect(viewHref('?cash=50m&view=watch', 'picks')).toBe('?cash=50m');
    expect(viewHref('?view=settings', 'picks')).toBe('/');
  });

  it('opens an item from a tab, and back to that tab', () => {
    const href = itemHref('?cash=50m&view=flips', 27226);
    expect(href).toBe('?cash=50m&view=flips&item=27226');
    expect(readItemId(href)).toBe(27226);
    expect(readView(href)).toBe('flips');
    expect(withoutItem(href)).toBe('?cash=50m&view=flips');
  });
});

describe('scroll positions', () => {
  let stored: Record<string, string>;
  beforeEach(() => {
    stored = {};
    vi.stubGlobal('window', { location: { pathname: '/' } });
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => stored[key] ?? null,
      setItem: (key: string, value: string) => {
        stored[key] = value;
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('are kept per list, the same with an item open over it', () => {
    saveScroll('?cash=50m', 900);
    saveScroll('?cash=50m&view=flips', 120);
    expect(savedScroll('?cash=50m&item=5')).toBe(900);
    expect(savedScroll('?cash=50m&view=flips')).toBe(120);
    expect(savedScroll('?cash=10m')).toBeNull();
  });

  it('are kept for the other tabs whatever the cash', () => {
    saveScroll('?cash=50m&view=flips', 800);
    expect(savedScroll('?cash=100m&slots=2&view=flips')).toBe(800);
    expect(savedScroll('?cash=100m')).toBeNull();
  });

  it('keep only the newest lists', () => {
    for (let n = 0; n < 25; n++) saveScroll(`?cash=${n}m`, n);
    expect(savedScroll('?cash=0m')).toBeNull();
    expect(savedScroll('?cash=24m')).toBe(24);
    expect(Object.keys(JSON.parse(stored['osrs-flips:scroll'] ?? '{}'))).toHaveLength(20);
  });

  it('start at the top when storage is damaged or blocked', () => {
    stored['osrs-flips:scroll'] = '{oops';
    expect(savedScroll('?cash=50m')).toBeNull();
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(() => saveScroll('?cash=50m', 10)).not.toThrow();
    expect(savedScroll('?cash=50m')).toBeNull();
  });
});
