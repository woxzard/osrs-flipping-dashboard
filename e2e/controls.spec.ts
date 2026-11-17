import type { Page } from '@playwright/test';
import { expect, samplePicks, servePicks, test } from './fixtures.ts';

const rows = (page: Page) => page.getByRole('list', { name: 'Picks' }).getByRole('article');
const chip = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

test.beforeEach(async ({ page }) => {
  await servePicks(page, { status: 200, body: samplePicks });
});

test('a cash chip re-sizes the list at once and goes into the address', async ({ page }) => {
  await page.goto('/');
  await expect(chip(page, '50m')).toHaveAttribute('aria-pressed', 'true');
  await expect(rows(page).first()).toHaveAccessibleName('Purple sweets');

  await chip(page, '100m').click();
  await expect(rows(page).first()).toHaveAccessibleName('Masori mask');
  await expect(page).toHaveURL(/\?cash=100m&slots=1&vol=all$/);

  await page.reload();
  await expect(chip(page, '100m')).toHaveAttribute('aria-pressed', 'true');
  await expect(rows(page).first()).toHaveAccessibleName('Masori mask');
});

test('a pasted link brings back cash, slots and tab', async ({ page }) => {
  await page.goto('/?cash=50m&slots=4&vol=high');

  await expect(page.getByRole('status', { name: '4 free slots' })).toBeVisible();
  await expect(page.getByText('Each pick is sized for 12.5m per slot.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'High', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByText(/^High: your order is at most 2% of what trades/)).toBeVisible();
  await expect(rows(page)).toHaveCount(10);
});

test('the slots stepper splits the cash and stops at 1 and 8', async ({ page }) => {
  await page.goto('/');
  const fewer = page.getByRole('button', { name: 'Fewer free slots' });
  const more = page.getByRole('button', { name: 'More free slots' });
  await expect(fewer).toBeDisabled();

  await more.click();
  await expect(page.getByText('Each pick is sized for 25m per slot.')).toBeVisible();
  await expect(page).toHaveURL(/slots=2/);

  for (let slot = 2; slot < 8; slot += 1) await more.click();
  await expect(page.getByRole('status', { name: '8 free slots' })).toBeVisible();
  await expect(more).toBeDisabled();
});

test('a custom amount is typed in millions and checked when done', async ({ page }) => {
  await page.goto('/');
  await chip(page, 'Custom').click();
  const field = page.getByLabel('Custom amount');
  await expect(field).toHaveAttribute('inputmode', 'decimal');
  await expect(field).toHaveValue('50');

  await field.fill('abc');
  await field.press('Enter');
  await expect(page.getByRole('alert')).toHaveText(/Enter an amount from 100k to 2.14b/);
  await expect(field).toHaveValue('abc');
  await expect(page).toHaveURL(/cash=50m/);

  await field.fill('25');
  await field.press('Enter');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page).toHaveURL(/cash=25m/);
  await expect(chip(page, 'Custom')).toHaveAttribute('aria-pressed', 'true');

  await page.reload();
  await expect(page.getByLabel('Custom amount')).toHaveValue('25');

  // Typing, then tapping another control without pressing Done: both count.
  await page.getByLabel('Custom amount').fill('30');
  await page.getByRole('button', { name: 'Low', exact: true }).click();
  await expect(page).toHaveURL(/cash=30m&slots=1&vol=low/);
  await expect(page.getByRole('button', { name: 'Low', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // A preset keeps the custom draft for later.
  await chip(page, '50m').click();
  await chip(page, 'Custom').click();
  await expect(page.getByLabel('Custom amount')).toHaveValue('30');
});

test('opening a link does not replace the remembered choice', async ({ page }) => {
  await page.goto('/');
  await chip(page, '100m').click();
  await page.goto('/?cash=5m&slots=4');
  await page.goto('/');
  await expect(chip(page, '100m')).toHaveAttribute('aria-pressed', 'true');
});

test('the last cash and slots are remembered for the next visit', async ({ page }) => {
  await page.goto('/');
  await chip(page, '10m').click();
  await page.getByRole('button', { name: 'More free slots' }).click();
  await expect(page).toHaveURL(/cash=10m&slots=2/);

  await page.goto('/');
  await expect(chip(page, '10m')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status', { name: '2 free slots' })).toBeVisible();
});

test('a short list says why and offers all volumes', async ({ page }) => {
  await page.goto('/?cash=5m&slots=4&vol=low');

  const card = page.getByRole('region', { name: 'A short list' });
  await expect(
    card.getByText(/^Only 1 Low-volume flip at 1.25m per slot\. A small order/),
  ).toBeVisible();
  await expect(
    page.getByRole('status').filter({ hasText: 'Only 1 Low-volume flip' }),
  ).toBeAttached();
  await expect(rows(page)).toHaveCount(1);

  await page.getByRole('button', { name: 'Show all volumes' }).click();
  await expect(rows(page)).toHaveCount(10);
  await expect(page).toHaveURL(/vol=all/);
});

test('controls are big enough to tap', async ({ page }) => {
  await page.goto('/');
  for (const name of ['10m', '50m', '100m', 'Custom', 'All', 'High', 'Low']) {
    const box = await chip(page, name).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
  }
});
