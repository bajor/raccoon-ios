export interface Settings { theme: 'dark' | 'light'; fontSize: number; narrative: boolean }
const defaults: Settings = { theme: 'dark', fontSize: 14, narrative: true };

export function loadSettings(): Settings {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('raccoon-settings') ?? 'null');
    if (value === null || typeof value !== 'object') return { ...defaults };
    const input = value as Partial<Settings>;
    return { theme: input.theme === 'light' ? 'light' : 'dark', narrative: input.narrative !== false,
      fontSize: typeof input.fontSize === 'number' && Number.isFinite(input.fontSize) ? Math.max(11, Math.min(22, input.fontSize)) : defaults.fontSize };
  } catch { return { ...defaults }; }
}

export function applySettings(settings: Settings): void {
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.style.setProperty('--code-size', `${settings.fontSize}px`);
  try { localStorage.setItem('raccoon-settings', JSON.stringify(settings)); }
  catch { /* Reading remains available when browser preference storage is denied. */ }
}
