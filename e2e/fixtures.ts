import { readFileSync } from 'node:fs';
import { test as base, expect, type Page } from '@playwright/test';

const PICKS_URL = '**/osrs-flipping-dashboard/data/picks.json';

/** A copy of the first real published run (samples/published/README.md). */
export const samplePicks = readFileSync(
  new URL('../samples/published/picks.json', import.meta.url),
  'utf8',
);

/** 23 minutes after the sample results file says it was generated (12:37 Manila). */
export const NOW = new Date('2026-11-17T05:00:30Z');

const ICONS_URL = 'https://oldschool.runescape.wiki/images/**';

/** A 1×1 PNG standing in for every Wiki icon. */
const ICON = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAwMBAQBjTQHOAAAAAElFTkSuQmCC',
  'base64',
);

/** Icons load (a stand-in picture) or fail. Without this, icon requests are blocked. */
export async function serveIcons(page: Page, reply: 'ok' | 'fail') {
  await page.unroute(ICONS_URL);
  await page.route(ICONS_URL, (route) =>
    reply === 'ok'
      ? route.fulfill({ contentType: 'image/png', body: ICON })
      : route.fulfill({ status: 404 }),
  );
}

type PicksReply = { status: number; body?: string } | 'offline';

/** Decides what the page gets when it asks for the results file. */
export async function servePicks(page: Page, reply: PicksReply) {
  await page.unroute(PICKS_URL);
  await page.route(PICKS_URL, (route) =>
    reply === 'offline'
      ? route.abort('internetdisconnected')
      : route.fulfill({ contentType: 'application/json', ...reply }),
  );
}

export const test = base.extend({
  page: async ({ page }, use) => {
    // Fixed clock, and nothing leaves the machine: any request that isn't
    // the local page or a routed sample fails the check.
    await page.clock.install({ time: NOW });
    await page.route(
      (url) => url.hostname !== 'localhost',
      (route) => route.abort('blockedbyclient'),
    );
    await use(page);
  },
});

export { expect };
