import { defaultsSchema, normalizeDefaults, type AppDefaults } from '../../shared/settings';

export async function loadDefaults(signal?: AbortSignal): Promise<AppDefaults> {
  const response = await fetch('/api/defaults', { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('خواندن تنظیمات ذخیره‌شده ممکن نیست.');
  return defaultsSchema.parse(await response.json());
}

/** Called only by an explicit Save defaults action, never from a preview effect. */
export async function saveDefaults(defaults: AppDefaults): Promise<AppDefaults> {
  const response = await fetch('/api/defaults', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(normalizeDefaults(defaults)),
  });
  if (!response.ok) throw new Error('ذخیره تنظیمات انجام نشد. دوباره تلاش کنید.');
  return defaultsSchema.parse(await response.json());
}
