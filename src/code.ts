import { File, FileDiff, getFiletypeFromFileName, parseDiffFromFile, preloadHighlighter, type FileContents, type FileDiffMetadata } from '@pierre/diffs';
import { element } from './dom';
import { bundledLanguages } from './syntax';
import type { ImportedArtifact } from './model';
import type { Block } from './vendor/contract';

const theme = { light: 'pierre-light', dark: 'pierre-dark' } as const;
let ready: Promise<void> | undefined;
export function prepareCode(): Promise<void> {
  return ready ??= preloadHighlighter({ themes: Object.values(theme), langs: ['python'], preferredHighlighter: 'shiki-js' })
    .catch((error: unknown) => { ready = undefined; throw error; });
}

export class CodeFigures {
  private readonly files = new Map<string, FileContents>();
  private readonly diffs = new Map<string, FileDiffMetadata>();
  private readonly views: (File | FileDiff)[] = [];
  private readonly observer = new MutationObserver(() => {
    for (const view of this.views) view.setThemeType(this.themeType);
  });

  constructor(private readonly artifact: ImportedArtifact) {
    this.observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  private get themeType(): 'dark' | 'light' { return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'; }
  private options() {
    return { theme, themeType: this.themeType, preferredHighlighter: 'shiki-js' as const,
      disableFileHeader: true, disableVirtualizationBuffers: true, overflow: 'wrap' as const };
  }

  private file(id: string | null): FileContents | null {
    if (id === null) return null;
    const manifest = this.artifact.manifest;
    const ref = manifest.content.references.find((ref) => ref.id === id)!;
    const asset = manifest.files.find((file) => file.reference === id)!;
    const key = JSON.stringify([ref.commit, ref.path, asset.sha256]);
    let file = this.files.get(key);
    if (!file) {
      const lang = /\.pyi?$/i.test(ref.path) ? 'python' : getFiletypeFromFileName(ref.path);
      file = { name: ref.path, contents: new TextDecoder().decode(this.artifact.assets.get(asset.file)!), cacheKey: key,
        lang: lang && Object.hasOwn(bundledLanguages, lang) ? lang : 'text' };
      this.files.set(key, file);
    }
    return file;
  }

  figure(block: Extract<Block, { kind: 'code' | 'diff' }>): HTMLElement {
    const figure = element('figure', '', block.kind === 'diff' ? 'code-diff' : 'code-excerpt');
    if (block.kind === 'code') {
      const ref = this.artifact.manifest.content.references.find((ref) => ref.id === block.reference)!;
      const label = `${ref.path}:${ref.startLine}-${ref.endLine} · ${ref.commit.slice(0, 12)}`;
      figure.setAttribute('aria-label', label); figure.append(element('figcaption', label));
      const view = new File(this.options()); this.views.push(view);
      view.render({ file: this.file(block.reference)!, containerWrapper: figure,
        renderRange: { startingLine: ref.startLine - 1, totalLines: ref.endLine - ref.startLine + 1, bufferBefore: 0, bufferAfter: 0 } });
    } else {
      const label = `${this.label(block.before)} → ${this.label(block.after)}`;
      figure.setAttribute('aria-label', label); figure.append(element('figcaption', label));
      const oldFile = this.file(block.before); const newFile = this.file(block.after);
      const key = JSON.stringify([oldFile?.cacheKey, newFile?.cacheKey]);
      let diff = this.diffs.get(key);
      if (!diff) { diff = parseDiffFromFile(oldFile, newFile, { context: 4 }); this.diffs.set(key, diff); }
      const view = new FileDiff({ ...this.options(), diffStyle: 'split', lineDiffType: 'word-alt', hunkSeparators: 'line-info-basic' });
      this.views.push(view); view.render({ fileDiff: diff, containerWrapper: figure });
    }
    return figure;
  }

  private label(id: string | null): string {
    if (id === null) return 'File absent';
    const ref = this.artifact.manifest.content.references.find((ref) => ref.id === id)!;
    return `${ref.path} · ${ref.commit.slice(0, 12)}${ref.startLine === 0 ? ' (empty)' : ''}`;
  }

  dispose(): void { this.observer.disconnect(); for (const view of this.views) view.cleanUp(); }
}
