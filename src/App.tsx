import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { createFactoryDefaults, type AppDefaults } from '../shared/settings';
import { tabDefinitions } from '../shared/tabs';
import { loadDefaults } from './lib/defaults-client';
import { links } from './lib/links';
import { loadFont, unloadFont, type LoadedFont } from './lib/fonts';
import { defaultText, orderedFonts, workspaceReducer } from './state/workspace';
import {
  readStoredFontFiles,
  readStoredWorkspace,
  removeStoredFontFile,
  storeFontFile,
  storeWorkspace,
} from './lib/workspace-storage';
import { Button, Icon, IconButton, Modal } from './components/ui';
import { Sidebar } from './components/Sidebar';
import { TestViews } from './components/TestViews';
import { SettingsDialog } from './components/SettingsDialog';
import { readStoredTheme, resolveTheme, storeTheme } from './lib/theme';

function useTheme(theme: AppDefaults['theme']) {
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => resolveTheme(theme));
  useEffect(() => {
    storeTheme(theme);
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const value = resolveTheme(theme);
      document.documentElement.dataset.theme = value;
      setResolved(value);
    };
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [theme]);
  return resolved;
}

export function App() {
  const [defaults, setDefaults] = useState<AppDefaults | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    loadDefaults(controller.signal)
      .then(setDefaults)
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      });
    return () => controller.abort();
  }, [attempt]);
  if (!defaults)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <Icon name="logo" />
        <p role={error ? 'alert' : 'status'}>{error || 'در حال آماده‌سازی میز کار…'}</p>
        {error && (
          <>
            <Button onClick={() => setAttempt(attempt + 1)}>تلاش دوباره</Button>
            <Button onClick={() => setDefaults(createFactoryDefaults())}>
              ادامه با تنظیمات موقت
            </Button>
          </>
        )}
      </div>
    );
  return <WorkspaceApp initialDefaults={defaults} />;
}

function WorkspaceApp({ initialDefaults }: { initialDefaults: AppDefaults }) {
  const [defaults, setDefaults] = useState(initialDefaults);
  const [workspace, dispatch] = useReducer(workspaceReducer, initialDefaults, readStoredWorkspace);
  const [fonts, setFonts] = useState<LoadedFont[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [modal, setModal] = useState<'settings' | 'about' | null>(null);
  // A theme picked in this browser outlives reloads; saved defaults apply otherwise.
  const [theme, setTheme] = useState(() => readStoredTheme() ?? defaults.theme);
  const input = useRef<HTMLInputElement>(null);
  const fontRef = useRef<LoadedFont[]>([]);
  const importing = useRef(false);
  const alive = useRef(true);
  const resolvedTheme = useTheme(theme);
  const tabId = workspace.currentTab;
  const tab = workspace.tabs[tabId];
  const activeFonts = orderedFonts(fonts, workspace).filter((font) => tab.active[font.id]);
  const openPicker = useCallback(() => input.current?.click(), []);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      for (const font of fontRef.current) unloadFont(font);
    };
  }, []);
  useEffect(() => {
    storeWorkspace(workspace);
  }, [workspace]);
  useEffect(() => {
    let cancelled = false;
    async function restoreFonts() {
      try {
        const savedFonts = await readStoredFontFiles();
        const restored: LoadedFont[] = [];
        const failed: string[] = [];
        for (const { id, file } of savedFonts) {
          try {
            restored.push(await loadFont(file, id));
          } catch {
            failed.push(id);
            void removeStoredFontFile(id);
          }
        }
        if (cancelled) {
          for (const font of restored) unloadFont(font);
          return;
        }
        fontRef.current = restored;
        setFonts(restored);
        for (const id of failed) dispatch({ type: 'remove-font', id });
        if (failed.length) setMessage('برخی فونت‌های ذخیره‌شده دیگر قابل بارگذاری نبودند.');
      } catch {
        if (!cancelled) setMessage('بازیابی فونت‌های ذخیره‌شده ممکن نشد.');
      }
    }
    void restoreFonts();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o' && !modal) {
        event.preventDefault();
        if (!importing.current) openPicker();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openPicker, modal]);
  async function addFiles(files: File[]) {
    if (importing.current || files.length === 0) return;
    importing.current = true;
    setLoading(true);
    setMessage('');
    const added: LoadedFont[] = [];
    const errors: string[] = [];
    // Same file name and byte size counts as a duplicate; skip it silently.
    const seen = new Set(fontRef.current.map((font) => `${font.fileName}\0${font.size}`));
    for (const file of files) {
      const key = `${file.name}\0${file.size}`;
      if (seen.has(key)) continue;
      seen.add(key);
      try {
        const font = await loadFont(file);
        if (!alive.current) {
          unloadFont(font);
          continue;
        }
        added.push(font);
        try {
          await storeFontFile(font.id, file);
        } catch {
          errors.push(`ذخیرهٔ محلی «${file.name}» ممکن نیست.`);
        }
      } catch (error) {
        errors.push(error instanceof Error ? error.message : `خواندن ${file.name} ممکن نیست.`);
      }
    }
    if (alive.current) {
      fontRef.current = [...fontRef.current, ...added];
      setFonts(fontRef.current);
      dispatch({ type: 'add-fonts', fonts: added, defaults });
      if (errors.length) setMessage(errors.join(' • '));
      setLoading(false);
    } else for (const font of added) unloadFont(font);
    importing.current = false;
  }
  function removeFont(id: string) {
    const font = fontRef.current.find((font) => font.id === id);
    if (font) unloadFont(font);
    fontRef.current = fontRef.current.filter((font) => font.id !== id);
    setFonts(fontRef.current);
    dispatch({ type: 'remove-font', id });
    void removeStoredFontFile(id);
  }
  return (
    <>
      <div className="mobile-message">
        <Icon name="logo" />
        <h1 className="text-xl font-semibold">اندازه صفحه پشتیبانی نمی‌شود</h1>
        <p className="leading-8 text-muted">
          Font Desk برای کار با فونت روی نمایشگر بزرگ طراحی شده است. از رایانه یا صفحه‌ای با عرض
          حداقل ۷۶۸ پیکسل استفاده کنید.
        </p>
      </div>
      <div className="desktop-app">
        <input
          className="hidden"
          ref={input}
          type="file"
          accept=".ttf,.otf,.woff,.woff2"
          multiple
          aria-label="انتخاب فایل‌های فونت"
          disabled={loading}
          onChange={(event) => {
            void addFiles(Array.from(event.target.files ?? []));
            event.target.value = '';
          }}
        />
        <header className="topbar">
          <div className="brand">
            <Icon name="logo" />
            <IconButton
              icon={resolvedTheme === 'dark' ? 'sun' : 'moon'}
              label="تغییر پوسته روشن و تاریک"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            />
            <IconButton icon="gear" label="تنظیمات پیش‌فرض" onClick={() => setModal('settings')} />
          </div>
          <nav className="tab-rail" aria-label="آزمایش‌های فونت">
            <div className="tab-list" role="tablist">
              {tabDefinitions.map((definition) => {
                const selected = definition.id === tabId;
                return (
                  <button
                    key={definition.id}
                    id={`tab-${definition.id}`}
                    role="tab"
                    aria-selected={selected}
                    aria-controls="test-panel"
                    tabIndex={selected ? 0 : -1}
                    className="tab"
                    onClick={() => dispatch({ type: 'select-tab', tab: definition.id })}
                    onKeyDown={(event) => {
                      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                      event.preventDefault();
                      const index = tabDefinitions.findIndex((t) => t.id === definition.id);
                      const next =
                        event.key === 'Home'
                          ? 0
                          : event.key === 'End'
                            ? tabDefinitions.length - 1
                            : (index +
                                (event.key === 'ArrowLeft' ? 1 : -1) +
                                tabDefinitions.length) %
                              tabDefinitions.length;
                      const target = tabDefinitions[next]!;
                      dispatch({ type: 'select-tab', tab: target.id });
                      document.getElementById(`tab-${target.id}`)?.focus();
                    }}
                  >
                    {selected && <span className="tab-mark" aria-hidden="true" />}
                    {definition.title}
                  </button>
                );
              })}
            </div>
          </nav>
          <div className="flex items-center justify-center border-r border-line">
            <IconButton
              icon="info"
              label="درباره Font Desk"
              variant="ghost"
              onClick={() => setModal('about')}
            />
          </div>
        </header>
        <div className="workspace-layout">
          <Sidebar
            fonts={fonts}
            tabId={tabId}
            tab={tab}
            ordering={workspace}
            dispatch={dispatch}
            onFiles={(files) => {
              void addFiles(files);
            }}
            onRemove={removeFont}
            loading={loading}
            openFilePicker={openPicker}
          />
          <main
            className="content-area"
            id="test-panel"
            role="tabpanel"
            aria-labelledby={`tab-${tabId}`}
          >
            {message && (
              <div className="status-message flex items-center justify-between gap-4" role="alert">
                <p>{message}</p>
                <Button onClick={() => setMessage('')}>بستن</Button>
              </div>
            )}
            {fonts.length === 0 ? (
              <div className="panel empty-panel">
                <Icon name="empty-fonts" className="empty-illustration" />
                <div className="empty-message">
                  <span>یک یا چند فایل فونت</span>
                  <IconButton
                    icon="add"
                    label="افزودن فونت"
                    variant="primary"
                    disabled={loading}
                    onClick={openPicker}
                  />
                  <span>را اضافه کنید</span>
                </div>
              </div>
            ) : (
              <TestViews
                key={tabId}
                tabId={tabId}
                tab={tab}
                fonts={activeFonts}
                allFonts={fonts}
                texts={defaults.texts}
                dispatch={dispatch}
              />
            )}
          </main>
        </div>
      </div>
      {modal === 'settings' && (
        <SettingsDialog
          defaults={{ ...defaults, theme }}
          onClose={() => setModal(null)}
          onSaved={(value) => {
            // Saving a default also updates the three editable preview samples immediately.
            for (const id of ['typing-test', 'live-typing', 'weights'] as const) {
              dispatch({ type: 'set-text', tab: id, text: defaultText(id, value) });
            }
            setDefaults(value);
            setTheme(value.theme);
            setMessage('متن‌های پیش‌فرض ذخیره شدند.');
          }}
        />
      )}
      {modal === 'about' && (
        <Modal title="درباره Font Desk" onClose={() => setModal(null)}>
          <p className="leading-8">
            Font Desk ابزار تست فونتی است که برای کار روزانه‌ی تیم{' '}
            <a className="about-link" href={links.fontiran} target="_blank" rel="noreferrer">
              فونت‌ایران
            </a>{' '}
            ساخته شد و حالا به‌صورت متن‌باز در دسترس همه است.
          </p>
          <p className="about-privacy mt-4 leading-8">
            <strong>حریم خصوصی شما محفوظ است.</strong> همه‌چیز در مرورگر خودتان اجرا می‌شود و
            فونت‌هایی که باز می‌کنید هرگز به هیچ سروری ارسال نمی‌شوند. تنها استثنا تنظیمات
            پیش‌فرض است، آن هم فقط وقتی خودتان آن‌ها را ذخیره کنید.
          </p>
          <p className="mt-3 leading-8 text-muted">
            اگر ایده یا پیشنهادی برای بهتر شدنش دارید، خوشحال می‌شویم در تلگرام با ما در میان
            بگذارید.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              className="button button-secondary"
              href={links.repository}
              target="_blank"
              rel="noreferrer"
            >
              کد منبع در گیت‌هاب
            </a>
            <a
              className="button button-primary"
              href={links.telegram}
              target="_blank"
              rel="noreferrer"
            >
              پیام در تلگرام
            </a>
          </div>
        </Modal>
      )}
    </>
  );
}
