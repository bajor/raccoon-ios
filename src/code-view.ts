import { element } from './dom';

const OVERSCAN_LINES = 20;
const LINE_HEIGHT_FACTOR = 1.6;

export class CodeView {
  readonly node = element('div', '', 'source');
  private lines: string[] = [];
  private text = '';
  private range = { start: 1, end: 1 };
  private lineHeight = 22.4;
  private frame = 0;
  private readonly resize = new ResizeObserver(() => this.render());

  constructor(fontSize: number) {
    this.lineHeight = fontSize * LINE_HEIGHT_FACTOR;
    this.node.tabIndex = 0;
    this.node.setAttribute('role', 'region');
    this.node.setAttribute('aria-label', 'Complete source file');
    this.node.addEventListener('scroll', () => {
      cancelAnimationFrame(this.frame);
      this.frame = requestAnimationFrame(() => this.render());
    });
    this.resize.observe(this.node);
  }

  show(text: string, start: number, end: number, fontSize: number): void {
    if (this.text !== text || !this.lines.length) {
      this.text = text;
      this.lines = text === '' ? [] : text.replace(/\n$/, '').split('\n');
    }
    this.range = { start, end };
    this.lineHeight = fontSize * LINE_HEIGHT_FACTOR;
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      this.node.scrollTop = Math.max(0, ((start + end) / 2 - 1) * this.lineHeight - this.node.clientHeight / 2);
      this.render();
    });
  }

  private render(): void {
    const first = Math.max(0, Math.floor(this.node.scrollTop / this.lineHeight) - OVERSCAN_LINES);
    const last = Math.min(this.lines.length, Math.ceil((this.node.scrollTop + this.node.clientHeight) / this.lineHeight) + OVERSCAN_LINES);
    const top = element('div'); top.style.height = `${first * this.lineHeight}px`;
    const bottom = element('div'); bottom.style.height = `${(this.lines.length - last) * this.lineHeight}px`;
    const rows = this.lines.slice(first, last).map((line, offset) => {
      const number = first + offset + 1;
      const selected = number >= this.range.start && number <= this.range.end;
      const row = element('div', '', selected ? 'source-line highlighted' : 'source-line');
      row.dataset.line = String(number);
      row.append(element('span', String(number), 'line-number'), element('span', line.replace(/\r$/, ''), 'line-text'));
      return row;
    });
    this.node.replaceChildren(top, ...rows, bottom);
  }

  dispose(): void { cancelAnimationFrame(this.frame); this.resize.disconnect(); }
}
