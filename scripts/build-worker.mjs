import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const files = (await readdir('dist', { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name !== 'sw.js')
  .map((entry) => `${entry.parentPath}/${entry.name}`.slice('dist/'.length)).sort();
const hash = createHash('sha256');
for (const file of files) { hash.update(file); hash.update(await readFile(`dist/${file}`)); }
const version = hash.digest('hex').slice(0, 16);
const urls = files.map((file) => `./${file}`);
await writeFile('dist/sw.js', `
const PREFIX = 'raccoon-shell-' + self.registration.scope + '-';
const CACHE = PREFIX + ${JSON.stringify(version)};
const FILES = ${JSON.stringify(urls)};
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES))));
self.addEventListener('activate', (event) => event.waitUntil((async () => {
  for (const name of await caches.keys()) if (name.startsWith(PREFIX) && name !== CACHE) await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(async () => (await caches.open(CACHE)).match('./index.html')));
  } else if (FILES.some((file) => new URL(file, self.registration.scope).href === event.request.url)) {
    // These build-pinned files do not vary by request headers. Preview servers
    // may add Vary: Origin, unlike the cache's same-origin installation request.
    event.respondWith(caches.open(CACHE).then(async (cache) => (await cache.match(event.request, { ignoreVary: true })) || fetch(event.request)));
  }
});
`);
console.log(`Offline shell: ${files.length} static files, version ${version}.`);
