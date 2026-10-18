import type { Library } from './model';

const database = new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open('raccoon', 1);
  request.onupgradeneeded = () => {
    request.result.createObjectStore('repositories');
    request.result.createObjectStore('progress');
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
  request.onblocked = () => reject(new Error('Close other Raccoon tabs to update local storage.'));
});
const result = <T>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
const completed = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onabort = () => reject(transaction.error ?? new Error('Local storage transaction aborted.'));
  transaction.onerror = () => reject(transaction.error);
});

export async function libraries(): Promise<Library[]> {
  const transaction = (await database).transaction('repositories', 'readonly');
  return result(transaction.objectStore('repositories').getAll()) as Promise<Library[]>;
}

/** Validation finishes before this transaction, so failed imports cannot replace cached data. */
export async function saveLibrary(library: Library): Promise<void> {
  const transaction = (await database).transaction(['repositories', 'progress'], 'readwrite');
  const done = completed(transaction);
  const progress = transaction.objectStore('progress');
  const keys = await result(progress.getAllKeys());
  const generations = new Map(library.artifacts.map((artifact) => [artifact.manifest.source.pr, artifact.manifest.generation]));
  for (const key of keys) {
    const [repository, pr, generation] = JSON.parse(String(key)) as [string, number, string];
    if (repository === library.repository && generations.get(pr) !== generation) progress.delete(key);
  }
  transaction.objectStore('repositories').put(library, library.repository);
  await done;
}

export async function removeLibrary(repository: string): Promise<void> {
  await saveLibrary({ repository, artifacts: [] });
  const transaction = (await database).transaction('repositories', 'readwrite');
  const done = completed(transaction);
  transaction.objectStore('repositories').delete(repository);
  await done;
}

export async function readProgress(): Promise<Set<string>> {
  const transaction = (await database).transaction('progress', 'readonly');
  return new Set((await result(transaction.objectStore('progress').getAllKeys())).map(String));
}

export async function markRead(key: string, read: boolean): Promise<void> {
  const transaction = (await database).transaction('progress', 'readwrite');
  const done = completed(transaction);
  const store = transaction.objectStore('progress');
  if (read) store.put(true, key);
  else store.delete(key);
  await done;
}
