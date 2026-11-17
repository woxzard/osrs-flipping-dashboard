import type { Page } from '@playwright/test';
import { expect, samplePicks, serveHistory, servePicks, test } from './fixtures.ts';

const picks = (page: Page) => page.getByRole('list', { name: 'Picks' }).getByRole('article');
const blocked = (page: Page) =>
  page.getByRole('list', { name: 'Blocked items' }).getByRole('article');
const tabs = (page: Page) => page.getByRole('navigation', { name: 'Sections' });
const toast = (page: Page) => page.locator('.toast');

test.beforeEach(async ({ page }) => {
  await servePicks(page, { status: 200, body: samplePicks });
  await serveHistory(page);
});

test('Never show keeps an item out of the picks, with Undo', async ({ page }) => {
  await page.goto('/?cash=50m&slots=1&vol=all');
  const name = (await picks(page).first().getAttribute('aria-label')) ?? '';
  await picks(page)
    .first()
    .click({ position: { x: 40, y: 60 } });
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();

  await page.getByRole('button', { name: 'Never show this item' }).click();
  await expect(toast(page)).toContainText('Blocked');
  await expect(page.getByText('Blocked: never shown in the picks.')).toBeVisible();
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: 'Never show this item' })).toBeVisible();

  await page.getByRole('button', { name: 'Never show this item' }).click();
  await page.getByRole('button', { name: 'Picks' }).first().click(); // "‹ Picks"
  await expect(picks(page).first()).not.toHaveAccessibleName(name);
  await expect(picks(page)).toHaveCount(10);
  await expect(page.getByText('Not shown: 1 blocked (Settings).')).toBeVisible();

  // Still blocked after closing the browser.
  await page.reload();
  await expect(picks(page).first()).not.toHaveAccessibleName(name);
});

test('Settings lists blocked items; Show again brings one back, with Undo', async ({ page }) => {
  await page.goto('/?cash=50m&slots=1&vol=all&item=27226');
  await page.getByRole('button', { name: 'Never show this item' }).click();

  await tabs(page).getByRole('link', { name: 'Settings' }).click();
  await expect(blocked(page)).toHaveCount(1);
  await expect(blocked(page).first()).toHaveAccessibleName('Masori mask');

  // The item opens from here and comes back here.
  await blocked(page)
    .first()
    .click({ position: { x: 40, y: 20 } });
  await expect(page.getByRole('heading', { level: 1, name: 'Masori mask' })).toBeVisible();
  await page.getByRole('button', { name: 'Settings' }).click(); // "‹ Settings"
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();

  await blocked(page).first().getByRole('button', { name: 'Show again: Masori mask' }).click();
  await expect(blocked(page)).toHaveCount(0);
  await expect(page.getByText('Nothing blocked.')).toBeVisible();
  await expect(toast(page)).toContainText('Shows in the picks again');
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await expect(blocked(page)).toHaveCount(1);

  await blocked(page).first().getByRole('button', { name: 'Show again: Masori mask' }).click();
  await tabs(page).getByRole('link', { name: 'Picks' }).click();
  await expect(page.getByRole('article', { name: 'Masori mask', exact: true })).toBeVisible();
});

test('flipped and blocked items are counted apart under the picks', async ({ page }) => {
  await page.goto('/?cash=50m&slots=1&vol=all');
  await picks(page)
    .first()
    .getByRole('button', { name: /^I'm flipping this/ })
    .click();
  await picks(page)
    .nth(1)
    .click({ position: { x: 40, y: 60 } });
  await page.getByRole('button', { name: 'Never show this item' }).click();
  await page.goBack();
  await expect(
    page.getByText("Not shown: 1 item you're flipping (My flips), 1 blocked (Settings)."),
  ).toBeVisible();
});
