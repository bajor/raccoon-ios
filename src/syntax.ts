import { createThemeCollection } from '@pierre/theming';

// This is the offline syntax catalog, not a highlighter or diff implementation.
export const bundledLanguages = {
  python: () => import('shiki/langs/python.mjs'),
  typescript: () => import('shiki/langs/typescript.mjs'),
  javascript: () => import('shiki/langs/javascript.mjs'),
  json: () => import('shiki/langs/json.mjs'),
  yaml: () => import('shiki/langs/yaml.mjs'),
  toml: () => import('shiki/langs/toml.mjs'),
  bash: () => import('shiki/langs/bash.mjs'),
  markdown: () => import('shiki/langs/markdown.mjs'),
  ini: () => import('shiki/langs/ini.mjs'),
  css: () => import('shiki/langs/css.mjs'),
  html: () => import('shiki/langs/html.mjs'),
};

export const themes = createThemeCollection({ themes: [
  { name: 'pierre-light', colorScheme: 'light', load: () => import('@pierre/theme/pierre-light') },
  { name: 'pierre-dark', colorScheme: 'dark', load: () => import('@pierre/theme/pierre-dark') },
] });
