import { element, button } from './dom';
import type { ImportedArtifact } from './model';
import type { Artifact } from './vendor/contract';

type Asset = Artifact['diagrams'][number];
type View = { frame: HTMLElement; image: HTMLImageElement; assets: Asset[] };
const PIXELS_PER_MM = 96 / 25.4;

function fitted(assets: Asset[], width: number, height: number): Asset {
  const scale = (asset: Asset): number => Math.min(width / asset.width, height / asset.height);
  return assets.reduce((best, asset) => scale(asset) > scale(best) ? asset : best);
}

export class Diagrams {
  readonly dialog = element('dialog', '', 'diagram-dialog');
  private readonly title = element('h2');
  private readonly stage = element('div', '', 'diagram-stage');
  private readonly image = element('img', '', 'dialog-image');
  private readonly views: View[] = [];
  private readonly urls = new Map<string, string>();
  private active: Asset[] | undefined;
  private scroll: { x: number; y: number } | undefined;
  private readonly resize = (): void => this.fit();
  private readonly observer = new ResizeObserver(this.resize);

  constructor(private readonly artifact: ImportedArtifact) {
    this.title.id = 'diagram-title'; this.dialog.setAttribute('aria-labelledby', this.title.id);
    const bar = element('div', '', 'dialog-controls');
    bar.append(this.title, button('Close diagram', () => this.dialog.close()));
    this.stage.append(this.image); this.dialog.append(bar, this.stage);
    this.dialog.addEventListener('click', (event) => { if (event.target === this.dialog) this.dialog.close(); });
    this.dialog.addEventListener('close', () => this.restoreScroll());
    this.observer.observe(this.stage); window.addEventListener('resize', this.resize);
  }

  figure(chapter: string, id: string): HTMLElement {
    const assets = this.artifact.manifest.diagrams.filter((asset) => asset.chapter === chapter && asset.diagram === id);
    const graph = this.artifact.manifest.content.chapters.find((item) => item.id === chapter)!.diagrams.find((item) => item.id === id)!;
    const figure = element('figure', '', 'diagram-figure');
    const image = element('img', '', 'screen-diagram'); image.alt = graph.title;
    const trigger = button('', () => {
      this.active = assets; this.title.textContent = graph.title; this.image.alt = graph.title;
      this.scroll = { x: window.scrollX, y: window.scrollY };
      document.documentElement.style.setProperty('--diagram-scroll-top', `${-this.scroll.y}px`);
      document.documentElement.style.setProperty('--diagram-scroll-left', `${-this.scroll.x}px`);
      document.documentElement.dataset.diagramOpen = 'true';
      this.dialog.showModal(); this.fit();
    }, `Expand diagram: ${graph.title}`);
    trigger.className = 'diagram-trigger'; trigger.append(image);
    const paper = element('img', '', 'print-diagram'); paper.alt = graph.title; paper.setAttribute('aria-hidden', 'true');
    this.show(paper, fitted(assets, 178 * PIXELS_PER_MM, 220 * PIXELS_PER_MM));
    figure.append(trigger, paper, element('figcaption', graph.title));
    this.views.push({ frame: trigger, image, assets }); this.observer.observe(trigger);
    return figure;
  }

  private show(image: HTMLImageElement, asset: Asset): void {
    if (!this.urls.has(asset.file)) this.urls.set(asset.file,
      URL.createObjectURL(new Blob([this.artifact.assets.get(asset.file)!], { type: 'image/svg+xml' })));
    const url = this.urls.get(asset.file)!;
    if (image.src !== url) { image.src = url; image.width = asset.width; image.height = asset.height; }
    image.dataset.layout = asset.layout;
  }

  private fit(): void {
    for (const view of this.views) if (view.frame.clientWidth) {
      this.show(view.image, fitted(view.assets, view.frame.clientWidth, window.innerHeight * .7));
    }
    if (this.dialog.open && this.active && this.stage.clientWidth && this.stage.clientHeight) {
      this.show(this.image, fitted(this.active, this.stage.clientWidth, this.stage.clientHeight));
    }
  }

  private restoreScroll(): void {
    if (!this.scroll) return;
    const { x, y } = this.scroll; this.scroll = undefined;
    delete document.documentElement.dataset.diagramOpen;
    document.documentElement.style.removeProperty('--diagram-scroll-top');
    document.documentElement.style.removeProperty('--diagram-scroll-left');
    window.scrollTo(x, y);
  }

  dispose(): void {
    this.dialog.close(); this.restoreScroll(); this.observer.disconnect(); window.removeEventListener('resize', this.resize);
    this.urls.forEach((url) => URL.revokeObjectURL(url));
  }
}
