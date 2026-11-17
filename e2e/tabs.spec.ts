import type { Page } from '@playwright/test';
import { expect, samplePicks, serveHistory, servePicks, test } from './fixtures.ts';

const tabs = (page: Page) => page.getByRole('navigation', { name: 'Sections' });
const tab = (page: Page, name: string) => tabs(page).getByRole('link', { name, exact: true });
const rows = (page: Page) => page.getByRole('list', { name: 'Picks' }).getByRole('article');
const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

test.beforeEach(async ({ page }) => {
  await servePicks(page, { status: 200, body: samplePicks });
  await serveHistory(page);
});

test('the bottom bar reaches every tab, and the address keeps it', async ({ page }) => {
  await page.goto('/?cash=100m&slots=2&vol=all');
  await expect(tab(page, 'Picks')).toHaveAttribute('aria-current', 'page');

  await tab(page, 'My flips').click();
  await expect(page.getByRole('heading', { level: 1, name: 'My flips' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No flips yet' })).toBeVisible();
  await expect(page).toHaveURL(/\?cash=100m&slots=2&vol=all&view=flips$/);
  await expect(tab(page, 'My flips')).toHaveAttribute('aria-current', 'page');
  await expect(tab(page, 'Picks')).not.toHaveAttribute('aria-current', 'page');
  await expect(page).toHaveTitle('My flips · Overnight flips');

  await tab(page, 'Watchlist').click();
  await expect(page.getByRole('heading', { name: 'Nothing watched yet' })).toBeVisible();

  await tab(page, 'Settings').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  await expect(page.getByLabel('Start buying (bedtime)')).toHaveValue('22');
  await expect(page.getByLabel('Start selling (wake up)')).toHaveValue('7');
  await expect(page.getByLabel('Stop selling')).toHaveValue('22');

  // Refresh keeps the tab; back walks the tabs in reverse, then to the picks.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1, name: 'Watchlist' })).toBeVisible();
  await page.goBack();
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1, name: 'Overnight flips' })).toBeVisible();
  await expect(rows(page).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '100m', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('an empty list offers the way back to the picks', async ({ page }) => {
  await page.goto('/?view=watch');
  await page.getByRole('button', { name: 'See the picks' }).filter({ visible: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Overnight flips' })).toBeVisible();
  await expect(tab(page, 'Picks')).toHaveAttribute('aria-current', 'page');
});

test('switching tabs comes back to the same place in the picks', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto('/?cash=100m&slots=1&vol=all');
  await expect(rows(page).first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 700));
  await expect.poll(() => scrollY(page)).toBe(700);

  await tab(page, 'Settings').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  await expect.poll(() => scrollY(page)).toBe(0);

  // By the bar…
  await tab(page, 'Picks').click();
  await expect(rows(page).first()).toBeVisible();
  await expect.poll(() => scrollY(page)).toBe(700);

  // …and by back.
  await tab(page, 'My flips').click();
  await expect(page.getByRole('heading', { level: 1, name: 'My flips' })).toBeVisible();
  await page.goBack();
  await expect(rows(page).first()).toBeVisible();
  await expect.poll(() => scrollY(page)).toBe(700);

  // The tab already shown goes back to its top.
  await tab(page, 'Picks').click();
  await expect.poll(() => scrollY(page)).toBe(0);
});

test('a refresh keeps the place in the picks, also when the list is left during loading', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto('/?cash=100m&slots=1&vol=all');
  await expect(rows(page).first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 700));
  await expect.poll(() => scrollY(page)).toBe(700);

  await tab(page, 'Settings').click();
  await tab(page, 'Picks').click();
  await expect.poll(() => scrollY(page)).toBe(700);
  await page.reload();
  await expect(rows(page).first()).toBeVisible();
  await expect.poll(() => scrollY(page)).toBe(700);

  // Refresh on another tab, then back while the picks are still loading.
  await tab(page, 'Settings').click();
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/osrs-flipping-dashboard/data/picks.json', async (route) => {
    await held;
    await route.fulfill({ contentType: 'application/json', body: samplePicks });
  });
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel('Loading picks')).toBeAttached();
  release();
  await expect(rows(page).first()).toBeVisible();
  await expect.poll(() => scrollY(page)).toBe(700);
});

test('on an item, its own tab goes back to the list it came from', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto('/?cash=100m&slots=1&vol=all');
  const fifth = rows(page).nth(4);
  const name = (await fifth.getAttribute('aria-label')) ?? '';
  await fifth.evaluate((row) =>
    window.scrollTo(0, row.getBoundingClientRect().top + window.scrollY - 100),
  );
  await expect.poll(() => scrollY(page)).toBeGreaterThan(300);
  const scrolled = await scrollY(page);

  await fifth.click({ position: { x: 40, y: 120 } });
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Picks' })).toBeVisible(); // "‹ Picks"
  await expect(tab(page, 'Picks')).toHaveAttribute('aria-current', 'page');

  await tab(page, 'Picks').click();
  await expect(page.getByRole('article', { name, exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\?cash=100m&slots=1&vol=all$/);
  await expect.poll(() => scrollY(page)).toBe(scrolled);
});

test('the bar never covers the last pick, and every tab fits 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  await expect(rows(page).first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const bar = await tabs(page).boundingBox();
  const footer = await page.getByText('Prices and icons: OSRS Wiki').boundingBox();
  expect(bar && footer && footer.y + footer.height).toBeLessThanOrEqual(bar?.y ?? 0);

  for (const name of ['Picks', 'My flips', 'Watchlist', 'Settings']) {
    await tab(page, name).click();
    await expect(tab(page, name)).toHaveAttribute('aria-current', 'page');
    const box = await tab(page, name).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      320,
    );
  }
});
