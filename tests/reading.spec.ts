import { test, expect, type Page } from '@playwright/test';
import { rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { folder, generation } from './fixture';

async function openReader(page: Page): Promise<void> {
  await page.goto('/');
  const root = await folder();
  try {
    await page.getByLabel('Import raccoon-artifacts folder').setInputFiles(root);
    await expect.poll(() => page.evaluate(() => document.querySelector('[role="status"]')?.textContent)).toContain('Imported bajor/example.');
  } finally { await rm(dirname(root), { recursive: true, force: true }); }
  await page.getByRole('button', { name: 'Open PR #1', exact: true }).click();
}

test('opens final state with full literal source instead of executing HTML', async ({ page }) => {
  await openReader(page);
  await expect(page.getByRole('heading', { name: 'Request flow · Final state', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Complete source file' })).toContainText('<script>window.leaked = true</script>');
  await expect(page.getByLabel('Explanation')).toContainText('<img src=x onerror="window.leaked=true">');
  expect(await page.evaluate(() => 'leaked' in window)).toBe(false);
});

test('historical stage shows its complete older file', async ({ page }) => {
  await openReader(page);
  await page.getByText('History map and commit shortcuts', { exact: true }).click();
  await page.getByRole('button', { name: 'Before PR · 00000000 Existing handler', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Complete source file' })).toContainText('old context');
  await expect(page.getByText('src/main.ts · 0000000000 · lines 1-1 · 2 total', { exact: true })).toBeVisible();
});

test('repeated references remain distinct ordered navigation positions', async ({ page }) => {
  await openReader(page);
  await expect(page.getByText('Reference 1/2', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next reference', exact: true }).click();
  await expect(page.getByText('Reference 2/2', { exact: true })).toBeVisible();
});

test('keyboard toggles narrative while diagram navigation remains available', async ({ page }) => {
  await openReader(page);
  await page.keyboard.press('n');
  await expect(page.getByLabel('Explanation')).toBeHidden();
  await page.keyboard.press('d');
  await expect(page.getByRole('img', { name: 'Request path', exact: true })).toBeVisible();
});

test('reaching the explanation end persists its read marker', async ({ page }) => {
  await openReader(page);
  await page.getByText('End of explanation', { exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Mark unread', exact: true })).toBeVisible();
  const key = JSON.stringify(['bajor/example', 1, generation, 'flow', 'current']);
  expect(await page.evaluate(async (key) => {
    const db = await new Promise<IDBDatabase>((resolve) => { const request = indexedDB.open('raccoon'); request.onsuccess = () => resolve(request.result); });
    const value = await new Promise<unknown>((resolve) => { const request = db.transaction('progress').objectStore('progress').get(key); request.onsuccess = () => resolve(request.result); });
    db.close(); return value;
  }, key)).toBe(true);
});

test('cached application and source reopen offline', async ({ page, context }) => {
  await openReader(page);
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Open PR #1', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Complete source file' })).toContainText('export function handler()');
});
