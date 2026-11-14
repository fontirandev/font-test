import {
  getTabDefaults,
  type AppDefaults,
  type FontSort,
  type PreviewSettings,
} from '../../shared/settings';
import { supportsControl, tabIds, type TabId } from '../../shared/tabs';

export interface FontIdentity {
  id: string;
  name: string;
  weight: number;
  /** Weight used for ordering; inferred from style names when OS/2 is unreliable. */
  sortWeight?: number;
}
export interface TabSession {
  order: string[];
  active: Record<string, boolean>;
  sort: FontSort;
  controls: PreviewSettings;
  text: string;
  typing: { position: number; speed: number };
}
export interface Workspace {
  currentTab: TabId;
  tabs: Record<TabId, TabSession>;
}
export const sampleText =
  'به تماشای جهان بنشین؛ هر حرف، پنجره‌ای به دنیایی تازه است.\nطراحی حروف فارسی، پیوندی میان خوانایی و زیبایی است.';

/** Short sample for overlaying weights; the old tester used the same word. */
export const weightsSampleText = 'آبنوس وزن';
export const WEIGHTS_TEXT_MAX = 32;

export function defaultText(id: TabId): string {
  return id === 'weights' ? weightsSampleText : sampleText;
}

export function createWorkspace(defaults: AppDefaults): Workspace {
  return {
    currentTab: 'typing-test',
    tabs: Object.fromEntries(
      tabIds.map((id) => {
        const tab = getTabDefaults(defaults, id);
        return [
          id,
          {
            order: [] as string[],
            active: {} as Record<string, boolean>,
            sort: tab.sort,
            controls: tab.controls,
            text: defaultText(id),
            typing: { position: 0, speed: 3 },
          },
        ];
      }),
    ) as Workspace['tabs'],
  };
}

export type WorkspaceAction =
  | { type: 'select-tab'; tab: TabId }
  | { type: 'add-fonts'; fonts: FontIdentity[]; defaults: AppDefaults }
  | { type: 'remove-font'; id: string }
  | { type: 'toggle-font'; tab: TabId; id: string }
  | { type: 'set-sort'; tab: TabId; sort: FontSort }
  | { type: 'move-font'; tab: TabId; id: string; before: string; visibleOrder?: string[] }
  | { type: 'set-controls'; tab: TabId; patch: Partial<PreviewSettings> }
  | { type: 'set-text'; tab: TabId; text: string }
  | { type: 'set-typing'; tab: TabId; patch: Partial<TabSession['typing']> }
  | { type: 'reset-tab'; tab: TabId; defaults: AppDefaults };

export function workspaceReducer(state: Workspace, action: WorkspaceAction): Workspace {
  if (action.type === 'select-tab') return { ...state, currentTab: action.tab };
  if (action.type === 'add-fonts' || action.type === 'remove-font') {
    const tabs = { ...state.tabs };
    for (const id of tabIds) {
      const tab = state.tabs[id];
      if (action.type === 'add-fonts') {
        const additions = action.fonts.filter((font) => !tab.order.includes(font.id));
        tabs[id] = {
          ...tab,
          order: [...tab.order, ...additions.map((font) => font.id)],
          active: {
            ...tab.active,
            ...Object.fromEntries(
              additions.map((font) => [font.id, action.defaults.tabs[id].activateNewFonts]),
            ),
          },
        };
      } else {
        const active = { ...tab.active };
        delete active[action.id];
        tabs[id] = { ...tab, active, order: tab.order.filter((font) => font !== action.id) };
      }
    }
    return { ...state, tabs };
  }
  const tab = state.tabs[action.tab];
  let next: TabSession;
  switch (action.type) {
    case 'toggle-font':
      if (!tab.order.includes(action.id)) return state;
      next = { ...tab, active: { ...tab.active, [action.id]: !tab.active[action.id] } };
      break;
    case 'set-sort':
      next = { ...tab, sort: action.sort };
      break;
    case 'move-font': {
      if (
        action.id === action.before ||
        !tab.order.includes(action.id) ||
        !tab.order.includes(action.before)
      )
        return state;
      const source =
        action.visibleOrder &&
        action.visibleOrder.length === tab.order.length &&
        new Set(action.visibleOrder).size === tab.order.length &&
        action.visibleOrder.every((id) => tab.order.includes(id))
          ? action.visibleOrder
          : tab.order;
      // Dropping onto a row takes that row's slot: moving down lands after it,
      // moving up lands before it. Otherwise a one-step move down is a no-op
      // and the last slot is unreachable.
      const movingDown = source.indexOf(action.id) < source.indexOf(action.before);
      const order = source.filter((id) => id !== action.id);
      order.splice(order.indexOf(action.before) + (movingDown ? 1 : 0), 0, action.id);
      next = { ...tab, order, sort: 'manual' };
      break;
    }
    case 'set-controls': {
      const patch = Object.fromEntries(
        Object.entries(action.patch).filter(([key]) =>
          supportsControl(action.tab, key as keyof PreviewSettings),
        ),
      );
      next = { ...tab, controls: { ...tab.controls, ...patch } };
      break;
    }
    case 'set-text':
      next = { ...tab, text: action.text, typing: { ...tab.typing, position: 0 } };
      break;
    case 'set-typing':
      next = { ...tab, typing: { ...tab.typing, ...action.patch } };
      break;
    case 'reset-tab': {
      const defaults = getTabDefaults(action.defaults, action.tab);
      next = {
        ...tab,
        controls: defaults.controls,
        sort: defaults.sort,
        text: defaultText(action.tab),
      };
      break;
    }
  }
  return { ...state, tabs: { ...state.tabs, [action.tab]: next } };
}

export function orderedFonts<T extends FontIdentity>(fonts: T[], tab: TabSession): T[] {
  const byId = new Map(fonts.map((font) => [font.id, font]));
  const ordered = tab.order.flatMap((id) => {
    const font = byId.get(id);
    return font ? [font] : [];
  });
  if (tab.sort === 'manual') return ordered;
  const direction = tab.sort.endsWith('desc') ? -1 : 1;
  return ordered.sort(
    (a, b) =>
      direction *
      (tab.sort.startsWith('weight')
        ? (a.sortWeight ?? a.weight) - (b.sortWeight ?? b.weight)
        : a.name.localeCompare(b.name, 'fa')),
  );
}
