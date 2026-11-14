/** Capability declarations are the single source of truth for visible controls. */
export const tabDefinitions = [
  {
    id: 'typing-test',
    title: 'تایپ خودکار',
    controls: ['fontSize', 'direction', 'alignment', 'features', 'axes'],
  },
  {
    id: 'live-typing',
    title: 'تست تایپ',
    controls: ['fontSize', 'direction', 'alignment', 'features', 'axes'],
  },
  {
    id: 'weights',
    title: 'آبنوس وزن',
    controls: ['fontSize', 'direction', 'features'],
  },
  { id: 'languages', title: 'زبان‌ها', controls: ['fontSize', 'features', 'axes'] },
  {
    id: 'characters',
    title: 'کارکترها و زبان‌ها',
    controls: ['fontSize', 'showMissing', 'features', 'axes'],
  },
  { id: 'connections', title: 'اتصالات', controls: ['fontSize', 'features', 'axes'] },
  { id: 'zwnj', title: 'نیم‌فاصله', controls: ['fontSize', 'features', 'axes'] },
  {
    id: 'diacritics',
    title: 'اعراب و علائم',
    controls: ['fontSize', 'features', 'axes'],
  },
  { id: 'glyphs', title: 'لیست گلیف‌ها', controls: ['fontSize'] },
  { id: 'metadata', title: 'متادیتا', controls: [] },
  { id: 'qa-report', title: 'گزارش QA', controls: ['onlyIssues'] },
] as const;

export type TabId = (typeof tabDefinitions)[number]['id'];
export type ControlId = (typeof tabDefinitions)[number]['controls'][number];
export const tabIds = tabDefinitions.map(({ id }) => id) as [TabId, ...TabId[]];

export function supportsControl(tab: TabId, control: ControlId): boolean {
  return (tabDefinitions.find(({ id }) => id === tab)!.controls as readonly ControlId[]).includes(
    control,
  );
}
