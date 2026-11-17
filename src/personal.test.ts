import { describe, expect, it } from 'vitest';
import {
  EMPTY,
  hiddenIds,
  parsePersonal,
  withEntry,
  withoutEntry,
  type Flip,
  type SavedItem,
} from './personal.ts';

const flip = (id: number, at: string): Flip => ({
  id,
  name: `Item ${id}`,
  icon: `Item ${id}.png`,
  at,
  buyPrice: 100,
  sellPrice: 120,
  quantity: 50,
  profit: 900,
});
const saved = (id: number, at: string): SavedItem => ({ id, name: `Item ${id}`, icon: '', at });

describe('stored lists', () => {
  it('start empty when nothing is stored or the value is damaged', () => {
    expect(parsePersonal(null)).toEqual(EMPTY);
    expect(parsePersonal('{oops')).toEqual(EMPTY);
    expect(parsePersonal('"text"')).toEqual(EMPTY);
    expect(parsePersonal('null')).toEqual(EMPTY);
  });

  it('read back what was saved, newest first', () => {
    const personal = {
      flips: [flip(1, '2026-11-17T01:00:00Z'), flip(2, '2026-11-17T03:00:00Z')],
      watch: [saved(3, '2026-11-17T02:00:00Z')],
      block: [],
    };
    const back = parsePersonal(JSON.stringify({ version: 1, ...personal }));
    expect(back.flips.map((f) => f.id)).toEqual([2, 1]);
    expect(back.watch).toEqual(personal.watch);
  });

  it('drop a damaged entry, not the whole list, and keep one entry per item', () => {
    const back = parsePersonal(
      JSON.stringify({
        flips: [
          flip(1, '2026-11-17T01:00:00Z'),
          { ...flip(2, '2026-11-17T01:00:00Z'), buyPrice: 'lots' },
          null,
          flip(1, '2026-11-16T01:00:00Z'),
        ],
        watch: [{ id: -4, name: 'x' }, { id: 5 }, saved(6, 'not a date')],
        block: 'nope',
      }),
    );
    expect(back.flips.map((f) => f.id)).toEqual([1]);
    expect(back.watch).toEqual([
      { id: 6, name: 'Item 6', icon: '', at: '1970-01-01T00:00:00.000Z' },
    ]);
    expect(back.block).toEqual([]);
  });
});

describe('changing the lists', () => {
  it('adds an entry once, newest first, and moves a re-added one to its new time', () => {
    let personal = withEntry(EMPTY, 'flips', flip(1, '2026-11-17T01:00:00Z'));
    personal = withEntry(personal, 'flips', flip(2, '2026-11-17T02:00:00Z'));
    expect(personal.flips.map((f) => f.id)).toEqual([2, 1]);
    personal = withEntry(personal, 'flips', flip(1, '2026-11-17T03:00:00Z'));
    expect(personal.flips.map((f) => f.id)).toEqual([1, 2]);
  });

  it('removes an entry, and an undo puts it back where it was', () => {
    const first = flip(1, '2026-11-17T01:00:00Z');
    let personal = withEntry(EMPTY, 'flips', first);
    personal = withEntry(personal, 'flips', flip(2, '2026-11-17T02:00:00Z'));
    personal = withEntry(personal, 'flips', flip(3, '2026-11-17T03:00:00Z'));
    const removed = withoutEntry(personal, 'flips', 2);
    expect(removed.flips.map((f) => f.id)).toEqual([3, 1]);
    const undone = withEntry(removed, 'flips', flip(2, '2026-11-17T02:00:00Z'));
    expect(undone.flips.map((f) => f.id)).toEqual([3, 2, 1]);
    expect(withoutEntry(EMPTY, 'flips', 9)).toBe(EMPTY);
  });

  it('keeps flipped and blocked items out of the picks, not watched ones', () => {
    let personal = withEntry(EMPTY, 'flips', flip(1, '2026-11-17T01:00:00Z'));
    personal = withEntry(personal, 'block', saved(2, '2026-11-17T01:00:00Z'));
    personal = withEntry(personal, 'watch', saved(3, '2026-11-17T01:00:00Z'));
    expect([...hiddenIds(personal)].sort()).toEqual([1, 2]);
  });
});
