import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parsePicksFile } from './picks.ts';

describe('parsePicksFile', () => {
  it('accepts the saved sample results file', () => {
    const sample: unknown = JSON.parse(
      readFileSync(new URL('../samples/picks.sample.json', import.meta.url), 'utf8'),
    );
    const picks = parsePicksFile(sample);
    expect(picks.items.length).toBeGreaterThan(0);
    expect(picks.items[0]).toMatchObject({ id: 4151, name: 'Abyssal whip' });
  });

  it('keeps fields it does not know yet', () => {
    const picks = parsePicksFile({ generatedAt: '2026-11-16T06:00:00Z', items: [], extra: 1 });
    expect(picks).toHaveProperty('extra', 1);
  });

  it.each([
    ['not an object', null],
    ['no update time', { items: [] }],
    ['a bad update time', { generatedAt: 'soon', items: [] }],
    ['no item list', { generatedAt: '2026-11-16T06:00:00Z' }],
    ['an item without a name', { generatedAt: '2026-11-16T06:00:00Z', items: [{ id: 1 }] }],
  ])('rejects a file with %s', (_reason, value) => {
    expect(() => parsePicksFile(value)).toThrow();
  });
});
