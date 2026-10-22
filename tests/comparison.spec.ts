import { test, expect, type Page } from '@playwright/test';
import { rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { folder, pythonSource } from './fixture';

async function openComparison(page: Page, comparison: 'modified' | 'added' | 'deleted' | 'empty' = 'modified', rawSource?: string): Promise<void> {
  await page.goto('/');
  const root = await folder({ comparison, ...(rawSource === undefined ? {} : { rawSource }) });
  try {
    await page.getByLabel('Import raccoon-artifacts folder').setInputFiles(root);
    await expect(page.getByRole('status')).toContainText('Imported bajor/example.');
  }
  finally { await rm(dirname(root), { recursive: true, force: true }); }
  await page.getByRole('button', { name: 'Open article #1', exact: true }).click();
  await expect(page.locator('.code-diff')).toBeVisible();
}

test('Python changes retain both revisions as literal source', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => { if (!request.url().startsWith('http://127.0.0.1:4173') && !request.url().startsWith('blob:')) external.push(request.url()); });
  await openComparison(page);
  const diff = page.locator('.code-diff');
  await expect(diff).toContainText('frozen=False'); await expect(diff).toContainText('frozen=True');
  await expect(diff).toContainText('return frame.score > threshold');
  await expect(diff).toContainText('return frame.score >= threshold');
  expect(await page.evaluate(() => 'leaked' in window)).toBe(false);
  expect(external).toEqual([]);
});

for (const comparison of ['added', 'deleted', 'empty'] as const) {
  test(`renders a ${comparison} file comparison`, async ({ page }) => {
    await openComparison(page, comparison);
    const diff = page.locator('.code-diff');
    await expect(diff.locator('figcaption')).toContainText('File absent');
    if (comparison === 'empty') await expect(diff.locator('figcaption')).toContainText('(empty)');
    else await expect(diff).toContainText('class Frame:');
  });
}

test('Python comparisons reopen without a network connection', async ({ page, context }) => {
  await openComparison(page);
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true); await page.reload();
  await page.getByRole('button', { name: 'Open article #1', exact: true }).click();
  await expect(page.locator('.code-diff')).toContainText('return frame.score >= threshold');
});

test('split comparisons stay readable after rotation to a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await openComparison(page);
  const diff = page.locator('.code-diff');
  const prose = await page.locator('.chapter-summary').boundingBox();
  expect((await diff.boundingBox())!.width).toBeGreaterThan(prose!.width);
  const before = await diff.locator('[data-deletions]').boundingBox();
  const after = await diff.locator('[data-additions]').boundingBox();
  expect(before!.x + before!.width).toBeLessThanOrEqual(after!.x + 1);
  expect(Math.abs(before!.y - after!.y)).toBeLessThan(1);
  await page.setViewportSize({ width: 390, height: 844 });
  const region = diff.getByRole('region', { name: 'Side-by-side code comparison' });
  await region.focus();
  await expect.poll(() => region.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  await region.evaluate((node) => { node.scrollLeft = node.scrollWidth; });
  await expect.poll(() => region.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('long Python changes fit paper without clipping', async ({ page }) => {
  const source = pythonSource + Array.from({ length: 90 }, (_, i) => `value_${i} = "${'reading '.repeat(32)}"\n`).join('');
  await openComparison(page, 'modified', source);
  await page.getByRole('button', { name: 'Theme', exact: true }).click();
  const a4ContentWidth = 673; // A4 minus two 16 mm margins, at 96 CSS pixels/inch.
  await page.setViewportSize({ width: a4ContentWidth, height: 900 });
  await page.emulateMedia({ media: 'print' });
  const diff = page.locator('.code-diff');
  await expect(diff).toContainText('value_89 =');
  await expect.poll(() => diff.evaluate((node) => {
    const root = node.querySelector('diffs-container')!.shadowRoot!;
    return [...root.querySelectorAll<HTMLElement>('[data-code]')].every((column) => column.scrollWidth <= column.clientWidth + 1);
  })).toBe(true);
  expect((await diff.boundingBox())!.width).toBeLessThanOrEqual(a4ContentWidth);
  await page.emulateMedia({ media: 'screen' });
  const region = diff.getByRole('region', { name: 'Side-by-side code comparison' });
  await expect.poll(() => region.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
});
