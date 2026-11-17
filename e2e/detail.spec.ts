import type { Page } from '@playwright/test';
import { expect, samplePicks, serveHistory, servePicks, test } from './fixtures.ts';

const rows = (page: Page) => page.getByRole('list', { name: 'Picks' }).getByRole('article');

test.beforeEach(async ({ page }) => {
  await servePicks(page, { status: 200, body: samplePicks });
  await serveHistory(page);
});

test('a row opens the item, and back returns to the same place in the list', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto('/?cash=100m&slots=1&vol=all');
  await expect(rows(page).first()).toHaveAccessibleName('Masori mask');

  // Scroll so a lower row is in view, then open it.
  const fifth = rows(page).nth(4);
  const name = (await fifth.getAttribute('aria-label')) ?? '';
  await fifth.evaluate((row) =>
    window.scrollTo(0, row.getBoundingClientRect().top + window.scrollY - 100),
  );
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  const scrolled = await page.evaluate(() => window.scrollY);

  await fifth.click({ position: { x: 40, y: 120 } }); // anywhere on the card, not just the name
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  await expect(page).toHaveURL(/cash=100m&slots=1&vol=all&item=\d+$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  await page.getByRole('button', { name: 'Picks' }).click();
  await expect(page.getByRole('article', { name, exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\?cash=100m&slots=1&vol=all$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrolled);
  await expect(page.getByRole('button', { name: '100m', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // The browser's own back (and the swipe gesture) does the same.
  await page.getByRole('article', { name, exact: true }).click({ position: { x: 40, y: 120 } });
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('article', { name, exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrolled);
});

test('the item shows its chart, nights, market facts and Wiki link', async ({ page }) => {
  await page.goto('/?cash=50m&slots=1&vol=all&item=27226');

  await expect(page.getByRole('heading', { level: 1, name: 'Masori mask' })).toBeVisible();
  // The list stays mounted (hidden) under the item, so look inside the item only.
  const detail = page.getByRole('article', { name: 'Masori mask', exact: true }).filter({
    visible: true,
  });
  await expect(detail.getByText('Buy at13,751,666')).toBeVisible();
  await expect(
    page.getByText(
      'Last hour: sold at 14.6m, bought at 15.3m. Your buy is 6% under, so it fills only if the price dips.',
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('img', { name: /^Hourly prices over the last 14 days/ }),
  ).toBeVisible();

  await expect(page.getByRole('heading', { name: '8 of 14 nights · typical' })).toBeVisible();
  const nights = page.getByRole('list', { name: 'Nights, oldest first' }).getByRole('listitem');
  await expect(nights).toHaveCount(14);
  await expect(nights.first()).toHaveText('✓2 Novfilled');
  await expect(nights.last()).toHaveText('✓15 Novfilled');

  await expect(detail.getByText('Buy limit8 per 4 hours')).toBeVisible();
  await expect(detail.getByText('Tax per item288,442')).toBeVisible();
  await expect(page.getByRole('link', { name: /Masori mask on the OSRS Wiki/ })).toHaveAttribute(
    'href',
    'https://oldschool.runescape.wiki/w/Masori_mask',
  );
});

test('touching the chart reads out that hour', async ({ page }) => {
  await page.goto('/?item=27226');
  const chart = page.getByRole('img', { name: /^Hourly prices/ });
  await expect(page.getByText('Touch the chart to read an hour.')).toBeVisible();
  // Mid-screen, clear of the tab bar.
  await chart.evaluate((element) => element.scrollIntoView({ block: 'center' }));

  const box = await chart.boundingBox();
  if (!box) throw new Error('no chart');
  await page.mouse.move(box.x + box.width - 12, box.y + box.height / 2);
  await expect(page.getByText(/^Tue 17 Nov, \d\d:00 · sold \d+(\.\d+)?m · bought/)).toBeVisible();
});

test('a link straight to an item has a way back to the list', async ({ page }) => {
  await page.goto('/?cash=10m&slots=2&vol=high&item=10476');
  await expect(page.getByRole('heading', { level: 1, name: 'Purple sweets' })).toBeVisible();

  await page.getByRole('button', { name: 'Picks' }).click();
  await expect(page).toHaveURL(/\?cash=10m&slots=2&vol=high$/);
  await expect(page.getByRole('list', { name: 'Picks' })).toBeVisible();
});

test('a failed chart load can be retried without leaving the item', async ({ page }) => {
  await serveHistory(page, 'offline');
  await page.goto('/?item=27226');
  await expect(page.getByText("Couldn't load the price history.", { exact: false })).toBeVisible();

  await serveHistory(page);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('img', { name: /^Hourly prices/ })).toBeVisible();
});

test('an item that is not in the latest update says so', async ({ page }) => {
  await page.goto('/?item=999999');
  await expect(page.getByRole('heading', { name: 'Not in the latest update' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Picks' })).toBeVisible();
});

test('the item fits a 320 px wide phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/?item=27226');
  await expect(page.getByRole('img', { name: /^Hourly prices/ })).toBeVisible();
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflows).toBe(false);
});

test('an item without a published history says so instead of blaming the connection', async ({
  page,
}) => {
  await page.goto('/?item=1631'); // Uncut dragonstone: no history file in the samples
  await expect(page.getByRole('heading', { level: 1, name: 'Uncut dragonstone' })).toBeVisible();
  await expect(page.getByText('No price history was published for this item.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
});
