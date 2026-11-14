import { z } from 'zod';
import { supportsControl, tabIds, type ControlId, type TabId } from './tabs';

const tag = z.string().regex(/^[a-zA-Z0-9 ]{4}$/);
export const controlsSchema = z.strictObject({
  fontSize: z.number().min(8).max(300).default(16),
  lineHeight: z.number().min(0.8).max(4).default(1.8),
  letterSpacing: z.number().min(-10).max(30).default(0),
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
  sort: sortSchema.default('manual'),
  activateNewFonts: z.boolean().default(true),
  controls: controlsSchema.default(() => controlsSchema.parse({})),
});
export type TabDefaults = z.infer<typeof tabDefaultsSchema>;

/** This whitelist intentionally excludes files, font IDs, text, and session selections. */
export const defaultsSchema = z.strictObject({
  version: z.literal(1),
  theme: z.enum(['system', 'light', 'dark']),
  tabs: z.record(z.enum(tabIds), tabDefaultsSchema),
});
export type AppDefaults = z.infer<typeof defaultsSchema>;

export function createFactoryDefaults(): AppDefaults {
  return {
    version: 1,
    theme: 'system',
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
export function normalizeDefaults(input: unknown): AppDefaults {
  const parsed = defaultsSchema.parse(input);
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
