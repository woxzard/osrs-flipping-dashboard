import type { Page } from '@playwright/test';
import { expect, samplePicks, serveHistory, servePicks, test } from './fixtures.ts';

// Only three items have a saved history (samples/published/history); the
// rest answer "not found", so with my own hours the list holds those three.
const tabs = (page: Page) => page.getByRole('navigation', { name: 'Sections' });
const picks = (page: Page) => page.getByRole('list', { name: 'Picks' }).getByRole('article');
const toast = (page: Page) => page.locator('.toast');
const sweets = (page: Page) => page.getByRole('article', { name: 'Purple sweets', exact: true });
const myHoursLine = 'Scored on this phone with your night hours: 02:00–10:00, 10:00–20:00.';

async function setHours(page: Page, bed: string, wake: string, stop: string) {
  await page.getByLabel('Start buying (bedtime)').selectOption(bed);
  await page.getByLabel('Start selling (wake up)').selectOption(wake);
  await page.getByLabel('Stop selling').selectOption(stop);
}

test.beforeEach(async ({ page }) => {
  await servePicks(page, { status: 200, body: samplePicks });
  await serveHistory(page);
});

test('my own night hours re-score the picks on the phone, and are kept', async ({ page }) => {
  await page.goto('/?cash=50m&slots=1&vol=all');
  await expect(sweets(page).getByText('Buy at3,962')).toBeVisible();

  await tabs(page).getByRole('link', { name: 'Settings' }).click();
  await setHours(page, '02:00', '10:00', '20:00');
  await expect(toast(page)).toContainText('Night hours saved');
  await expect(page.getByText('Your hours.')).toBeVisible();

  await tabs(page).getByRole('link', { name: 'Picks' }).click();
  await expect(page.getByText(myHoursLine)).toBeVisible();
  await expect(picks(page)).toHaveCount(3);
  await expect(sweets(page).getByText('Buy at')).toBeVisible();
  await expect(sweets(page).getByText('Buy at3,962')).toHaveCount(0);

  // The item screen measures nights with my hours too.
  await sweets(page).click({ position: { x: 40, y: 60 } });
  await expect(page.getByText('Each night runs from 02:00 to 20:00, Manila time.')).toBeVisible();

  // Closing the browser keeps them.
  await page.reload();
  await expect(page.getByText('Each night runs from 02:00 to 20:00, Manila time.')).toBeVisible();
  await page.goto('/?view=settings');
  await expect(page.getByLabel('Start buying (bedtime)')).toHaveValue('2');
});

test('back to the default hours, by the button or by Undo', async ({ page }) => {
  await page.goto('/?view=settings');
  await setHours(page, '02:00', '10:00', '20:00');
  await expect(page.getByText('Your hours.')).toBeVisible();

  await expect(page.getByText('The default is 22:00–07:00, 07:00–22:00.')).toBeVisible();
  await page.getByRole('button', { name: 'Use the default hours' }).click();
  await expect(toast(page)).toContainText('Back to the default hours');
  await expect(page.getByLabel('Start buying (bedtime)')).toHaveValue('22');
  await tabs(page).getByRole('link', { name: 'Picks' }).click();
  await expect(sweets(page).getByText('Buy at3,962')).toBeVisible();
  await expect(page.getByText(myHoursLine)).toHaveCount(0);

  // Undo puts my hours back.
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText(myHoursLine)).toBeVisible();
});

test('hours that overlap the next night are refused, and nothing is saved', async ({ page }) => {
  await page.goto('/?view=settings');
  await page.getByLabel('Stop selling').selectOption('23:00'); // 9 h buying + 16 h selling
  await expect(page.getByRole('alert')).toContainText(
    'Buying and selling together must fit in 24 hours, before the next night starts. Not saved yet.',
  );
  await expect(page.getByLabel('Stop selling')).toHaveValue('23'); // kept as chosen
  await expect(toast(page)).toHaveCount(0);

  await page.reload();
  await expect(page.getByLabel('Stop selling')).toHaveValue('22');
});

test('shows progress while scoring, and a failed download can be retried', async ({ page }) => {
  await page.goto('/?view=settings');
  await setHours(page, '02:00', '10:00', '20:00');

  // Every history fails: more than 1 in 10, so nothing is scored.
  await serveHistory(page, 'offline');
  await page.reload();
  await tabs(page).getByRole('link', { name: 'Picks' }).click();
  await expect(page.getByRole('heading', { name: "Couldn't load the picks" })).toBeVisible();

  // Held downloads: the progress shows until they arrive.
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.unroute('**/osrs-flipping-dashboard/data/history/*.json');
  await page.route('**/osrs-flipping-dashboard/data/history/*.json', async (route) => {
    await held;
    await route.fulfill({ status: 404 });
  });
  await page.getByRole('button', { name: 'Try again' }).filter({ visible: true }).click();
  await expect(page.getByRole('heading', { name: 'Scoring with your night hours' })).toBeVisible();
  await expect(page.getByRole('progressbar')).toBeVisible();
  await serveHistory(page);
  release();
  await expect(page.getByRole('heading', { name: 'Scoring with your night hours' })).toHaveCount(0);
});

test('a newer hourly update keeps the scored list until it is scored too', async ({ page }) => {
  await page.goto('/?view=settings');
  await setHours(page, '02:00', '10:00', '20:00');
  await tabs(page).getByRole('link', { name: 'Picks' }).click();
  await expect(picks(page)).toHaveCount(3);

  // A newer file arrives while its histories are slow (held) or failing.
  const newer = JSON.parse(samplePicks) as { generatedAt: string };
  newer.generatedAt = '2026-11-17T05:07:00Z';
  await servePicks(page, { status: 200, body: JSON.stringify(newer) });
  await serveHistory(page, 'offline');
  await page.clock.fastForward('01:30');
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByRole('heading', { name: "Couldn't load the picks" })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Scoring with your night hours' })).toHaveCount(0);
  await expect(picks(page)).toHaveCount(3);
  await expect(page.getByText(myHoursLine)).toBeVisible();
});
