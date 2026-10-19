import { test, expect, type Page } from '@playwright/test';
import { rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { folder, generation, replacement } from './fixture';

async function importData(page: Page, options: Parameters<typeof folder>[0] = {}): Promise<void> {
  const root = await folder(options);
  try {
    const input = page.getByLabel('Import raccoon-artifacts folder');
    await input.setInputFiles(root);
    await expect.poll(() => page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
      const status = document.querySelector('[role="status"]')?.textContent ?? '';
      return input.value === '' && input.files?.length === 0 && !input.disabled && /^(Imported |Import failed\.)/.test(status);
    })).toBe(true);
  }
  finally { await rm(dirname(root), { recursive: true, force: true }); }
}

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('complete local folder survives a browser reload', async ({ page }) => {
  await importData(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: '#1 Handler 1' })).toBeVisible();
});

test('denied persistence does not report a committed import as failed', async ({ page }) => {
  await page.evaluate(() => { navigator.storage.persist = async () => { throw new Error('Persistence denied'); }; });
  await importData(page);
  await expect(page.getByRole('status')).toContainText('Imported bajor/example.');
});

for (const [name, option, message] of [
  ['modified source bytes', { corrupt: true }, 'Checksum mismatch'],
  ['missing source asset', { missing: true }, 'Incomplete folder'],
  ['unsupported package version', { version: 1 }, 'Unsupported artifact version'],
  ['diagram viewport mismatch', { viewportMismatch: true }, 'Diagram viewport mismatch'],
] as const) {
  test(`failed replacement preserves cache: ${name}`, async ({ page }) => {
    await importData(page);
    await importData(page, { ...option, snapshot: replacement });
    await expect(page.getByRole('status')).toContainText(message);
    await page.reload();
    await expect(page.getByRole('heading', { name: '#1 Handler 1' })).toBeVisible();
  });
}

test('empty catalog removes that repository’s cached PRs', async ({ page }) => {
  await importData(page);
  await importData(page, { empty: true });
  await page.reload();
  await expect(page.getByText('No active artifacts in this repository.')).toBeVisible();
  await expect(page.getByRole('heading', { name: '#1 Handler 1' })).toHaveCount(0);
});

test('script-bearing SVG is rejected before caching', async ({ page }) => {
  await importData(page, { diagram: '<svg xmlns="http://www.w3.org/2000/svg"><script>window.leaked=true</script></svg>' });
  await expect(page.getByRole('status')).toContainText('SVG contains a non-static element');
  await expect(page.getByRole('heading', { name: '#1 Handler 1' })).toHaveCount(0);
});

test('CSS-escaped external SVG paint is rejected before caching', async ({ page }) => {
  const diagram = String.raw`<svg xmlns="http://www.w3.org/2000/svg"><rect fill="u\72l(https://example.invalid/probe#x)"/></svg>`;
  await importData(page, { diagram });
  await expect(page.getByRole('status')).toContainText('Unsafe SVG paint or resource');
  await expect(page.getByRole('heading', { name: '#1 Handler 1' })).toHaveCount(0);
});

test('new generation resets only the replaced PR’s progress', async ({ page }) => {
  await importData(page, { twoPrs: true });
  const keys = [1, 2].map((pr) => JSON.stringify(['bajor/example', pr, generation, 'flow']));
  await page.evaluate(async (keys) => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open('raccoon-articles'); request.onsuccess = () => resolve(request.result);
    });
    await new Promise<void>((resolve) => {
      const transaction = db.transaction('progress', 'readwrite');
      for (const key of keys) transaction.objectStore('progress').put(true, key);
      transaction.oncomplete = () => resolve();
    });
    db.close();
  }, keys);
  await importData(page, { snapshot: replacement, twoPrs: true });
  const remaining = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open('raccoon-articles'); request.onsuccess = () => resolve(request.result);
    });
    const keys = await new Promise<IDBValidKey[]>((resolve) => {
      const request = db.transaction('progress').objectStore('progress').getAllKeys(); request.onsuccess = () => resolve(request.result);
    });
    db.close(); return keys;
  });
  expect(remaining).toEqual([keys[1]]);
});
