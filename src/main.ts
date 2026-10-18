import './style.css';
import { element, button } from './dom';
import { importFolder } from './import';
import { libraries, removeLibrary, saveLibrary } from './storage';
import type { Library } from './model';

const app = document.querySelector<HTMLDivElement>('#app')!;
const status = element('p', '', 'status');
status.setAttribute('role', 'status');
const catalog = element('main');
const input = element('input');
input.type = 'file'; input.multiple = true;
input.setAttribute('webkitdirectory', '');
input.setAttribute('aria-label', 'Import raccoon-artifacts folder');
input.addEventListener('change', () => { void load(); });
const header = element('header');
header.append(element('h1', 'RACCOON'), element('p', 'Understand the change. Keep the source local.'), input);
app.append(header, status, catalog);

async function load(): Promise<void> {
  if (!input.files?.length) return;
  input.disabled = true;
  status.textContent = 'Verifying complete folder…';
  let imported: Library | undefined;
  try {
    const library = await importFolder(input.files);
    await saveLibrary(library);
    imported = library;
    status.textContent = `Imported ${library.repository}. ${library.artifacts.length} PRs cached locally.`;
  } catch (error) { status.textContent = `Import failed. Previous data kept. ${error instanceof Error ? error.message : String(error)}`; }
  finally { input.disabled = false; input.value = ''; }
  if (!imported) return;
  void requestPersistence();
  try { await render(); }
  catch (error) { status.textContent = `Imported ${imported.repository}, but the catalog could not refresh: ${String(error)}`; }
}

async function requestPersistence(): Promise<void> {
  try { await navigator.storage?.persist?.(); }
  catch { /* Persistence is optional; a denied request does not undo a saved import. */ }
}

function repositoryCard(library: Library): HTMLElement {
  const card = element('section', '', 'card');
  card.append(element('h2', library.repository), button('Remove local copy', async () => {
    await removeLibrary(library.repository); await render();
  }));
  if (!library.artifacts.length) card.append(element('p', 'No active artifacts in this repository.'));
  for (const artifact of library.artifacts) {
    const manifest = artifact.manifest;
    card.append(element('h3', `#${manifest.source.pr} ${manifest.source.title}`));
    card.append(element('p', `Snapshot ${manifest.source.headSha.slice(0, 10)} · ${manifest.content.threads.length} threads`));
    for (const thread of manifest.content.threads) card.append(element('p', `${thread.title}: ${thread.summary}`));
  }
  return card;
}

async function render(): Promise<void> {
  const data = await libraries();
  catalog.replaceChildren(...data.map(repositoryCard));
  if (!data.length) catalog.append(element('p', 'In GitSync, select the PR branch and synchronize. Then import its raccoon-artifacts folder here.'));
}
void render().catch((error: unknown) => { status.textContent = `Local storage unavailable: ${String(error)}`; });
