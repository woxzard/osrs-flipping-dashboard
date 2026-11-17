import { expect, samplePicks, serveHistory, servePicks, test } from './fixtures.ts';

// The sample was made at 04:37:01 UTC (12:37 Manila); the clock starts 23 min later.
const warning = /These prices are .* old\. The hourly update may have stalled/;

test.beforeEach(async ({ page }) => {
  await servePicks(page, { status: 200, body: samplePicks });
  await serveHistory(page);
});

test('fresh prices carry no warning', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Updated 23 min ago · 12:37 Manila time')).toBeVisible();
  await expect(page.getByText(warning)).toHaveCount(0);
});

test('just under two hours old is still fine; just over warns, while the page stays open', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText('Updated 23 min ago')).toBeVisible(); // its timer is running
  await page.clock.fastForward('01:35:00'); // 1 h 58 min old
  await expect(page.getByText('Updated 1 h 58 min ago')).toBeVisible();
  await expect(page.getByText(warning)).toHaveCount(0);

  await page.clock.fastForward('03:00'); // 2 h 1 min old
  await expect(page.getByText('Updated 2 h 1 min ago')).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: warning })).toHaveText(
    '⚠ These prices are 2 h 1 min old. The hourly update may have stalled, so offers could be off. Check the live price in the game before you buy.',
  );
});

test('well past two hours the warning is on the list and on an item', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-17T11:30:00Z')); // about 7 hours old
  await page.goto('/');
  await expect(page.getByText('These prices are 6 h 52 min old.', { exact: false })).toBeVisible();

  await page.getByRole('link', { name: 'Purple sweets' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Purple sweets' })).toBeVisible();
  await expect(
    page.getByText('These prices are 6 h 52 min old.', { exact: false }).filter({ visible: true }),
  ).toBeVisible();
});

test('coming back to the page fetches newer prices instead of warning about an old copy', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText('Updated 23 min ago')).toBeVisible(); // its timer is running
  await page.clock.fastForward('02:10:00');
  await expect(page.getByText(warning)).toBeVisible();

  // The page checks at most once a minute; jumping the clock can make its own
  // 5-minute check land just now, so come back a minute later, as a phone would.
  await page.clock.fastForward('01:00');

  // The job has published since: the page picks it up when it comes back into view.
  const newer = JSON.parse(samplePicks) as { generatedAt: string };
  newer.generatedAt = '2026-11-17T07:08:00Z';
  await servePicks(page, { status: 200, body: JSON.stringify(newer) });
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByText('Updated 3 min ago · 15:08 Manila time')).toBeVisible();
  await expect(page.getByText(warning)).toHaveCount(0);
});
