import { expect, samplePicks, servePicks, test } from './fixtures.ts';

test('shows when the picks were updated and what they are', async ({ page }) => {
  await servePicks(page, { status: 200, body: samplePicks });
  await page.goto('/');

  await expect(page.getByText('Updated 23 min ago · 14:37 Manila time')).toBeVisible();
  const picks = page.getByRole('list', { name: 'Picks' }).getByRole('listitem');
  await expect(picks).toHaveText([
    'Abyssal whip',
    'Bandos chestplate',
    'Dragon bones',
    'Nature rune',
    'Cannonball',
  ]);
});

test('the update time keeps counting while the page stays open', async ({ page }) => {
  await servePicks(page, { status: 200, body: samplePicks });
  await page.goto('/');
  await expect(page.getByText('Updated 23 min ago')).toBeVisible();

  await page.clock.fastForward('10:00');
  await expect(page.getByText('Updated 33 min ago')).toBeVisible();
});

test('says so when the job has not published anything yet', async ({ page }) => {
  await servePicks(page, { status: 404 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'No picks yet' })).toBeVisible();
});

test('a failed load can be retried', async ({ page }) => {
  await servePicks(page, 'offline');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: "Couldn't load the picks" })).toBeVisible();

  await servePicks(page, { status: 200, body: samplePicks });
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('list', { name: 'Picks' })).toBeVisible();
});

test('fits a 320 px wide phone without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await servePicks(page, { status: 200, body: samplePicks });
  await page.goto('/');
  await expect(page.getByRole('list', { name: 'Picks' })).toBeVisible();

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflows).toBe(false);
});
