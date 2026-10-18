export function element<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function button(text: string, action: () => void | Promise<void>, label = text): HTMLButtonElement {
  const node = element('button', text);
  node.type = 'button';
  node.setAttribute('aria-label', label);
  node.addEventListener('click', () => { void action(); });
  return node;
}
