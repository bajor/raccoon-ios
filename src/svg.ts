const elements = new Set(['svg', 'g', 'rect', 'path', 'line', 'polyline', 'polygon', 'circle', 'text', 'tspan', 'title', 'desc', 'defs', 'marker']);
const attributes = new Set(['xmlns', 'viewBox', 'width', 'height', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
  'd', 'points', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'font-family', 'font-size', 'font-weight',
  'text-anchor', 'dominant-baseline', 'transform', 'id', 'marker-end', 'markerWidth', 'markerHeight', 'refX', 'refY', 'orient', 'role', 'aria-label']);
const namespace = 'http://www.w3.org/2000/svg';

/** The artifact format permits static SVG only, never arbitrary web documents. */
export function validateSvg(text: string): void {
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('SVG document types are not allowed');
  const document = new DOMParser().parseFromString(text, 'image/svg+xml');
  if (document.querySelector('parsererror') || document.documentElement.localName !== 'svg') throw new Error('Invalid SVG');
  for (const element of document.querySelectorAll('*')) {
    if (element.namespaceURI !== namespace || !elements.has(element.localName)) throw new Error('SVG contains a non-static element');
    for (const attribute of element.attributes) {
      if (!attributes.has(attribute.name)) throw new Error(`Unsafe SVG attribute: ${attribute.name}`);
      if (attribute.namespaceURI && attribute.namespaceURI !== 'http://www.w3.org/2000/xmlns/') throw new Error('Unsafe SVG namespace');
      if (/url\s*\(/i.test(attribute.value) && !/^url\(#[a-zA-Z0-9_-]+\)$/.test(attribute.value)) throw new Error('External SVG resource');
    }
  }
  const instructions = document.createTreeWalker(document, NodeFilter.SHOW_PROCESSING_INSTRUCTION);
  if (instructions.nextNode()) throw new Error('SVG processing instructions are not allowed');
}
