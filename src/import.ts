import { artifactSchema, catalogSchema, relativePath } from './vendor/contract';
import type { Library } from './model';
import { validateSvg } from './svg';

const MAX_IMPORT_BYTES = 200 * 1024 * 1024;
const decoder = new TextDecoder('utf-8', { fatal: true });
const lineCount = (text: string): number => text === '' ? 0 : text.replace(/\n$/, '').split('\n').length;
export const checksum = async (data: ArrayBuffer): Promise<string> =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map((value) => value.toString(16).padStart(2, '0')).join('');

function fileIndex(files: Iterable<File>): Map<string, File> {
  const result = new Map<string, File>();
  let total = 0;
  let root: string | undefined;
  for (const file of files) {
    total += file.size;
    if (total > MAX_IMPORT_BYTES) throw new Error('Import exceeds 200 MiB. Choose a smaller artifact folder.');
    const path = file.webkitRelativePath;
    const separator = path.indexOf('/');
    if (separator < 1) throw new Error('Select the raccoon-artifacts folder, not individual files.');
    const folder = path.slice(0, separator);
    if (root && root !== folder) throw new Error('Select exactly one folder.');
    root = folder;
    const name = relativePath.parse(path.slice(separator + 1));
    if (result.has(name)) throw new Error(`Duplicate imported path: ${name}`);
    result.set(name, file);
  }
  return result;
}

export async function importFolder(input: Iterable<File>): Promise<Library> {
  // ponytail: A selected folder is bounded to 200 MiB and verified in memory;
  // move validated assets to a staging store if larger imports become necessary.
  const files = fileIndex(input);
  const read = async (path: string): Promise<ArrayBuffer> => {
    const file = files.get(path);
    if (!file) throw new Error(`Incomplete folder: missing ${path}`);
    return file.arrayBuffer();
  };
  const catalog = catalogSchema.parse(JSON.parse(decoder.decode(await read('catalog.json'))));
  const library: Library = { repository: catalog.repository.toLowerCase(), artifacts: [] };
  for (const entry of catalog.artifacts) {
    const prefix = `pr-${entry.pr}/`;
    const manifest = artifactSchema.parse(JSON.parse(decoder.decode(await read(entry.manifest))));
    if (manifest.source.repository.toLowerCase() !== library.repository || manifest.source.pr !== entry.pr) {
      throw new Error('Manifest and catalog identify different PRs.');
    }
    const assets = new Map<string, ArrayBuffer>();
    for (const file of [...manifest.files, ...manifest.diagrams]) {
      let data = assets.get(file.file);
      if (!data) {
        data = await read(prefix + file.file);
        if (await checksum(data) !== file.sha256) throw new Error(`Checksum mismatch: ${file.file}`);
        assets.set(file.file, data);
      }
      const text = decoder.decode(data);
      if ('reference' in file) {
        if (data.byteLength !== file.bytes || lineCount(text) !== file.lines || text.includes('\0')) {
          throw new Error(`Source metadata mismatch: ${file.file}`);
        }
      } else validateSvg(text);
    }
    library.artifacts.push({ manifest, assets });
  }
  return library;
}
