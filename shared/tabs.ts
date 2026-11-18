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
    controls: ['fontSize', 'direction', 'features', 'axes'],
  },
  {
    id: 'languages',
    title: 'زبان‌ها',
    controls: ['display', 'fontSize', 'features', 'axes'],
    singleFont: true,
  },
  // Reference sheets deliberately use a consistent 32pt, solid rendering; only the
  // variable axes (shared by every tab) can be changed there.
  { id: 'diacritics', title: 'اعراب', controls: ['axes'], singleFont: true },
  { id: 'characters', title: 'کاراکترها', controls: ['axes'], singleFont: true },
  { id: 'connections', title: 'اتصالات', controls: ['axes'], singleFont: true },
  { id: 'zwnj', title: 'نیم‌فاصله', controls: ['axes'], singleFont: true },
  // Glyph outlines are drawn from the font file at the shared axis values.
  { id: 'glyphs', title: 'لیست گلیف‌ها', controls: ['axes'], singleFont: true },
  // Metadata and the QA report read the font file itself, so axis values have
  // nothing to change there; they keep no settings section.
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
