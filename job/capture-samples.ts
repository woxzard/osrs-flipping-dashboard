/**
 * Refreshes the saved API responses in samples/ (`make samples`).
 * Needs to reach prices.runescape.wiki: see the e2e-check skill.
 *
 * The three all-item responses are trimmed to about 300 items so the files
 * stay small; their shape is exactly what the API returns.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fetch24h, fetchHourly, fetchLatest, fetchMapping } from './wiki.ts';

const OUT = new URL('../samples/', import.meta.url);
const TARGET_ITEMS = 300;

/** Items whose hourly history is saved, chosen to cover the awkward cases. */
const HISTORY_ITEMS: Record<number, string> = {
  2: 'Cannonball: very high volume, cheap',
  314: 'Feather: under 50 gp, so no tax',
  536: 'Dragon bones: steady, high volume',
  561: 'Nature rune: high volume, tight margin',
  4151: 'Abyssal whip: mid price, trades every hour',
  11832: 'Bandos chestplate: expensive, moderate volume',
  13190: 'Old school bond: exempt from tax',
  10344: '3rd age amulet: thin, hours with no trades',
};

function pick<T>(all: Record<string, T>, ids: Set<number>): Record<string, T> {
  return Object.fromEntries(Object.entries(all).filter(([id]) => ids.has(Number(id))));
}

async function save(name: string, value: unknown) {
  await writeFile(new URL(name, OUT), `${JSON.stringify(value)}\n`);
  console.log(`saved samples/${name}`);
}

const mapping = await fetchMapping();
const latest = await fetchLatest();
const day = await fetch24h();

// Every Nth item with a buy limit (by id, so the pick is repeatable), plus
// the history items.
const withLimit = mapping.filter((item) => item.limit !== undefined).sort((a, b) => a.id - b.id);
const step = Math.ceil(withLimit.length / TARGET_ITEMS);
const ids = new Set(withLimit.filter((_, index) => index % step === 0).map((item) => item.id));
for (const id of Object.keys(HISTORY_ITEMS)) ids.add(Number(id));

await mkdir(new URL('history/', OUT), { recursive: true });
await save(
  'mapping.json',
  mapping.filter((item) => ids.has(item.id)),
);
await save('latest.json', { ...latest, data: pick(latest.data, ids) });
await save('24h.json', { ...day, data: pick(day.data, ids) });
for (const id of Object.keys(HISTORY_ITEMS)) {
  await save(`history/${id}.json`, await fetchHourly(Number(id)));
}
await save('README.json', {
  capturedAt: new Date().toISOString(),
  source: 'https://prices.runescape.wiki/api/v1/osrs',
  note: 'Real responses, trimmed to the listed items. Refresh with `make samples`.',
  items: ids.size,
  history: HISTORY_ITEMS,
});
