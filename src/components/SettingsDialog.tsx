import { useState, type ReactNode } from 'react';
import type { AppDefaults } from '../../shared/settings';
import { tabDefinitions, type TabId } from '../../shared/tabs';
import {
  TEXT_MAX,
  WEIGHTS_TEXT_MAX,
  createFactoryTexts,
  languageSheets,
  toSingleLine,
  type DefaultTexts,
} from '../../shared/texts';
import { saveDefaults } from '../lib/defaults-client';
import { Button, Modal } from './ui';

const tabTitle = (id: TabId) => tabDefinitions.find((tab) => tab.id === id)!.title;

function Section({ tab, hint, children }: { tab: TabId; hint?: string; children: ReactNode }) {
  return (
    <section className="settings-section">
      <h3>{tabTitle(tab)}</h3>
      {hint && <p className="settings-hint">{hint}</p>}
      {children}
    </section>
  );
}

/** Default sample content of the text tabs, saved for every later session. */
export function SettingsDialog({
  defaults,
  onSaved,
  onClose,
}: {
  defaults: AppDefaults;
  onSaved: (defaults: AppDefaults) => void;
  onClose: () => void;
}) {
  const [texts, setTexts] = useState<DefaultTexts>(() => structuredClone(defaults.texts));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (patch: Partial<DefaultTexts>) => setTexts((value) => ({ ...value, ...patch }));
  async function save() {
    setSaving(true);
    setError('');
    try {
      onSaved(await saveDefaults({ ...defaults, texts }));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ذخیره انجام نشد.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title="متن‌های پیش‌فرض"
      className="modal-settings"
      bodyClassName="modal-settings-body"
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      <div className="settings-scroll">
        <fieldset disabled={saving} className="settings-texts">
          <Section tab="typing-test">
            <input
              type="text"
              aria-label={`متن ${tabTitle('typing-test')}`}
              className="text-input"
              maxLength={TEXT_MAX}
              value={texts.typingTest}
              onChange={(e) => set({ typingTest: toSingleLine(e.target.value) })}
            />
          </Section>
          <Section tab="paragraph">
            <textarea
              aria-label={`متن ${tabTitle('paragraph')}`}
              className="text-input"
              maxLength={TEXT_MAX}
              dir="rtl"
              value={texts.paragraph}
              onChange={(e) => set({ paragraph: e.target.value })}
            />
          </Section>
          <Section tab="weights" hint="متن کوتاهی که وزن‌های فونت روی هم نمایش می‌دهند.">
            <input
              type="text"
              aria-label={`متن ${tabTitle('weights')}`}
              className="text-input"
              maxLength={WEIGHTS_TEXT_MAX}
              value={texts.weights}
              onChange={(e) => set({ weights: toSingleLine(e.target.value) })}
            />
          </Section>
          <Section tab="languages">
            {languageSheets.map((sheet) => (
              <label className="field" key={sheet.id}>
                {sheet.title}
                <textarea
                  className="text-input"
                  maxLength={TEXT_MAX}
                  lang={sheet.lang}
                  dir="rtl"
                  value={texts.languages[sheet.id]}
                  onChange={(e) =>
                    set({ languages: { ...texts.languages, [sheet.id]: e.target.value } })
                  }
                />
              </label>
            ))}
          </Section>
          <Section
            tab="characters"
            hint="کاراکترها را با فاصله جدا کنید؛ چند حرف بدون فاصله (مثل الله) یک خانه می‌شوند."
          >
            <textarea
              aria-label={`متن ${tabTitle('characters')}`}
              className="text-input"
              maxLength={TEXT_MAX}
              dir="rtl"
              value={texts.characters}
              onChange={(e) => set({ characters: e.target.value })}
            />
          </Section>
          <Section tab="hard-words" hint="هر خط یک کلمه یا عبارت.">
            <textarea
              aria-label={`متن ${tabTitle('hard-words')}`}
              className="text-input"
              maxLength={TEXT_MAX}
              dir="rtl"
              value={texts.hardWords}
              onChange={(e) => set({ hardWords: e.target.value })}
            />
          </Section>
        </fieldset>
      </div>
      {error && (
        <p role="alert" className="px-5 pb-3 text-[var(--danger)]">
          {error}
        </p>
      )}
      <div className="settings-footer">
        <Button disabled={saving} onClick={() => setTexts(createFactoryTexts())}>
          بازگردانی متن‌های اصلی
        </Button>
        <span className="flex-1" />
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
          {saving ? 'در حال ذخیره…' : 'ذخیره'}
        </Button>
      </div>
    </Modal>
  );
}
