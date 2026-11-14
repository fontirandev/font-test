import { z } from 'zod';
import { supportsControl, tabIds, type ControlId, type TabId } from './tabs';

const tag = z.string().regex(/^[a-zA-Z0-9 ]{4}$/);
export const controlsSchema = z.strictObject({
  fontSize: z.number().min(8).max(300).default(16),
  direction: z.enum(['rtl', 'ltr']).default('rtl'),
  alignment: z.enum(['start', 'center', 'end', 'justify']).default('start'),
  features: z.record(tag, z.boolean()).default({}),
  axes: z.record(tag, z.number().finite()).default({}),
  showMissing: z.boolean().default(true),
  onlyIssues: z.boolean().default(false),
});
export type PreviewSettings = z.infer<typeof controlsSchema>;
export const sortSchema = z.enum(['manual', 'name-asc', 'name-desc', 'weight-asc', 'weight-desc']);
export type FontSort = z.infer<typeof sortSchema>;

export const tabDefaultsSchema = z.strictObject({
  activateNewFonts: z.boolean().default(true),
  controls: controlsSchema.default(() => controlsSchema.parse({})),
});
export type TabDefaults = z.infer<typeof tabDefaultsSchema>;

/** This whitelist intentionally excludes files, font IDs, text, and session selections. */
export const defaultsSchema = z.strictObject({
  version: z.literal(1),
  theme: z.enum(['system', 'light', 'dark']),
  /** Font order is shared by all tabs, so its initial sort is a single default. */
  sort: sortSchema.default('manual'),
  tabs: z.record(z.enum(tabIds), tabDefaultsSchema),
});
export type AppDefaults = z.infer<typeof defaultsSchema>;

export function createFactoryDefaults(): AppDefaults {
  return {
    version: 1,
    theme: 'light',
    sort: 'manual',
    tabs: Object.fromEntries(
      tabIds.map((id) => [
        id,
        tabDefaultsSchema.parse(
          // Weight overlays need large glyphs to show stroke differences (150pt ≈ 200px).
          id === 'weights' ? { controls: controlsSchema.parse({ fontSize: 150 }) } : {},
        ),
      ]),
    ) as AppDefaults['tabs'],
  };
}

/** Do not persist controls that have no effect on a tab. */
/** Controls that were removed; stripped from stored payloads so old data still parses. */
const retiredControls = ['lineHeight', 'letterSpacing'];

/**
 * Upgrade payloads saved by older versions: drop retired controls, and lift the
 * old per-tab sort into the single shared sort (the first tab's value wins).
 */
function migrateLegacy(input: unknown): unknown {
  if (!input || typeof input !== 'object') return input;
  const root = input as { tabs?: unknown; sort?: unknown };
  if (!root.tabs || typeof root.tabs !== 'object') return input;
  let legacySort: unknown;
  for (const [id, tab] of Object.entries(root.tabs)) {
    if (!tab || typeof tab !== 'object') continue;
    const record = tab as { controls?: unknown; sort?: unknown };
    if ('sort' in record) {
      if (id === tabIds[0] || legacySort === undefined) legacySort = record.sort;
      delete record.sort;
    }
    const controls = record.controls;
    if (controls && typeof controls === 'object') {
      for (const key of retiredControls) delete (controls as Record<string, unknown>)[key];
    }
  }
  if (root.sort === undefined && legacySort !== undefined) root.sort = legacySort;
  return input;
}

export function normalizeDefaults(input: unknown): AppDefaults {
  const parsed = defaultsSchema.parse(migrateLegacy(input));
  const factory = createFactoryDefaults();
  for (const id of tabIds) {
    for (const key of Object.keys(parsed.tabs[id].controls) as ControlId[]) {
      if (!supportsControl(id, key)) {
        Object.assign(parsed.tabs[id].controls, { [key]: factory.tabs[id].controls[key] });
      }
    }
  }
  return parsed;
}

export function getTabDefaults(defaults: AppDefaults, id: TabId): TabDefaults {
  return structuredClone(defaults.tabs[id]);
}
