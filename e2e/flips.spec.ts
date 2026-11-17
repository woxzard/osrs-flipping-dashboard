import type { Page } from '@playwright/test';
import { expect, samplePicks, serveHistory, servePicks, test } from './fixtures.ts';

const picks = (page: Page) => page.getByRole('list', { name: 'Picks' }).getByRole('article');
const flips = (page: Page) => page.getByRole('list', { name: 'My flips' }).getByRole('article');
const tabs = (page: Page) => page.getByRole('navigation', { name: 'Sections' });
const toast = (page: Page) => page.locator('.toast');

test.beforeEach(async ({ page }) => {
  await servePicks(page, { status: 200, body: samplePicks });
  await serveHistory(page);
});

test("I'm flipping this hides the pick, with Undo", async ({ page }) => {
  await page.goto('/?cash=50m&slots=1&vol=all');
  const first = picks(page).first();
  const name = (await first.getAttribute('aria-label')) ?? '';
  const second = (await picks(page).nth(1).getAttribute('aria-label')) ?? '';

  await first.getByRole('button', { name: /^I'm flipping this/ }).click();
  await expect(page).toHaveURL(/\?cash=50m&slots=1&vol=all$/); // the tap didn't open the item
  await expect(toast(page)).toContainText('Hidden');
  await expect(picks(page).first()).toHaveAccessibleName(second);
  await expect(picks(page)).toHaveCount(10); // the next one moves up
  await expect(page.getByText("Not shown: 1 item you're flipping (My flips).")).toBeVisible();
  await expect(tabs(page).getByRole('link', { name: 'My flips 1' })).toBeVisible();

  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await expect(picks(page).first()).toHaveAccessibleName(name);
  await expect(toast(page)).toHaveCount(0);
  await expect(tabs(page).getByRole('link', { name: 'My flips', exact: true })).toBeVisible();
});

test('the Undo message goes away on its own after about 5 seconds', async ({ page }) => {
  await page.clock.pauseAt(new Date('2026-11-17T05:01:00Z'));
  await page.goto('/');
  await picks(page)
    .first()
    .getByRole('button', { name: /^I'm flipping this/ })
    .click();
  await expect(toast(page)).toBeVisible();
  await page.clock.runFor(4_500);
  await expect(toast(page)).toBeVisible();
  await page.clock.runFor(600);
  await expect(toast(page)).toHaveCount(0);

  // A new message replaces the old one and gets its own full time.
  await picks(page)
    .first()
    .getByRole('button', { name: /^I'm flipping this/ })
    .click();
  await page.clock.runFor(3_000);
  await picks(page)
    .first()
    .getByRole('button', { name: /^I'm flipping this/ })
    .click();
  await expect(toast(page)).toHaveCount(1);
  await page.clock.runFor(3_000);
  await expect(toast(page)).toBeVisible();
  await page.clock.runFor(2_100);
  await expect(toast(page)).toHaveCount(0);
});

test('My flips lists what I ticked until I mark it sold, and keeps it after closing', async ({
  page,
  context,
}) => {
  await page.goto('/?cash=50m&slots=1&vol=all');
  const first = picks(page).first();
  const name = (await first.getAttribute('aria-label')) ?? '';
  const buy = (await first.locator('dd.price').first().textContent()) ?? '';
  await first.getByRole('button', { name: /^I'm flipping this/ }).click();

  await tabs(page)
    .getByRole('link', { name: /^My flips/ })
    .click();
  await expect(flips(page)).toHaveCount(1);
  const row = flips(page).first();
  await expect(row).toHaveAccessibleName(name);
  await expect(row.getByText(`Buy at${buy}`)).toBeVisible();
  await expect(row.getByText('Ticked just now')).toBeVisible();

  // Closing the browser: a new page in the same browser keeps the list.
  await page.close();
  const again = await context.newPage();
  await servePicks(again, { status: 200, body: samplePicks });
  await again.goto('/?view=flips');
  await expect(flips(again).first()).toHaveAccessibleName(name);

  // Sold puts it back in the picks; Undo takes it back to My flips.
  await flips(again)
    .first()
    .getByRole('button', { name: `Sold: ${name}` })
    .click();
  await expect(flips(again)).toHaveCount(0);
  await expect(again.getByRole('heading', { name: 'No flips yet' })).toBeVisible();
  await expect(toast(again)).toContainText('Marked sold');
  await toast(again).getByRole('button', { name: 'Undo' }).click();
  await expect(flips(again).first()).toHaveAccessibleName(name);
  await expect(flips(again).getByText('Ticked just now')).toBeVisible();

  await flips(again)
    .first()
    .getByRole('button', { name: `Sold: ${name}` })
    .click();
  await tabs(again).getByRole('link', { name: 'Picks' }).click();
  await expect(picks(again).first()).toHaveAccessibleName(name);
});

test('ticking from the item stays on the item; back finds the list without it', async ({
  page,
}) => {
  await page.goto('/?cash=50m&slots=1&vol=all');
  const name = (await picks(page).nth(2).getAttribute('aria-label')) ?? '';
  await picks(page)
    .nth(2)
    .click({ position: { x: 40, y: 60 } });
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();

  await page.getByRole('button', { name: "I'm flipping this", exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  await expect(page.getByText("You're flipping this")).toBeVisible();
  await expect(toast(page)).toContainText('Hidden');

  await page.getByRole('button', { name: 'Picks' }).click();
  await expect(picks(page)).toHaveCount(10);
  await expect(
    page.getByRole('article', { name, exact: true }).filter({ visible: true }),
  ).toHaveCount(0);

  // From My flips, the item goes back to My flips; Sold there finishes it.
  await tabs(page)
    .getByRole('link', { name: /^My flips/ })
    .click();
  await flips(page)
    .first()
    .click({ position: { x: 40, y: 60 } });
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  await page.getByRole('button', { name: 'Sold', exact: true }).click();
  await expect(page.getByRole('button', { name: "I'm flipping this", exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'My flips' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'My flips' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No flips yet' })).toBeVisible();
});

test('a flip says how long ago it was ticked, and the sell price if it changed', async ({
  page,
}) => {
  await page.goto('/?cash=50m&slots=1&vol=all');
  const name = (await picks(page).first().getAttribute('aria-label')) ?? '';
  await picks(page)
    .first()
    .getByRole('button', { name: /^I'm flipping this/ })
    .click();

  // An hour later the update suggests another sell price.
  const newer = JSON.parse(samplePicks) as {
    generatedAt: string;
    items: { name: string; sellPrice: number }[];
  };
  newer.generatedAt = '2026-11-17T08:07:00Z';
  const item = newer.items.find((entry) => entry.name === name);
  if (!item) throw new Error('missing item');
  item.sellPrice += 25;
  await page.clock.setFixedTime(new Date('2026-11-17T08:10:00Z'));
  await servePicks(page, { status: 200, body: JSON.stringify(newer) });
  await page.goto('/?view=flips');
  await expect(flips(page).first().getByText('Ticked 3 h 9 min ago')).toBeVisible();
  await expect(
    flips(page)
      .first()
      .getByText(`This hour: sell at ${item.sellPrice.toLocaleString('en-US')}`),
  ).toBeVisible();
});

test('a flip that left the hourly update can still be opened and marked sold', async ({ page }) => {
  await page.goto('/?cash=50m&slots=1&vol=all');
  const name = (await picks(page).first().getAttribute('aria-label')) ?? '';
  await picks(page)
    .first()
    .getByRole('button', { name: /^I'm flipping this/ })
    .click();

  const newer = JSON.parse(samplePicks) as { items: { name: string }[] };
  newer.items = newer.items.filter((item) => item.name !== name);
  await servePicks(page, { status: 200, body: JSON.stringify(newer) });
  await page.goto('/?view=flips');
  await flips(page)
    .first()
    .click({ position: { x: 40, y: 60 } });
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.getByText("You're flipping this")).toBeVisible();
  await page.getByRole('button', { name: 'Sold', exact: true }).click();
  await expect(toast(page)).toContainText('Marked sold');
  await page.getByRole('button', { name: 'My flips' }).click();
  await expect(page.getByRole('heading', { name: 'No flips yet' })).toBeVisible();
});

test('the message sits above the tab bar, also with large text', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  await page.addStyleTag({ content: '.tabbar a { font-size: 1.25rem; }' });
  await picks(page)
    .first()
    .getByRole('button', { name: /^I'm flipping this/ })
    .click();
  await expect(toast(page)).toBeVisible();
  await expect
    .poll(async () => {
      const message = await toast(page).boundingBox();
      const bar = await tabs(page).boundingBox();
      return message && bar ? bar.y - (message.y + message.height) : -1;
    })
    .toBeGreaterThanOrEqual(0);
});

test('says so when the browser keeps nothing, and still works for now', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error('blocked');
    };
  });
  await page.goto('/');
  await picks(page)
    .first()
    .getByRole('button', { name: /^I'm flipping this/ })
    .click();
  await tabs(page)
    .getByRole('link', { name: /^My flips/ })
    .click();
  await expect(flips(page)).toHaveCount(1);
  await expect(page.getByRole('alert')).toContainText("This browser isn't keeping your lists");
});
