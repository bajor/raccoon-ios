import './style.css';
import { element, button } from './dom';
import { importFolder } from './import';
import { libraries, readProgress, removeLibrary, saveLibrary } from './storage';
import type { Library } from './model';
import { Reader } from './reader';
import { applySettings, loadSettings } from './settings';

const app = document.querySelector<HTMLDivElement>('#app')!;
const status = element('p', '', 'status');
status.setAttribute('role', 'status');
const catalog = element('main');
let reader: Reader | undefined;
let viewVersion = 0;
let settings = loadSettings();
applySettings(settings);
const input = element('input');
input.type = 'file'; input.multiple = true;
input.setAttribute('webkitdirectory', '');
input.setAttribute('aria-label', 'Import raccoon-artifacts folder');
input.addEventListener('change', () => { void load(); });
const header = element('header');
header.className = 'app-header';
const preferences = element('div', '', 'toolbar');
preferences.setAttribute('aria-label', 'Display preferences');
preferences.append(button('Theme', () => updateSettings({ ...settings, theme: settings.theme === 'dark' ? 'light' : 'dark' })),
  button('A−', () => updateSettings({ ...settings, fontSize: Math.max(16, settings.fontSize - 1) }), 'Smaller text'),
  button('A+', () => updateSettings({ ...settings, fontSize: Math.min(28, settings.fontSize + 1) }), 'Larger text'));
header.append(element('h1', 'RACCOON'), input, preferences);
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
    card.append(element('h3', `#${manifest.source.pr} ${manifest.content.title}`));
    card.append(element('p', `Snapshot ${manifest.source.headSha.slice(0, 10)} · ${manifest.content.chapters.length} chapters`));
    card.append(element('p', `${manifest.source.branch} · generated ${manifest.createdAt.slice(0, 10)}`));
    card.append(button(`Open article #${manifest.source.pr}`, async () => {
      const version = ++viewVersion;
      try {
        const progress = await readProgress();
        if (version !== viewVersion) return;
        reader?.dispose();
        reader = new Reader(artifact, progress, () => { void render().catch(showError); }, showError);
        catalog.replaceChildren(reader.node);
        window.scrollTo(0, 0);
        status.textContent = `${library.repository} · pinned ${manifest.source.headSha.slice(0, 10)}`;
      } catch (error) { showError(String(error)); }
    }));
  }
  return card;
}

async function render(): Promise<void> {
  const version = ++viewVersion;
  reader?.dispose(); reader = undefined;
  const data = await libraries();
  if (version !== viewVersion) return;
  catalog.replaceChildren(...data.map(repositoryCard));
  if (!data.length) catalog.append(element('p', 'In GitSync, select the PR branch and synchronize. Then import its raccoon-artifacts folder here.'));
}
function showError(message: string): void { status.textContent = message; }
function updateSettings(value: typeof settings): void {
  settings = value; applySettings(settings);
}
void render().catch((error: unknown) => { status.textContent = `Local storage unavailable: ${String(error)}`; });
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
    status.textContent = 'Offline application caching unavailable. Imported data remains local.';
  });
}
