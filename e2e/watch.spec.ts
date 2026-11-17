import type { Page } from '@playwright/test';
import { expect, samplePicks, serveHistory, servePicks, test } from './fixtures.ts';

const tabs = (page: Page) => page.getByRole('navigation', { name: 'Sections' });
const watched = (page: Page) => page.getByRole('list', { name: 'Watchlist' }).getByRole('article');
const results = (page: Page) => page.getByRole('list', { name: 'Search results' });
const search = (page: Page) => page.getByRole('searchbox', { name: 'Add an item' });
const toast = (page: Page) => page.locator('.toast');

test.beforeEach(async ({ page }) => {
  await servePicks(page, { status: 200, body: samplePicks });
  await serveHistory(page);
});

test('search adds an item, which then shows with its numbers for my cash', async ({ page }) => {
  await page.clock.pauseAt(new Date('2026-11-17T05:01:00Z'));
  await page.goto('/?cash=50m&slots=1&vol=all&view=watch');
  await expect(page.getByText('Searches the 290 items scored this hour.')).toBeVisible();

  await search(page).fill('masori');
  await expect(results(page).getByRole('listitem')).toHaveCount(7); // every Masori piece
  await results(page).getByRole('button', { name: 'Watch Masori mask', exact: true }).click();

  // The plain message goes away on its own after about 2.5 s.
  await expect(toast(page)).toHaveText('Added to your watchlist');
  await page.clock.runFor(2_000);
  await expect(toast(page)).toBeVisible();
  await page.clock.runFor(600);
  await expect(toast(page)).toHaveCount(0);

  // The search clears, and the new item is at the top of the list.
  await expect(search(page)).toHaveValue('');
  await expect(watched(page).first()).toHaveAccessibleName('Masori mask');
  await expect(watched(page).first().getByText('Buy at13,751,666')).toBeVisible();

  // The picks mark it.
  await tabs(page).getByRole('link', { name: 'Picks' }).click();
  await expect(
    page.getByRole('article', { name: 'Masori mask', exact: true }).getByText('Watching'),
  ).toBeVisible();
});

test('the search is kept in the address, and an unknown name says so', async ({ page }) => {
  await page.goto('/?view=watch');
  await search(page).fill('drag');
  await expect(page).toHaveURL(/[?&]q=drag/);
  await page.reload();
  await expect(search(page)).toHaveValue('drag');
  await expect(results(page)).toContainText('Uncut dragonstone');

  // Other tabs don't carry it; coming back brings it back.
  await tabs(page).getByRole('link', { name: 'Picks' }).click();
  await expect(page).not.toHaveURL(/q=/);
  await tabs(page).getByRole('link', { name: 'Watchlist' }).click();
  await expect(page).toHaveURL(/[?&]q=drag/);

  await search(page).fill('zzz');
  await expect(page.getByText('No item called “zzz” this hour.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(search(page)).toHaveValue('');
  await expect(page).not.toHaveURL(/q=/);
});

test('Watch on the item screen, back to the watchlist, and remove with Undo', async ({ page }) => {
  await page.goto('/?cash=50m&slots=1&vol=all&item=27226');
  const watch = page.getByRole('button', { name: 'Watch', exact: true });
  await watch.click();
  await expect(page.getByRole('button', { name: 'Watching' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(toast(page)).toHaveCount(0); // the button already says so

  await tabs(page).getByRole('link', { name: 'Watchlist' }).click();
  await watched(page)
    .first()
    .click({ position: { x: 40, y: 60 } });
  await expect(page.getByRole('heading', { level: 1, name: 'Masori mask' })).toBeVisible();
  await page.getByRole('button', { name: 'Watchlist' }).click(); // "‹ Watchlist"
  await expect(page.getByRole('heading', { level: 1, name: 'Watchlist' })).toBeVisible();

  await watched(page)
    .first()
    .getByRole('button', { name: 'Remove from watchlist: Masori mask' })
    .click();
  await expect(watched(page)).toHaveCount(0);
  await expect(toast(page)).toContainText('Removed from your watchlist');
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await expect(watched(page).first()).toHaveAccessibleName('Masori mask');

  // Survives closing: a fresh load still has it.
  await page.reload();
  await expect(watched(page).first()).toHaveAccessibleName('Masori mask');
});

test('a watched item says why it has no numbers', async ({ page }) => {
  await page.goto('/?cash=10m&slots=1&vol=all&view=watch');
  await search(page).fill('masori mask');
  await results(page).getByRole('button', { name: 'Watch Masori mask', exact: true }).click();
  // 13.7m each: none fit in 10m.
  await expect(watched(page).first()).toContainText('Costs more than the 10m per slot.');

  const newer = JSON.parse(samplePicks) as { items: { id: number }[] };
  newer.items = newer.items.filter((item) => item.id !== 27226);
  await servePicks(page, { status: 200, body: JSON.stringify(newer) });
  await page.reload();
  await expect(watched(page).first()).toContainText("Not in this hour's update");

  // Its item screen still names it and can stop watching.
  await watched(page)
    .first()
    .click({ position: { x: 40, y: 30 } });
  await expect(page.getByRole('heading', { name: 'Masori mask' })).toBeVisible();
  await page.getByRole('button', { name: 'Watching' }).click();
  await expect(toast(page)).toContainText('Removed from your watchlist');
  // The screen still names it, and can watch it again.
  await expect(page.getByRole('heading', { name: 'Masori mask' })).toBeVisible();
  await page.getByRole('button', { name: 'Watch', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Watching' })).toBeVisible();
});

test('a failed load says so on the watchlist instead of blaming the items', async ({ page }) => {
  await page.goto('/?view=watch');
  await search(page).fill('masori mask');
  await results(page).getByRole('button', { name: 'Watch Masori mask', exact: true }).click();

  await servePicks(page, 'offline');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: "Couldn't load this hour's numbers" }),
  ).toBeVisible();
  await expect(watched(page).first()).toContainText("This hour's numbers couldn't be loaded.");
  await search(page).fill('masori');
  await expect(page.getByText('No item called')).toHaveCount(0);

  await servePicks(page, { status: 200, body: samplePicks });
  await page.getByRole('button', { name: 'Try again' }).filter({ visible: true }).click();
  await expect(results(page)).toContainText('Masori body');
  await expect(watched(page).first().getByText('Buy at13,751,666')).toBeVisible();
});

test('the watchlist fits a 320 px phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/?view=watch');
  await search(page).fill('masori');
  await expect(results(page).getByRole('listitem')).toHaveCount(7); // every Masori piece
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const box = await results(page).getByRole('button').first().boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
});
