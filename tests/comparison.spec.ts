import { test, expect, type Page } from '@playwright/test';
import { rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { folder } from './fixture';

async function openComparison(page: Page, comparison: 'modified' | 'added' | 'deleted' | 'empty' = 'modified'): Promise<void> {
  await page.goto('/');
  const root = await folder({ comparison });
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
