import { element, button } from './dom';
import { CodeView } from './code-view';
import { markRead } from './storage';
import { progressKey, type ImportedArtifact } from './model';
import type { Artifact, Block } from './vendor/contract';
import type { Settings } from './settings';

type Thread = Artifact['content']['threads'][number];

export class Reader {
  readonly node = element('section', '', 'reader');
  private readonly source: CodeView;
  private readonly workspace = element('div', '', 'workspace');
  private readonly fileLabel = element('p', '', 'file-label');
  private readonly narrative = element('section', '', 'narrative');
  private readonly narrativeBody = element('div', '', 'narrative-body');
  private readonly tabs = element('div', '', 'toolbar');
  private readonly history = element('details', '', 'timeline');
  private readonly threadList = element('nav', '', 'threads');
  private readonly title = element('h2');
  private readonly urls = new Map<string, string>();
  private observer: IntersectionObserver | undefined;
  private threadIndex = 0;
  private stageIndex: number | null = null;
  private cursor = 0;
  private diagramMode = false;
  private diagramIndex = 0;
  private suppressRead = false;
  private narrativeKey: string | undefined;
  private disposed = false;
  private readonly keyboard = (event: KeyboardEvent): void => this.key(event);

  constructor(private readonly artifact: ImportedArtifact, private settings: Settings,
    private readonly progress: Set<string>, private readonly onSettings: (settings: Settings) => void,
    onClose: () => void, private readonly onError: (message: string) => void) {
    this.source = new CodeView(settings.fontSize);
    const source = artifact.manifest.source;
    const bar = element('div', '', 'toolbar');
    bar.append(button('Library', onClose), element('strong', `#${source.pr} ${source.title}`), button('Keys ?', () => this.help()));
    this.history.append(element('summary', 'History map and commit shortcuts'));
    this.narrative.setAttribute('aria-label', 'Explanation');
    this.narrativeBody.tabIndex = 0;
    this.node.append(bar, this.threadList, this.title, this.history, this.tabs, this.fileLabel, this.workspace, this.narrative);
    window.addEventListener('keydown', this.keyboard);
    this.selectStageDiagram();
    this.renderThread();
  }

  private get manifest(): Artifact { return this.artifact.manifest; }
  private get thread(): Thread { return this.manifest.content.threads[this.threadIndex]!; }
  private get blocks(): Block[] { return this.stageIndex === null ? this.thread.current : this.thread.stages[this.stageIndex]!.blocks; }
  private get orderedRefs(): Array<{ id: string; block: number; position: number }> {
    return this.blocks.flatMap((block, i) => block.refs.map((id, position) => ({ id, block: i, position })));
  }
  private get stage(): string { return this.stageIndex === null ? 'current' : this.thread.stages[this.stageIndex]!.commit; }
  private get readKey(): string {
    const source = this.manifest.source;
    return progressKey(source.repository, source.pr, this.manifest.generation, this.thread.id, this.stage);
  }

  private renderThread(): void {
    this.threadList.replaceChildren(...this.manifest.content.threads.map((thread, index) => {
      const key = progressKey(this.manifest.source.repository, this.manifest.source.pr, this.manifest.generation, thread.id, 'current');
      const choice = button(`${this.progress.has(key) ? '✓ ' : ''}${thread.title}`,
        () => this.changeThread(index - this.threadIndex), `Open thread ${thread.title}`);
      choice.setAttribute('aria-current', String(index === this.threadIndex));
      return choice;
    }));
    this.renderStage();
  }

  private renderStage(): void {
    this.observer?.disconnect();
    this.title.textContent = this.stageIndex === null ? `${this.thread.title} · Final state` : this.thread.stages[this.stageIndex]!.title;
    this.history.replaceChildren(element('summary', 'History map and commit shortcuts'),
      ...this.thread.stages.map((stage, index) => {
        const commit = this.manifest.commits.find((commit) => commit.sha === stage.commit)!;
        return button(`${commit.phase === 'before-pr' ? 'Before PR · ' : ''}${stage.commit.slice(0, 8)} ${stage.title}`, () => this.chooseStage(index));
      }), button('Final state', () => this.chooseStage(null)), element('p', this.manifest.content.historyNote));
    this.tabs.replaceChildren(button('Previous reference', () => this.moveReference(-1)), button('Next reference', () => this.moveReference(1)),
      button(this.settings.narrative ? 'Hide narrative' : 'Show narrative', () => this.toggleNarrative()),
      button(this.diagramMode ? 'Show code' : 'Show diagrams', () => { this.diagramMode = !this.diagramMode; this.renderStage(); }),
      element('span', `Reference ${this.cursor + 1}/${this.orderedRefs.length}`));
    this.renderNarrative();
    if (this.diagramMode) this.renderDiagram(); else this.showReference(this.orderedRefs[this.cursor]!.id);
  }

  private chooseStage(index: number | null): void {
    const changed = this.stageIndex !== index;
    this.stageIndex = index; this.cursor = 0;
    if (changed) this.suppressRead = false;
    this.selectStageDiagram(); this.renderStage();
  }

  private selectStageDiagram(): void {
    const revision = this.stageIndex === null ? this.manifest.source.headSha : this.thread.stages[this.stageIndex]!.commit;
    this.diagramIndex = Math.max(0, this.thread.diagrams.findIndex((diagram) => diagram.commit === revision));
  }

  private moveReference(direction: number): void {
    this.cursor = Math.max(0, Math.min(this.orderedRefs.length - 1, this.cursor + direction));
    this.diagramMode = false;
    this.renderStage();
    this.narrativeBody.querySelector(`[data-block="${this.orderedRefs[this.cursor]!.block}"]`)?.scrollIntoView({ block: 'nearest' });
  }

  private showReference(id: string): void {
    const reference = this.manifest.content.references.find((reference) => reference.id === id)!;
    const file = this.manifest.files.find((file) => file.reference === id)!;
    const text = new TextDecoder().decode(this.artifact.assets.get(file.file)!);
    this.fileLabel.textContent = `${reference.path} · ${reference.commit.slice(0, 10)} · lines ${reference.startLine}-${reference.endLine} · ${file.lines} total`;
    this.workspace.replaceChildren(this.source.node);
    this.source.show(text, reference.startLine, reference.endLine, this.settings.fontSize);
  }

  private renderNarrative(): void {
    const key = this.readKey;
    const scroll = this.narrativeKey === key ? this.narrativeBody.scrollTop : 0;
    this.narrativeKey = key;
    this.narrative.hidden = !this.settings.narrative;
    const read = this.progress.has(this.readKey);
    const bar = element('div', '', 'toolbar');
    bar.append(element('strong', read ? '✓ Read' : 'Unread'), button(read ? 'Mark unread' : 'Mark read', () => {
      this.suppressRead = true; void this.saveRead(!this.progress.has(this.readKey));
    }));
    const paragraphs = this.blocks.map((block, index) => {
      const article = element('article', '', this.orderedRefs[this.cursor]?.block === index ? 'active-block' : '');
      article.dataset.block = String(index);
      article.append(element('small', block.evidence.toUpperCase()), element('p', block.text, 'essay'));
      block.refs.forEach((id, position) => article.append(button(this.referenceLabel(id), () => {
        this.cursor = this.orderedRefs.findIndex((item) => item.block === index && item.position === position);
        this.diagramMode = false; this.renderStage();
      })));
      return article;
    });
    const end = element('p', 'End of explanation', 'end-marker');
    this.narrativeBody.replaceChildren(...paragraphs, end);
    this.narrative.replaceChildren(bar, this.narrativeBody);
    this.narrativeBody.scrollTop = scroll;
    this.observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting) && !this.suppressRead && this.settings.narrative && this.readKey === key) {
        this.observer?.disconnect(); void this.saveRead(true);
      }
    }, { root: this.narrativeBody, threshold: 1 });
    this.observer.observe(end);
  }

  private referenceLabel(id: string): string {
    const reference = this.manifest.content.references.find((reference) => reference.id === id)!;
    return `${reference.path}:${reference.startLine}-${reference.endLine}`;
  }

  private async saveRead(read: boolean): Promise<void> {
    const key = this.readKey;
    if (this.progress.has(key) === read) return;
    try {
      await markRead(key, read);
      if (read) this.progress.add(key); else this.progress.delete(key);
      if (!this.disposed && key === this.readKey) this.renderThread();
    } catch (error) { this.onError(`Could not save reading progress: ${String(error)}`); }
  }

  private renderDiagram(): void {
    const diagram = this.thread.diagrams[this.diagramIndex]!;
    const asset = this.manifest.diagrams.find((file) => file.thread === this.thread.id && file.diagram === diagram.id)!;
    let url = this.urls.get(asset.file);
    if (!url) { url = URL.createObjectURL(new Blob([this.artifact.assets.get(asset.file)!], { type: 'image/svg+xml' })); this.urls.set(asset.file, url); }
    const panel = element('div', '', 'diagram-panel');
    const choices = element('select'); choices.setAttribute('aria-label', 'Thread diagram');
    this.thread.diagrams.forEach((item, index) => { const option = element('option', item.title); option.value = String(index); choices.append(option); });
    choices.value = String(this.diagramIndex);
    choices.addEventListener('change', () => { this.diagramIndex = Number(choices.value); this.renderDiagram(); });
    const image = element('img'); image.src = url; image.alt = diagram.title;
    let zoom = 1;
    const controls = element('div', '', 'toolbar');
    controls.append(choices, button('Zoom in', () => { zoom = Math.min(4, zoom + .25); image.style.width = `${zoom * 100}%`; }),
      button('Zoom out', () => { zoom = Math.max(.5, zoom - .25); image.style.width = `${zoom * 100}%`; }));
    panel.append(controls, element('p', `Diagram at ${diagram.commit.slice(0, 10)}`), image);
    for (const node of diagram.nodes) for (const id of node.refs) panel.append(button(`${node.label} · ${this.referenceLabel(id)}`, () => {
      this.diagramMode = false; this.renderStage(); this.showReference(id);
    }));
    this.fileLabel.textContent = `${this.thread.title} · ${diagram.title}`;
    this.workspace.replaceChildren(panel);
  }

  private toggleNarrative(): void {
    this.settings = { ...this.settings, narrative: !this.settings.narrative };
    this.onSettings(this.settings);
  }

  updateSettings(settings: Settings): void { this.settings = settings; this.renderStage(); }

  private key(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey || (event.target instanceof HTMLElement &&
      (event.target.isContentEditable || event.target.closest('input,select,textarea')))) return;
    const actions: Record<string, () => void> = {
      j: () => this.moveReference(1), k: () => this.moveReference(-1),
      h: () => this.chooseStage(this.stageIndex === null ? this.thread.stages.length - 1 : Math.max(0, this.stageIndex - 1)),
      l: () => this.chooseStage(this.stageIndex === null || this.stageIndex === this.thread.stages.length - 1 ? null : this.stageIndex + 1),
      J: () => this.changeThread(1), K: () => this.changeThread(-1), g: () => this.chooseStage(null),
      n: () => this.toggleNarrative(), d: () => { this.diagramMode = !this.diagramMode; this.renderStage(); },
      t: () => { this.history.open = !this.history.open; }, '?': () => this.help(),
    };
    if (actions[event.key]) { event.preventDefault(); actions[event.key]!(); }
  }

  private changeThread(direction: number): void {
    const index = Math.max(0, Math.min(this.manifest.content.threads.length - 1, this.threadIndex + direction));
    if (index === this.threadIndex) return;
    this.threadIndex = index;
    this.stageIndex = null; this.cursor = 0; this.suppressRead = false; this.selectStageDiagram(); this.renderThread();
  }

  private help(): void {
    this.onError('Keys: j/k references · h/l stages · J/K threads · g final state · n narrative · d diagram/code · t history · ? help');
  }

  dispose(): void {
    this.disposed = true; this.observer?.disconnect(); this.source.dispose();
    window.removeEventListener('keydown', this.keyboard);
    this.urls.forEach((url) => URL.revokeObjectURL(url));
  }
}
