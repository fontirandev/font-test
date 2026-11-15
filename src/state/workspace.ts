import {
  getTabDefaults,
  type AppDefaults,
  type FontSort,
  type PreviewSettings,
} from '../../shared/settings';
import { isSingleFont, supportsControl, tabIds, type TabId } from '../../shared/tabs';
import { sampleText, toSingleLine } from '../../shared/texts';

export interface FontIdentity {
  id: string;
  name: string;
  weight: number;
  /** Weight used for ordering; inferred from style names when OS/2 is unreliable. */
  sortWeight?: number;
}
export interface TabSession {
  active: Record<string, boolean>;
  controls: PreviewSettings;
  text: string;
  typing: { position: number; speed: number };
}
/** Font order and sort are shared by every tab; visibility stays per tab. */
export interface FontOrdering {
  order: string[];
  sort: FontSort;
}
export interface Workspace extends FontOrdering {
  currentTab: TabId;
  tabs: Record<TabId, TabSession>;
}
/** Short sample for overlaying weights; the old tester used the same word. */
export const weightsSampleText = 'آبنوس وزن';
export const WEIGHTS_TEXT_MAX = 32;

/** The typing tabs edit their text in a single-line field. */
export const singleLineTabs: readonly TabId[] = ['typing-test', 'live-typing', 'weights'];
export { toSingleLine };

/** Starting text of a tab: the saved default for the typing tabs, built-in otherwise. */
export function defaultText(id: TabId, defaults: AppDefaults): string {
  if (id === 'weights') return weightsSampleText;
  if (id === 'typing-test') return toSingleLine(defaults.texts.typingTest);
  if (id === 'live-typing') return toSingleLine(defaults.texts.liveTyping);
  return sampleText;
}

/**
 * Controls that follow the user across tabs: changing one in any tab changes it in
 * every tab that offers it. Everything else in `controls` stays per tab.
 */
export const sharedControls = ['display', 'fontSize', 'axes'] as const;
type SharedControl = (typeof sharedControls)[number];

function pickShared(controls: Partial<PreviewSettings>): Partial<PreviewSettings> {
  return Object.fromEntries(
    sharedControls.filter((key) => key in controls).map((key) => [key, controls[key]]),
  );
}

/** Apply shared control values to every tab that supports them. */
function applyShared(
  tabs: Workspace['tabs'],
  values: Partial<Pick<PreviewSettings, SharedControl>>,
): Workspace['tabs'] {
  const next = { ...tabs };
  for (const id of tabIds) {
    const patch = Object.fromEntries(
      Object.entries(values).filter(([key]) => supportsControl(id, key as SharedControl)),
    );
    if (Object.keys(patch).length)
      next[id] = { ...next[id], controls: { ...next[id].controls, ...patch } };
  }
  return next;
}

/** Shared controls start from the first tab's defaults, so all tabs agree. */
function sharedDefaults(defaults: AppDefaults) {
  return pickShared(getTabDefaults(defaults, tabIds[0]).controls);
}

export function createWorkspace(defaults: AppDefaults): Workspace {
  const shared = sharedDefaults(defaults);
  return {
    currentTab: 'typing-test',
    order: [],
    sort: defaults.sort,
    tabs: Object.fromEntries(
      tabIds.map((id) => {
        const tab = getTabDefaults(defaults, id);
        return [
          id,
          {
            active: {} as Record<string, boolean>,
            controls: {
              ...tab.controls,
              ...Object.fromEntries(
                Object.entries(shared).filter(([key]) => supportsControl(id, key as SharedControl)),
              ),
            },
            text: defaultText(id, defaults),
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
  | { type: 'set-sort'; sort: FontSort }
  | { type: 'move-font'; id: string; before: string; visibleOrder?: string[] }
  | { type: 'set-controls'; tab: TabId; patch: Partial<PreviewSettings> }
  | { type: 'set-text'; tab: TabId; text: string }
  | { type: 'set-typing'; tab: TabId; patch: Partial<TabSession['typing']> }
  | { type: 'reset-tab'; tab: TabId; defaults: AppDefaults };

export function workspaceReducer(state: Workspace, action: WorkspaceAction): Workspace {
  if (action.type === 'select-tab') return { ...state, currentTab: action.tab };
  if (action.type === 'set-sort') return { ...state, sort: action.sort };
  if (action.type === 'move-font') return moveFont(state, action);
  if (action.type === 'add-fonts' || action.type === 'remove-font') {
    const additions =
      action.type === 'add-fonts'
        ? action.fonts.filter((font) => !state.order.includes(font.id))
        : [];
    const order =
      action.type === 'add-fonts'
        ? [...state.order, ...additions.map((font) => font.id)]
        : state.order.filter((font) => font !== action.id);
    const tabs = { ...state.tabs };
    for (const id of tabIds) {
      const tab = state.tabs[id];
      if (action.type === 'add-fonts') {
        const activate = action.defaults.tabs[id].activateNewFonts;
        // Single-font tabs only pick up a new font when nothing is showing yet.
        const firstOnly = isSingleFont(id) && Object.values(tab.active).some(Boolean);
        tabs[id] = {
          ...tab,
          active: {
            ...tab.active,
            ...Object.fromEntries(
              additions.map((font, index) => [
                font.id,
                activate && (!isSingleFont(id) || (!firstOnly && index === 0)),
              ]),
            ),
          },
        };
      } else {
        const active = { ...tab.active };
        delete active[action.id];
        tabs[id] = { ...tab, active };
      }
    }
    return { ...state, order, tabs };
  }
  const tab = state.tabs[action.tab];
  let next: TabSession;
  switch (action.type) {
    case 'toggle-font':
      if (!state.order.includes(action.id)) return state;
      next = {
        ...tab,
        active: isSingleFont(action.tab)
          ? Object.fromEntries(
              Object.keys(tab.active).map((id) => [id, id === action.id && !tab.active[id]]),
            )
          : { ...tab.active, [action.id]: !tab.active[action.id] },
      };
      break;
    case 'set-controls': {
      const patch = Object.fromEntries(
        Object.entries(action.patch).filter(([key]) =>
          supportsControl(action.tab, key as keyof PreviewSettings),
        ),
      );
      next = { ...tab, controls: { ...tab.controls, ...patch } };
      return {
        ...state,
        tabs: applyShared({ ...state.tabs, [action.tab]: next }, pickShared(patch)),
      };
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
        text: defaultText(action.tab, action.defaults),
      };
      return {
        ...state,
        tabs: applyShared({ ...state.tabs, [action.tab]: next }, sharedDefaults(action.defaults)),
      };
    }
  }
  return { ...state, tabs: { ...state.tabs, [action.tab]: next } };
}

function moveFont(
  state: Workspace,
  action: Extract<WorkspaceAction, { type: 'move-font' }>,
): Workspace {
  const { order: current } = state;
  if (
    action.id === action.before ||
    !current.includes(action.id) ||
    !current.includes(action.before)
  )
    return state;
  const source =
    action.visibleOrder &&
    action.visibleOrder.length === current.length &&
    new Set(action.visibleOrder).size === current.length &&
    action.visibleOrder.every((id) => current.includes(id))
      ? action.visibleOrder
      : current;
  // Dropping onto a row takes that row's slot: moving down lands after it,
  // moving up lands before it. Otherwise a one-step move down is a no-op
  // and the last slot is unreachable.
  const movingDown = source.indexOf(action.id) < source.indexOf(action.before);
  const order = source.filter((id) => id !== action.id);
  order.splice(order.indexOf(action.before) + (movingDown ? 1 : 0), 0, action.id);
  return { ...state, order, sort: 'manual' };
}

export function orderedFonts<T extends FontIdentity>(fonts: T[], ordering: FontOrdering): T[] {
  const { order, sort } = ordering;
  const byId = new Map(fonts.map((font) => [font.id, font]));
  const ordered = order.flatMap((id) => {
    const font = byId.get(id);
    return font ? [font] : [];
  });
  if (sort === 'manual') return ordered;
  const direction = sort.endsWith('desc') ? -1 : 1;
  return ordered.sort(
    (a, b) =>
      direction *
      (sort.startsWith('weight')
        ? (a.sortWeight ?? a.weight) - (b.sortWeight ?? b.weight)
        : a.name.localeCompare(b.name, 'fa')),
  );
}
