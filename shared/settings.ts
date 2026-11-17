import { z } from 'zod';
import { supportsControl, tabIds, type ControlId, type TabId } from './tabs';
import { createFactoryTexts, textsSchema } from './texts';

const tag = z.string().regex(/^[a-zA-Z0-9 ]{4}$/);
export const controlsSchema = z.strictObject({
  /** solid: filled glyphs; outline: ink border over a 50% ink fill. */
  display: z.enum(['solid', 'outline']).default('solid'),
  fontSize: z.number().min(8).max(300).default(48),
  direction: z.enum(['rtl', 'ltr']).default('rtl'),
  alignment: z.enum(['start', 'center', 'end', 'justify']).default('start'),
  features: z.record(tag, z.boolean()).default({}),
  axes: z.record(tag, z.number().finite()).default({}),
  showMissing: z.boolean().default(true),
});
export type PreviewSettings = z.infer<typeof controlsSchema>;
export const sortSchema = z.enum(['manual', 'name-asc', 'name-desc', 'weight-asc', 'weight-desc']);
export type FontSort = z.infer<typeof sortSchema>;

export const tabDefaultsSchema = z.strictObject({
  activateNewFonts: z.boolean().default(true),
  controls: controlsSchema.default(() => controlsSchema.parse({})),
});
export type TabDefaults = z.infer<typeof tabDefaultsSchema>;

/** This whitelist intentionally excludes files, font IDs, typed text, and session selections. */
export const defaultsSchema = z.strictObject({
  version: z.literal(1),
  theme: z.enum(['system', 'light', 'dark']),
  /** Font order is shared by all tabs, so its initial sort is a single default. */
  sort: sortSchema.default('manual'),
  tabs: z.record(z.enum(tabIds), tabDefaultsSchema),
  /** Default sample content of the text tabs; older payloads get the built-in texts. */
  texts: textsSchema.default(createFactoryTexts),
});
export type AppDefaults = z.infer<typeof defaultsSchema>;

export function createFactoryDefaults(): AppDefaults {
  const fixedReferenceTabs = new Set(['diacritics', 'characters', 'connections', 'zwnj']);
  return {
    version: 1,
    theme: 'light',
    sort: 'manual',
    tabs: Object.fromEntries(
      // Font size is shared by every tab, so no tab gets its own size.
      tabIds.map((id) => [
        id,
        tabDefaultsSchema.parse(fixedReferenceTabs.has(id) ? { controls: { fontSize: 32 } } : {}),
      ]),
    ) as AppDefaults['tabs'],
    texts: createFactoryTexts(),
  };
}

/** Do not persist controls that have no effect on a tab. */
/** Controls that were removed; stripped from stored payloads so old data still parses. */
const retiredControls = ['lineHeight', 'letterSpacing', 'onlyIssues'];

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
  // Tabs added after the payload was saved start from their defaults.
  const tabs = root.tabs as Record<string, unknown>;
  for (const id of tabIds) if (!(id in tabs)) tabs[id] = {};
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
