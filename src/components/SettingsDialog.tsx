import { useState } from 'react';
import {
  createFactoryDefaults,
  type AppDefaults,
  type FontSort,
  type PreviewSettings,
} from '../../shared/settings';
import { supportsControl, tabDefinitions, type TabId } from '../../shared/tabs';
import type { TabSession } from '../state/workspace';
import { saveDefaults } from '../lib/defaults-client';
import { Button, Modal, Slider, Toggle } from './ui';

export function SettingsDialog({
  defaults,
  currentTab,
  currentSession,
  currentSort,
  onSaved,
  onClose,
}: {
  defaults: AppDefaults;
  currentTab: TabId;
  currentSession: TabSession;
  currentSort: FontSort;
  onSaved: (defaults: AppDefaults) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => structuredClone(defaults));
  const [tabId, setTabId] = useState(currentTab);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const tab = draft.tabs[tabId];
  const patch = (changes: Partial<PreviewSettings>) =>
    setDraft((value) => ({
      ...value,
      tabs: {
        ...value.tabs,
        [tabId]: { ...value.tabs[tabId], controls: { ...value.tabs[tabId].controls, ...changes } },
      },
    }));
  async function save() {
    setSaving(true);
    setError('');
    try {
      onSaved(await saveDefaults(draft));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ذخیره انجام نشد.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title="تنظیمات پیش‌فرض"
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      <p className="mb-5 leading-7 text-muted">
        این تنظیمات برای شروع جلسه‌های بعد ذخیره می‌شوند. فایل‌ها، متن آزمایش و انتخاب یا ترتیب
        فونت‌های جلسه ذخیره نمی‌شوند.
      </p>
      <fieldset disabled={saving} className="space-y-5">
        <label className="field">
          پوسته
          <select
            value={draft.theme}
            onChange={(e) => setDraft({ ...draft, theme: e.target.value as AppDefaults['theme'] })}
          >
            <option value="system">همگام با سیستم</option>
            <option value="light">روشن</option>
            <option value="dark">تاریک</option>
          </select>
        </label>
        <label className="field">
          مرتب‌سازی اولیه فونت‌ها
          <select
            value={draft.sort}
            onChange={(e) => setDraft({ ...draft, sort: e.target.value as FontSort })}
          >
            <option value="manual">ترتیب افزودن فایل</option>
            <option value="weight-asc">وزن: سبک به سنگین</option>
            <option value="weight-desc">وزن: سنگین به سبک</option>
            <option value="name-asc">نام: صعودی</option>
            <option value="name-desc">نام: نزولی</option>
          </select>
        </label>
        <label className="field">
          پیش‌فرض تب
          <select value={tabId} onChange={(e) => setTabId(e.target.value as TabId)}>
            {tabDefinitions.map((definition) => (
              <option value={definition.id} key={definition.id}>
                {definition.title}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-5">
          <div dir="ltr">
            <Toggle
              label="Activate newly added fonts"
              checked={tab.activateNewFonts}
              onChange={(activateNewFonts) =>
                setDraft({
                  ...draft,
                  tabs: { ...draft.tabs, [tabId]: { ...tab, activateNewFonts } },
                })
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5" dir="ltr">
          {supportsControl(tabId, 'fontSize') && (
            <Slider
              label="Font size"
              value={tab.controls.fontSize}
              min={8}
              max={300}
              unit="pt"
              onChange={(fontSize) => patch({ fontSize })}
            />
          )}
          {supportsControl(tabId, 'showMissing') && (
            <Toggle
              label="Show missing characters"
              checked={tab.controls.showMissing}
              onChange={(showMissing) => patch({ showMissing })}
            />
          )}
          {supportsControl(tabId, 'onlyIssues') && (
            <Toggle
              label="Only warnings and failures"
              checked={tab.controls.onlyIssues}
              onChange={(onlyIssues) => patch({ onlyIssues })}
            />
          )}
        </div>
        {supportsControl(tabId, 'direction') && (
          <label className="field">
            جهت متن
            <select
              value={tab.controls.direction}
              onChange={(e) => patch({ direction: e.target.value as PreviewSettings['direction'] })}
            >
              <option value="rtl">راست به چپ</option>
              <option value="ltr">چپ به راست</option>
            </select>
          </label>
        )}
        {supportsControl(tabId, 'alignment') && (
          <label className="field">
            تراز متن
            <select
              value={tab.controls.alignment}
              onChange={(e) => patch({ alignment: e.target.value as PreviewSettings['alignment'] })}
            >
              <option value="start">ابتدا</option>
              <option value="center">وسط</option>
              <option value="end">انتها</option>
              <option value="justify">تراز دوطرفه</option>
            </select>
          </label>
        )}
        <div className="flex gap-3">
          <Button
            disabled={tabId !== currentTab}
            onClick={() =>
              setDraft((value) => ({
                ...value,
                sort: currentSort,
                tabs: {
                  ...value.tabs,
                  [tabId]: {
                    ...value.tabs[tabId],
                    controls: structuredClone(currentSession.controls),
                  },
                },
              }))
            }
          >
            استفاده از تنظیمات تب باز
          </Button>
          <Button onClick={() => setDraft(createFactoryDefaults())}>
            بازگردانی پیش‌فرض‌های برنامه
          </Button>
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="mt-4 text-[var(--danger)]">
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">
        <Button disabled={saving} onClick={onClose}>
          انصراف
        </Button>
        <Button
          disabled={saving}
          variant="primary"
          onClick={() => {
            void save();
          }}
        >
          {saving ? 'در حال ذخیره…' : 'ذخیره پیش‌فرض‌ها'}
        </Button>
      </div>
    </Modal>
  );
}
