export interface Settings { theme: 'dark' | 'light'; fontSize: number }
const defaults: Settings = { theme: 'light', fontSize: 20 };

export function loadSettings(): Settings {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('raccoon-settings') ?? 'null');
    if (value === null || typeof value !== 'object') return { ...defaults };
    const input = value as Partial<Settings>;
    return { theme: input.theme === 'dark' ? 'dark' : 'light',
      fontSize: typeof input.fontSize === 'number' && Number.isFinite(input.fontSize) ? Math.max(16, Math.min(28, input.fontSize)) : defaults.fontSize };
  } catch { return { ...defaults }; }
}

export function applySettings(settings: Settings): void {
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.style.setProperty('--text-size', `${settings.fontSize}px`);
  try { localStorage.setItem('raccoon-settings', JSON.stringify(settings)); }
  catch { /* Reading remains available when browser preference storage is denied. */ }
}
