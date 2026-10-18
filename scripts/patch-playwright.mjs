import { readFile, writeFile } from 'node:fs/promises';

// Apache-2.0 upstream fix, backported to the pinned compiled distribution:
// https://github.com/microsoft/playwright/commit/be8d329ef15914f7a0001e2d95828c995d6cca6b
// ponytail: Remove this backport when upgrading to a stable release containing it.
const root = new URL('../node_modules/playwright-core/', import.meta.url);
const { version } = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
if (version !== '1.64.1') throw new Error('Review/remove the Playwright folder-upload backport before changing version');
const path = new URL('lib/coreBundle.js', root);
const source = await readFile(path, 'utf8');
const before = `          const waitForInputEvent = localDirectory ? this.evaluate((node) => new Promise((fulfill) => {
            node.addEventListener("input", fulfill, { once: true });
          })).catch(() => {
          }) : Promise.resolve();
          await this._page.delegate.setInputFilePaths(progress2, retargeted, localPathsOrDirectory);
          await progress2.race(waitForInputEvent);`;
const after = `          const inputEvent = localDirectory ? await progress2.race(retargeted.evaluateHandle((node) => ({
            promise: new Promise((fulfill) => node.addEventListener("input", () => fulfill(), { once: true })),
          })).catch(() => undefined)) : undefined;
          try {
            await this._page.delegate.setInputFilePaths(progress2, retargeted, localPathsOrDirectory);
            if (inputEvent)
              await progress2.race(inputEvent.evaluate((event) => event.promise).catch(() => {}));
          } finally {
            inputEvent?.dispose();
          }`;
if (!source.includes(after)) {
  if (source.split(before).length !== 2) throw new Error('Unexpected Playwright distribution; folder-upload backport not applied');
  await writeFile(path, source.replace(before, after));
}
console.log('Playwright 1.64.1: acknowledged native folder-upload listener backport applied.');
