import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const syntax = fileURLToPath(new URL('./src/syntax.ts', import.meta.url));
export default defineConfig({ resolve: { alias: [
  { find: /^shiki\/langs$/, replacement: syntax },
  { find: /^@pierre\/theming\/themes$/, replacement: syntax },
  // Keep the optional engine as a local binary asset, not a large base64 JS chunk.
  { find: /^shiki\/wasm$/, replacement: 'shiki/onig.wasm?init' },
] } });
