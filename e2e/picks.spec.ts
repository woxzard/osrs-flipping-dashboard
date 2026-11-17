import { expect, samplePicks, serveIcons, servePicks, test } from './fixtures.ts';

const picks = (page: import('@playwright/test').Page) =>
  page.getByRole('list', { name: 'Picks' }).getByRole('article');

test('shows when the picks were updated and the best ten for 50m in one slot', async ({ page }) => {
  await servePicks(page, { status: 200, body: samplePicks });
  await page.goto('/');

  await expect(page.getByText('Updated 23 min ago · 12:37 Manila time')).toBeVisible();
  await expect(picks(page)).toHaveCount(10);

  const first = page.getByRole('article', { name: 'Purple sweets' });
  await expect(first).toContainText('Buy at3,962');
  await expect(first).toContainText('Sell at4,218');
  await expect(first).toContainText('Quantity10,000 for 39.6m');
  await expect(first).toContainText('Profit after tax1.72m · 4.3%');
  await expect(first).toContainText('8 of 14 nights · typical');
  await expect(first).toContainText('Flat');
  await expect(picks(page).first()).toHaveAccessibleName('Purple sweets');
});

test('the update time keeps counting while the page stays open', async ({ page }) => {
  await servePicks(page, { status: 200, body: samplePicks });
  await page.goto('/');
  await expect(page.getByText('Updated 23 min ago')).toBeVisible();

  await page.clock.fastForward('10:00');
  await expect(page.getByText('Updated 33 min ago')).toBeVisible();
});

test('warning flags are written out, not just coloured', async ({ page }) => {
  const file = JSON.parse(samplePicks) as { items: { flags: string[]; name: string }[] };
  const first = file.items[0]!;
  first.flags = ['thin', 'tax-heavy'];
  await servePicks(page, { status: 200, body: JSON.stringify(file) });
  await page.goto('/');

  const warnings = page
    .getByRole('article', { name: first.name })
    .getByRole('list', { name: 'Warnings' });
  await expect(warnings.getByRole('listitem')).toHaveText([
    '⚠ Few trades in your hours: prices are rougher',
    '⚠ Tax takes over half the margin',
  ]);
});

test('item icons sit in a fixed tile and show a letter if they fail', async ({ page }) => {
  await serveIcons(page, 'fail');
  await servePicks(page, { status: 200, body: samplePicks });
  await page.goto('/');

  const row = page.getByRole('article', { name: 'Purple sweets' });
  await expect(row.locator('.icon-letter')).toHaveText('P');
  const failedBox = await row.locator('.icon-tile').boundingBox();

  await serveIcons(page, 'ok');
  await page.reload();
  await expect(row.locator('.icon-letter')).toHaveCount(0);
  await expect
    .poll(() => row.locator('.icon-tile img').evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  await expect(row.locator('.icon-tile img')).toHaveAttribute(
    'src',
    'https://oldschool.runescape.wiki/images/Purple_sweets_5.png',
  );
  expect(await row.locator('.icon-tile').boundingBox()).toEqual(failedBox);
});

test('says so when the job has not published anything yet', async ({ page }) => {
  await servePicks(page, { status: 404 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'No picks yet' })).toBeVisible();
});

test('says so when nothing makes a profit', async ({ page }) => {
  const body = JSON.stringify({ generatedAt: '2026-11-17T04:37:01Z', items: [] });
  await servePicks(page, { status: 200, body });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Nothing qualifies right now' })).toBeVisible();
});

test('an older results file with names only lists nothing rather than breaking', async ({
  page,
}) => {
  const items = [{ id: 4151, name: 'Abyssal whip' }];
  await servePicks(page, {
    status: 200,
    body: JSON.stringify({ generatedAt: '2026-11-17T04:37:01Z', items }),
  });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Nothing qualifies right now' })).toBeVisible();
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

test('the loading placeholders wait 0.3 s before showing, so a fast load never flashes', async ({
  page,
}) => {
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.unroute('**/osrs-flipping-dashboard/data/picks.json');
  await page.route('**/osrs-flipping-dashboard/data/picks.json', async (route) => {
    await held;
    await route.fulfill({ contentType: 'application/json', body: samplePicks });
  });
  await page.goto('/');

  const placeholders = page.getByRole('list', { name: 'Loading picks' });
  await expect(placeholders).toHaveCSS('opacity', '0');
  await page.clock.runFor(400);
  await expect(placeholders).not.toHaveCSS('opacity', '0');

  release();
  await expect(page.getByRole('list', { name: 'Picks' })).toBeVisible();
});
