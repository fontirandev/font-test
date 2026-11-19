import { controlsSchema, type AppDefaults, type PreviewSettings } from '../../shared/settings';

const controlKeys = new Set(Object.keys(controlsSchema.shape));
import { isSingleFont, supportsControl, tabIds, type TabId } from '../../shared/tabs';
import { createWorkspace, type TabSession, type Workspace } from '../state/workspace';

const WORKSPACE_KEY = 'font-desk-workspace-v1';
const DATABASE_NAME = 'font-desk';
const FONT_STORE = 'fonts';

type StoredFont = {
  id: string;
  fileName: string;
  type: string;
  bytes: ArrayBuffer;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isTabId(value: unknown): value is TabId {
  return typeof value === 'string' && (tabIds as readonly string[]).includes(value);
}

function validSort(value: unknown): Workspace['sort'] {
  return ['manual', 'name-asc', 'name-desc', 'weight-asc', 'weight-desc'].includes(value as string)
    ? (value as Workspace['sort'])
    : 'manual';
}

/**
 * Stored browser data is treated as untrusted: a bad or old snapshot falls back
 * to defaults while retaining every field that is still valid.
 */
export function readStoredWorkspace(defaults: AppDefaults): Workspace {
  const fallback = createWorkspace(defaults);
  try {
    const raw = localStorage.getItem(WORKSPACE_KEY);
    if (!raw) return fallback;
    const saved: unknown = JSON.parse(raw);
    if (!isRecord(saved)) return fallback;
    const order = Array.isArray(saved.order)
      ? [...new Set(saved.order.filter((id): id is string => typeof id === 'string'))]
      : fallback.order;
    const tabs = { ...fallback.tabs };
    const savedTabs = isRecord(saved.tabs) ? saved.tabs : {};
    for (const id of tabIds) {
      const candidate = savedTabs[id];
      if (!isRecord(candidate)) {
        // A tab added since this snapshot was saved shows the loaded fonts the way
        // adding them would have: the first one on a single-font tab, otherwise all.
        if (defaults.tabs[id].activateNewFonts) {
          tabs[id] = {
            ...tabs[id],
            active: Object.fromEntries(
              order.map((fontId, index) => [fontId, !isSingleFont(id) || index === 0]),
            ),
          };
        }
        continue;
      }
      // Drop controls that no longer exist (e.g. letter spacing) so the rest still parse.
      const savedControls = isRecord(candidate.controls)
        ? Object.fromEntries(
            Object.entries(candidate.controls).filter(([key]) => controlKeys.has(key)),
          )
        : candidate.controls;
      const controlsResult = controlsSchema.partial().safeParse(savedControls);
      const controls = { ...tabs[id].controls };
      if (controlsResult.success) {
        for (const [key, value] of Object.entries(controlsResult.data)) {
          if (supportsControl(id, key as keyof PreviewSettings)) {
            Object.assign(controls, { [key]: value });
          }
        }
      }
      const active: Record<string, boolean> = isRecord(candidate.active)
        ? Object.entries(candidate.active).reduce<Record<string, boolean>>(
            (result, [fontId, enabled]) => {
              if (typeof enabled === 'boolean') result[fontId] = enabled;
              return result;
            },
            {},
          )
        : tabs[id].active;
      const typing = isRecord(candidate.typing) ? candidate.typing : {};
      tabs[id] = {
        active,
        controls,
        text: typeof candidate.text === 'string' ? candidate.text.slice(0, 50_000) : tabs[id].text,
        typing: {
          position:
            typeof typing.position === 'number' && Number.isFinite(typing.position)
              ? Math.max(0, Math.floor(typing.position))
              : tabs[id].typing.position,
          speed:
            typeof typing.speed === 'number' && Number.isFinite(typing.speed) && typing.speed > 0
              ? typing.speed
              : tabs[id].typing.speed,
        },
      } satisfies TabSession;
    }
    // Axis values are one setting for every tab: snapshots from before that rule (or
    // from before a tab supported axes) take the open tab's values everywhere.
    const currentTab = isTabId(saved.currentTab) ? saved.currentTab : fallback.currentTab;
    const axesSource = supportsControl(currentTab, 'axes') ? currentTab : tabIds[0];
    const axes = tabs[axesSource].controls.axes;
    for (const id of tabIds) {
      if (supportsControl(id, 'axes')) {
        tabs[id] = { ...tabs[id], controls: { ...tabs[id].controls, axes } };
      }
    }
    return {
      currentTab,
      order,
      sort: validSort(saved.sort),
      tabs,
    };
  } catch {
    return fallback;
  }
}

/** Workspace choices are small JSON, so localStorage gives immediate restore on reload. */
export function storeWorkspace(workspace: Workspace): void {
  try {
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
  } catch {
    /* Storage can be disabled or full; the current session remains usable. */
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(FONT_STORE))
        request.result.createObjectStore(FONT_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Font storage could not be opened'));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = operation(database.transaction(FONT_STORE, mode).objectStore(FONT_STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Font storage request failed'));
    });
  } finally {
    database.close();
  }
}

/** Binary files live in IndexedDB, which is the browser's durable local storage for blobs. */
export async function storeFontFile(id: string, file: File): Promise<void> {
  const font: StoredFont = {
    id,
    fileName: file.name,
    type: file.type,
    bytes: await file.arrayBuffer(),
  };
  await withStore('readwrite', (store) => store.put(font, id));
}

export async function readStoredFontFiles(): Promise<Array<{ id: string; file: File }>> {
  const records = await withStore<StoredFont[]>('readonly', (store) => store.getAll());
  return records
    .filter(
      (record): record is StoredFont =>
        isRecord(record) &&
        typeof record.id === 'string' &&
        typeof record.fileName === 'string' &&
        record.bytes instanceof ArrayBuffer,
    )
    .map((record) => ({
      id: record.id,
      file: new File([record.bytes], record.fileName, { type: record.type }),
    }));
}

export async function removeStoredFontFile(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id));
}
