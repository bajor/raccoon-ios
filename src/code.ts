import { File, FileDiff, getFiletypeFromFileName, parseDiffFromFile, preloadHighlighter, type FileContents, type FileDiffMetadata } from '@pierre/diffs';
import { element } from './dom';
import { bundledLanguages } from './syntax';
import type { ImportedArtifact } from './model';
import type { Block } from './vendor/contract';

const theme = { light: 'pierre-light', dark: 'pierre-dark' } as const;
const printCSS = `@media print {
  [data-code] { contain: none; overflow: visible; }
  [data-line] { break-inside: avoid; }
  button { display: none; }
}`;
let ready: Promise<void> | undefined;
export function prepareCode(): Promise<void> {
  return ready ??= preloadHighlighter({ themes: Object.values(theme), langs: ['python'], preferredHighlighter: 'shiki-js' })
    .catch((error: unknown) => { ready = undefined; throw error; });
}

export class CodeFigures {
  private readonly files = new Map<string, FileContents>();
  private readonly diffs = new Map<string, FileDiffMetadata>();
  private readonly views: (File | FileDiff)[] = [];
  private readonly printMedia = matchMedia('print');
  private readonly refresh = (): void => {
    for (const view of this.views) {
      if (view instanceof File) view.setOptions({ ...view.options, ...this.options() });
      else view.setOptions({ ...view.options, ...this.options() });
      view.rerender();
    }
  };
  private readonly observer = new MutationObserver(this.refresh);

  constructor(private readonly artifact: ImportedArtifact) {
    this.observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    this.printMedia.addEventListener('change', this.refresh);
  }

  private get themeType(): 'dark' | 'light' {
    return !this.printMedia.matches && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  }
  private options() {
    return { theme, themeType: this.themeType, preferredHighlighter: 'shiki-js' as const,
      disableFileHeader: true, disableVirtualizationBuffers: true, unsafeCSS: printCSS,
      overflow: this.printMedia.matches ? 'wrap' as const : 'scroll' as const };
  }

  private file(id: string | null): FileContents | null {
    if (id === null) return null;
    const manifest = this.artifact.manifest;
    const ref = manifest.content.references.find((ref) => ref.id === id)!;
    const asset = manifest.files.find((file) => file.reference === id)!;
    const key = JSON.stringify([ref.commit, ref.path, asset.sha256]);
    let file = this.files.get(key);
    if (!file) {
      const detected = /\.pyi?$/i.test(ref.path) ? 'python' : getFiletypeFromFileName(ref.path);
      const lang = detected === 'zsh' ? 'bash' : detected === 'yml' ? 'yaml' : detected;
      file = { name: ref.path, contents: new TextDecoder().decode(this.artifact.assets.get(asset.file)!), cacheKey: key,
        lang: lang && Object.hasOwn(bundledLanguages, lang) ? lang : 'text' };
      this.files.set(key, file);
    }
    return file;
  }

  private inputs(ids: (string | null)[], caption: HTMLElement): (FileContents | null)[] {
    const files = ids.map((id) => this.file(id));
    if (!files.some((file) => file && /\r(?!\n)/u.test(file.contents))) return files;
    caption.append(element('small', ' · Control-escaped source: each LF-delimited line uses JSON escapes without enclosing quotes.'));
    // Pierre treats lone CR as a newline; reversible escaping preserves Git's LF line numbers.
    return files.map((file) => file && ({ ...file, lang: 'text', cacheKey: JSON.stringify([file.cacheKey, 'escaped']),
      contents: file.contents.split('\n').map((line) => JSON.stringify(line).slice(1, -1)).join('\n') }));
  }

  figure(block: Extract<Block, { kind: 'code' | 'diff' }>): HTMLElement {
    const figure = element('figure', '', block.kind === 'diff' ? 'code-diff' : 'code-excerpt');
    if (block.kind === 'code') {
      const ref = this.artifact.manifest.content.references.find((ref) => ref.id === block.reference)!;
      const label = `${ref.path}:${ref.startLine}-${ref.endLine} · ${ref.commit.slice(0, 12)}`;
      const caption = element('figcaption', label);
      figure.setAttribute('aria-label', label); figure.append(caption);
      const [file] = this.inputs([block.reference], caption);
      const view = new File(this.options()); this.views.push(view);
      view.render({ file: file!, containerWrapper: this.viewport(figure),
        renderRange: { startingLine: ref.startLine - 1, totalLines: ref.endLine - ref.startLine + 1, bufferBefore: 0, bufferAfter: 0 } });
    } else {
      const label = `${this.label(block.before)} → ${this.label(block.after)}`;
      const caption = element('figcaption', '', 'comparison-labels');
      caption.append(element('span', `Before: ${this.label(block.before)}`), element('span', `After: ${this.label(block.after)}`));
      figure.setAttribute('aria-label', label); figure.append(caption);
      const [oldFile, newFile] = this.inputs([block.before, block.after], caption);
      const key = JSON.stringify([oldFile?.cacheKey, newFile?.cacheKey]);
      let diff = this.diffs.get(key);
      if (!diff) { diff = parseDiffFromFile(oldFile!, newFile!, { context: 4 }); this.diffs.set(key, diff); }
      const view = new FileDiff({ ...this.options(), diffStyle: 'split', lineDiffType: 'word-alt', hunkSeparators: 'line-info-basic' });
      this.views.push(view); view.render({ fileDiff: diff, containerWrapper: this.viewport(figure, true) });
    }
    return figure;
  }

  private viewport(figure: HTMLElement, comparison = false): HTMLElement {
    const viewport = element('div', '', 'code-viewport');
    if (comparison) {
      viewport.setAttribute('role', 'region'); viewport.setAttribute('aria-label', 'Side-by-side code comparison'); viewport.tabIndex = 0;
    }
    figure.append(viewport); return viewport;
  }

  private label(id: string | null): string {
    if (id === null) return 'File absent';
    const ref = this.artifact.manifest.content.references.find((ref) => ref.id === id)!;
    return `${ref.path} · ${ref.commit.slice(0, 12)}${ref.startLine === 0 ? ' (empty)' : ''}`;
  }

  dispose(): void {
    this.observer.disconnect(); this.printMedia.removeEventListener('change', this.refresh);
    for (const view of this.views) view.cleanUp();
  }
}
