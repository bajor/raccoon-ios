import { test, expect, type Page } from '@playwright/test';
import { rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { folder, generation } from './fixture';

async function openReader(page: Page, options: Parameters<typeof folder>[0] = {}, double = false): Promise<void> {
  await page.goto('/');
  const root = await folder(options);
  try {
    await page.getByLabel('Import raccoon-artifacts folder').setInputFiles(root);
    await expect.poll(() => page.evaluate(() => document.querySelector('[role="status"]')?.textContent)).toContain('Imported bajor/example.');
  } finally { await rm(dirname(root), { recursive: true, force: true }); }
  const open = page.getByRole('button', { name: 'Open article #1', exact: true });
  if (double) await open.dblclick(); else await open.click();
  await expect(page.getByRole('article', { name: 'Learning article' })).toBeVisible();
}

test('all chapters and historical evidence form one literal article', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => { if (!request.url().startsWith('http://127.0.0.1:4173') && !request.url().startsWith('blob:')) external.push(request.url()); });
  await openReader(page, { twoChapters: true });
  const article = page.getByRole('article', { name: 'Learning article' });
  await expect(article.getByRole('heading', { name: '1. Request flow', exact: true })).toBeVisible();
  await expect(article.getByRole('heading', { name: '2. Response formatting', exact: true })).toBeVisible();
  await expect(article).toContainText('<script>window.leaked = true</script>');
  await expect(article).toContainText('<img src=x onerror="window.leaked=true">');
  await expect(article).toContainText('old handler');
  expect(await page.evaluate(() => 'leaked' in window)).toBe(false);
  expect(external).toEqual([]);
});

test('code appears at each authored position and shows only the referenced range', async ({ page }) => {
  await openReader(page, { long: true });
  const blocks = page.locator('.article-section').first();
  await expect(blocks.locator('pre')).toHaveCount(2);
  await expect(blocks.locator('pre').first()).toContainText('handler line 500\nhandler line 501\nhandler line 502\nhandler line 503');
  await expect(blocks.locator('pre').first()).not.toContainText('handler line 499');
  const explanation = blocks.getByText('The same handler is used again.', { exact: true });
  const firstCode = await blocks.locator('pre').first().boundingBox();
  const bridge = await explanation.boundingBox();
  const secondCode = await blocks.locator('pre').nth(1).boundingBox();
  const diagram = await blocks.getByRole('button', { name: 'Expand diagram: Request path', exact: true }).boundingBox();
  expect(firstCode!.y + firstCode!.height).toBeLessThan(bridge!.y);
  expect(bridge!.y + bridge!.height).toBeLessThan(secondCode!.y);
  expect(secondCode!.y + secondCode!.height).toBeLessThan(diagram!.y);
});

test('Read hides controls and touch reveals a usable exit', async ({ page }) => {
  await openReader(page);
  await page.getByRole('button', { name: 'Read', exact: true }).click();
  await expect(page.getByLabel('Import raccoon-artifacts folder')).toBeHidden();
  await expect(page.getByLabel('Display preferences')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Library', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Show controls', exact: true })).toBeHidden();
  await page.locator('.introduction').click();
  await page.getByRole('button', { name: 'Show controls', exact: true }).click();
  await expect(page.getByLabel('Display preferences')).toBeVisible();
});

test('concurrent opens install one keyboard handler', async ({ page }) => {
  await openReader(page, {}, true);
  await page.keyboard.press('f');
  await expect(page.getByRole('button', { name: 'Read', exact: true })).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Read', exact: true })).toBeVisible();
});

test('Read preserves the current excerpt position', async ({ page }) => {
  await openReader(page, { long: true });
  const excerpt = page.locator('pre').first();
  await excerpt.scrollIntoViewIfNeeded();
  const before = (await excerpt.boundingBox())!.y;
  await page.keyboard.press('f');
  await expect.poll(async () => Math.abs((await excerpt.boundingBox())!.y - before)).toBeLessThan(2);
  await page.keyboard.press('Escape');
  await expect.poll(async () => Math.abs((await excerpt.boundingBox())!.y - before)).toBeLessThan(2);
});

test('larger article text persists across reload', async ({ page }) => {
  await openReader(page);
  const before = (await page.locator('.introduction').boundingBox())!.height;
  await page.getByRole('button', { name: 'Larger text', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Open article #1', exact: true }).click();
  await expect.poll(async () => (await page.locator('.introduction').boundingBox())!.height).toBeGreaterThan(before);
});

test('expanded diagrams fit and reselect layout after rotation', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await openReader(page);
  await page.getByRole('button', { name: 'Expand diagram: Request path', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Request path' });
  const image = dialog.getByRole('img', { name: 'Request path' });
  await expect(image).toHaveAttribute('data-layout', 'landscape');
  await page.setViewportSize({ width: 600, height: 1000 });
  await expect(image).toHaveAttribute('data-layout', 'portrait');
  const bounds = await image.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(600); expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(1000);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test.describe('diagram scroll locking', () => {
  // Playwright cannot send wheel input in mobile WebKit emulation.
  test.use({ isMobile: false });
  for (const close of ['button', 'Escape'] as const) test(`wheel input preserves article position through ${close}`, async ({ page }) => {
    await openReader(page, { long: true });
    const trigger = page.getByRole('button', { name: 'Expand diagram: Request path', exact: true });
    await trigger.scrollIntoViewIfNeeded();
    const before = await trigger.boundingBox();
    const scroll = await page.evaluate(() => window.scrollY);
    await trigger.click();
    await page.getByRole('dialog').getByRole('img', { name: 'Request path' }).hover();
    await page.mouse.wheel(0, 600);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    expect(Math.abs((await trigger.boundingBox())!.y - before!.y)).toBeLessThan(2);
    if (close === 'button') await page.getByRole('button', { name: 'Close diagram', exact: true }).click();
    else await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scroll);
  });
});

test('print includes complete article figures and excludes controls', async ({ page }) => {
  await openReader(page, { twoChapters: true });
  await page.getByRole('button', { name: 'Expand diagram: Request path', exact: true }).first().click();
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByLabel('Import raccoon-artifacts folder')).toBeHidden();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('.print-diagram').first()).toBeVisible();
  await expect(page.locator('.print-diagram').first()).toHaveAttribute('data-layout', 'portrait');
  await expect(page.getByRole('heading', { name: '2. Response formatting', exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toContainText('old handler');
});

test('chapter completion persists locally', async ({ page }) => {
  await openReader(page);
  await page.getByText('End of chapter 1', { exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Mark unread: Request flow', exact: true })).toBeAttached();
  const key = JSON.stringify(['bajor/example', 1, generation, 'flow']);
  await expect.poll(() => page.evaluate(async (key) => {
    const db = await new Promise<IDBDatabase>((resolve) => { const request = indexedDB.open('raccoon-articles'); request.onsuccess = () => resolve(request.result); });
    const value = await new Promise<unknown>((resolve) => { const request = db.transaction('progress').objectStore('progress').get(key); request.onsuccess = () => resolve(request.result); });
    db.close(); return value;
  }, key)).toBe(true);
});

test('manual unread is not undone by contents navigation', async ({ page }) => {
  await openReader(page);
  await page.getByText('End of chapter 1', { exact: true }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Mark unread: Request flow', exact: true }).click();
  await page.getByRole('link', { name: 'Request flow', exact: true }).click();
  await page.getByText('End of chapter 1', { exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Mark read: Request flow', exact: true })).toBeAttached();
});

test('cached application and article reopen offline', async ({ page, context }) => {
  await openReader(page);
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true); await page.reload();
  await page.getByRole('button', { name: 'Open article #1', exact: true }).click();
  await expect(page.getByRole('article')).toContainText('export function handler()');
});
