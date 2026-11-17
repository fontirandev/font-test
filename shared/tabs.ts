/** Capability declarations are the single source of truth for visible controls. */
export type ControlId =
  'display' | 'fontSize' | 'direction' | 'alignment' | 'features' | 'axes' | 'showMissing';

export const tabDefinitions = [
  {
    id: 'typing-test',
    title: 'تایپ خودکار',
    controls: ['display', 'fontSize', 'direction', 'alignment', 'features', 'axes'],
  },
  {
    id: 'live-typing',
    title: 'تایپ',
    controls: ['display', 'fontSize', 'direction', 'alignment', 'features', 'axes'],
  },
  {
    // A free-form textarea set in the one active font.
    id: 'paragraph',
    title: 'پاراگراف',
    controls: ['display', 'fontSize', 'direction', 'alignment', 'features', 'axes'],
    singleFont: true,
  },
  {
    id: 'weights',
    title: 'آبشار وزن',
    controls: ['fontSize', 'direction', 'features'],
  },
  {
    id: 'languages',
    title: 'زبان‌ها',
    controls: ['display', 'fontSize', 'features', 'axes'],
    singleFont: true,
  },
  // Reference sheets deliberately use a consistent 32pt, solid rendering.
  // Keeping their controls empty also removes the sidebar settings section.
  { id: 'diacritics', title: 'اعراب', controls: [], singleFont: true },
  { id: 'characters', title: 'کاراکترها', controls: [], singleFont: true },
  { id: 'connections', title: 'اتصالات', controls: [], singleFont: true },
  { id: 'zwnj', title: 'نیم‌فاصله', controls: [], singleFont: true },
  { id: 'glyphs', title: 'لیست گلیف‌ها', controls: [], singleFont: true },
  { id: 'metadata', title: 'متادیتا', controls: [] },
  { id: 'qa-report', title: 'گزارش QA', controls: [], singleFont: true },
] as const satisfies readonly {
  id: string;
  title: string;
  controls: readonly ControlId[];
  singleFont?: true;
}[];

export type TabId = (typeof tabDefinitions)[number]['id'];
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
