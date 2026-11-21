import { createFactoryDefaults, normalizeDefaults, type AppDefaults } from '../../shared/settings';

const DEFAULTS_KEY = 'font-desk-defaults-v1';

/**
 * The built-in defaults ship in settings.json and never change at runtime. A user's
 * own defaults live only in this browser's localStorage, on top of them.
 */
export function loadDefaults(): AppDefaults {
  try {
    const value = localStorage.getItem(DEFAULTS_KEY);
    if (value) return normalizeDefaults(JSON.parse(value));
  } catch {
    /* Unreadable, invalid or blocked storage falls back to settings.json. */
  }
  return createFactoryDefaults();
}

/** Called only by an explicit Save defaults action, never from a preview effect. */
export function saveDefaults(defaults: AppDefaults): AppDefaults {
  const normalized = normalizeDefaults(structuredClone(defaults));
  try {
    // Matching settings.json means nothing is customized (a reset, then Save): keep no
    // copy, so a later change to settings.json still reaches this browser. The theme
    // is left out because the header toggle stores it on its own.
    const factory = createFactoryDefaults();
    if (JSON.stringify({ ...normalized, theme: factory.theme }) === JSON.stringify(factory)) {
      localStorage.removeItem(DEFAULTS_KEY);
    } else {
      localStorage.setItem(DEFAULTS_KEY, JSON.stringify(normalized));
    }
  } catch {
    throw new Error('ذخیره در حافظه‌ی مرورگر ممکن نشد. فضای ذخیره‌سازی مرورگر را بررسی کنید.');
  }
  return normalized;
}
