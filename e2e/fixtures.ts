import { readFileSync } from 'node:fs';
import { test as base, expect, type Page } from '@playwright/test';

const PICKS_URL = '**/osrs-flipping-dashboard/data/picks.json';

export const samplePicks = readFileSync(
  new URL('../samples/picks.sample.json', import.meta.url),
  'utf8',
);

/** 23 minutes after the sample results file says it was generated. */
export const NOW = new Date('2026-11-16T07:00:00Z');

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
