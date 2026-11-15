/** Capability declarations are the single source of truth for visible controls. */
export const tabDefinitions = [
  {
    id: 'typing-test',
    title: 'تایپ خودکار',
    controls: ['fontSize', 'direction', 'alignment', 'features', 'axes'],
  },
  {
    id: 'live-typing',
    title: 'تایپ',
    controls: ['fontSize', 'direction', 'alignment', 'features', 'axes'],
  },
  {
    id: 'weights',
    title: 'آبنوس وزن',
    controls: ['fontSize', 'direction', 'features'],
  },
  {
    id: 'languages',
    title: 'زبان‌ها',
    controls: ['fontSize', 'features', 'axes'],
    singleFont: true,
  },
  {
    id: 'diacritics',
    title: 'اعراب',
    controls: ['fontSize', 'features', 'axes'],
    singleFont: true,
  },
  {
    id: 'characters',
    title: 'کاراکترها',
    controls: ['fontSize', 'showMissing', 'features', 'axes'],
    singleFont: true,
  },
  {
    id: 'connections',
    title: 'اتصالات',
    controls: ['fontSize', 'features', 'axes'],
    singleFont: true,
  },
  {
    id: 'zwnj',
    title: 'نیم‌فاصله',
    controls: ['fontSize', 'features', 'axes'],
    singleFont: true,
  },
  { id: 'glyphs', title: 'لیست گلیف‌ها', controls: [], singleFont: true },
  { id: 'metadata', title: 'متادیتا', controls: [] },
  { id: 'qa-report', title: 'گزارش QA', controls: [], singleFont: true },
] as const;

export type TabId = (typeof tabDefinitions)[number]['id'];
export type ControlId = (typeof tabDefinitions)[number]['controls'][number];
export const tabIds = tabDefinitions.map(({ id }) => id) as [TabId, ...TabId[]];

export function supportsControl(tab: TabId, control: ControlId): boolean {
  return (tabDefinitions.find(({ id }) => id === tab)!.controls as readonly ControlId[]).includes(
    control,
  );
}

/** Tabs that show exactly one font at a time; toggling a font turns the others off. */
export function isSingleFont(tab: TabId): boolean {
  const definition = tabDefinitions.find(({ id }) => id === tab)!;
  return 'singleFont' in definition && definition.singleFont;
}
