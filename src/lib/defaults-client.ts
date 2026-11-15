import { normalizeDefaults, type AppDefaults } from '../../shared/settings';

const DEFAULTS_KEY = 'font-desk-defaults-v1';

function readStoredDefaults(): AppDefaults | null {
  try {
    const value = localStorage.getItem(DEFAULTS_KEY);
    return value ? normalizeDefaults(JSON.parse(value)) : null;
  } catch {
    return null;
  }
}

function storeDefaults(defaults: AppDefaults): boolean {
  try {
    localStorage.setItem(DEFAULTS_KEY, JSON.stringify(defaults));
    return true;
  } catch {
    return false;
  }
}

export async function loadDefaults(signal?: AbortSignal): Promise<AppDefaults> {
  const stored = readStoredDefaults();
  if (stored) return stored;
  const response = await fetch('/api/defaults', { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('خواندن تنظیمات ذخیره‌شده ممکن نیست.');
  const defaults = normalizeDefaults(await response.json());
  storeDefaults(defaults);
  return defaults;
}

/** Called only by an explicit Save defaults action, never from a preview effect. */
export async function saveDefaults(defaults: AppDefaults): Promise<AppDefaults> {
  const normalized = normalizeDefaults(defaults);
  const savedLocally = storeDefaults(normalized);
  try {
    const response = await fetch('/api/defaults', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalized),
    });
    if (!response.ok) throw new Error('ذخیره تنظیمات انجام نشد. دوباره تلاش کنید.');
    const saved = normalizeDefaults(await response.json());
    storeDefaults(saved);
    return saved;
  } catch (error) {
    // Local browser storage is enough to restore this user's settings on refresh.
    if (savedLocally) return normalized;
    throw error;
  }
}
