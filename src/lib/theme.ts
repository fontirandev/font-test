import type { AppDefaults } from '../../shared/settings';

export type ThemeChoice = AppDefaults['theme'];
const KEY = 'font-desk-theme';

/** The last theme picked in this browser; storage may be blocked, so failures are ignored. */
export function readStoredTheme(): ThemeChoice | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' || value === 'system' ? value : null;
  } catch {
    return null;
  }
}

export function storeTheme(theme: ThemeChoice): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* Private mode or blocked storage: the choice lasts for this session only. */
  }
}

export function resolveTheme(theme: ThemeChoice): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
