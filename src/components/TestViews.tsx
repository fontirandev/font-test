import { useEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch } from 'react';
import { isSingleFont, type TabId } from '../../shared/tabs';
import { featureCSS, variationCSS, type LoadedFont } from '../lib/fonts';
import { diacriticGroups, insertKeyGroups, persianAlphabet } from '../lib/samples';
import {
  languageSheets,
  parseCharacters,
  parseZwnjWords,
  type DefaultTexts,
} from '../../shared/texts';
import { QaReport, QaToolbar, type QaFilter } from './QaReport';
import {
  WEIGHTS_TEXT_MAX,
  toSingleLine,
  type TabSession,
  type WorkspaceAction,
} from '../state/workspace';
import { Button, Icon, IconButton } from './ui';
import { Glyphs, Metadata } from './FontInspection';
import { OnScreenKeyboard } from './OnScreenKeyboard';
import { keyboardLayouts, type KeyboardId } from '../lib/keyboards';

function previewStyle(font: LoadedFont, tab: TabSession): CSSProperties {
  return {
    fontFamily: `"${font.family}"`,
    fontWeight: font.weight,
    fontSize: `${tab.controls.fontSize}pt`,
    direction: tab.controls.direction,
    textAlign: tab.controls.alignment,
    fontFeatureSettings: featureCSS(tab.controls.features, font.features),
    fontVariationSettings: variationCSS(tab.controls.axes, font.axes),
    fontSynthesis: 'none',
    ...(tab.controls.display === 'outline' && {
      color: 'color-mix(in srgb, var(--ink) 50%, transparent)',
      WebkitTextStroke: '1px var(--ink)',
    }),
  };
}

/** Width that fits four joining forms of one letter at the tab's font size (pt → px). */
/**
 * Joining forms of every letter in equal cells. The column width is measured from the
 * widest row of forms, so cells grow with the font size and never clip their text.
 */
function ConnectionsGrid({ style, letter }: { style: CSSProperties; letter: string }) {
  const grid = useRef<HTMLDivElement>(null);
  const [cellWidth, setCellWidth] = useState(0);
  useEffect(() => {
    const element = grid.current;
    if (!element) return;
    const measure = () => {
      const widest = Math.max(
        0,
        ...Array.from(element.querySelectorAll<HTMLElement>('.joining-forms'), (forms) =>
          Math.ceil(forms.getBoundingClientRect().width),
        ),
      );
      // Add the cell's own horizontal padding and border.
      const cell = element.querySelector<HTMLElement>('.joining-cell');
      const box = cell ? cell.offsetWidth - cell.clientWidth : 0;
      const css = cell ? getComputedStyle(cell) : null;
      const padding = css ? parseFloat(css.paddingLeft) + parseFloat(css.paddingRight) : 0;
      setCellWidth(Math.ceil(widest + padding + box));
    };
    measure();
    // Re-measure when the forms change size: font size, features or a late font load.
    const observer = new ResizeObserver(measure);
    element.querySelectorAll('.joining-forms').forEach((forms) => observer.observe(forms));
    return () => observer.disconnect();
  }, [style, letter]);
  return (
    <div
      ref={grid}
      className="glyph-grid"
      style={
        cellWidth
          ? { gridTemplateColumns: `repeat(auto-fill, minmax(${cellWidth}px, 1fr))` }
          : undefined
      }
    >
      {persianAlphabet.map((char) => (
        <div className="glyph-cell joining-cell" key={char}>
          <span className="joining-forms" style={style}>
            {[char, `${char}${letter}`, `${letter}${char}${letter}`, `${letter}${char}`].map(
              (form) => (
                <span key={form}>{form}</span>
              ),
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Fill share per layer: 50% for one or two fonts, otherwise split evenly. */
/** True when the font has no glyph for some character of `text`; null if it can't tell. */
function missingGlyph(font: LoadedFont, text: string): boolean | null {
  if (!font.parsed) return null;
  return Array.from(text).some((ch) => font.parsed!.charToGlyphIndex(ch) === 0);
}

/** Diacritics test page: a grid per mark, stacked marks, then sample sentences. */
function DiacriticsSheet({
  font,
  style,
  lang,
}: {
  font: LoadedFont;
  style: CSSProperties;
  lang: 'fa' | 'ar';
}) {
  const group = diacriticGroups.find(({ id }) => id === lang)!;
  return (
    <div className="diacritics-sections" lang={lang}>
      {!font.parsed && <p className="text-muted">{font.inspectionWarning}</p>}
      {group.sections.map((section) => (
        <section key={section.id} className="diacritics-section">
          <h3 className="diacritics-section-title">{section.title}</h3>
          {section.layout === 'grid' ? (
            <div className="char-grid" style={{ fontSize: style.fontSize }}>
              {section.items.map(({ text, label }) => {
                const missing = missingGlyph(font, text);
                return (
                  <div
                    className={`char-cell ${missing ? 'char-cell-missing' : ''}`}
                    key={text}
                    title={`${missing ? 'پشتیبانی نمی‌شود — ' : ''}${label} — ${codePoints(text)}`}
                  >
                    <span className="char-glyph" style={style}>
                      {text}
                    </span>
                    {/* Same text in the UI font, to compare mark placement against. */}
                    <span className="char-label">{text}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="diacritics-blocks">
              {section.items.map(({ text, label }) => (
                <article
                  key={text}
                  className={`diacritics-block ${missingGlyph(font, text) ? 'diacritics-block-missing' : ''}`}
                >
                  <header className="char-label">{label}</header>
                  <p className="diacritics-block-text" style={style}>
                    {text}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function weightsLayerAlpha(count: number): number {
  return count <= 2 ? 0.5 : 1 / count;
}

/**
 * Every active font is stacked on the same spot: a translucent fill shows where
 * weights overlap and a solid hairline outline shows each font's contour.
 * Layer order follows the sidebar order (last font on top).
 */
function WeightsOverlay({
  tab,
  fonts,
  dispatch,
}: {
  tab: TabSession;
  fonts: LoadedFont[];
  dispatch: Dispatch<WorkspaceAction>;
}) {
  const alpha = weightsLayerAlpha(fonts.length);
  const percent = Math.round(alpha * 100);
  // Mix with the ink colour instead of using CSS opacity, so the outline stays fully opaque.
  const fill = `color-mix(in srgb, var(--ink) ${percent}%, transparent)`;
  const px = tab.controls.fontSize * (4 / 3);
  const text = tab.text || 'پیش‌نمایش…';
  return (
    <div className="weights-tab">
      <div className="text-field panel">
        <div className="text-field-head">
          <label htmlFor="weights-input">متن کوتاه برای مقایسه وزن‌ها</label>
          <span className="weights-count" dir="ltr">
            {Array.from(tab.text).length}/{WEIGHTS_TEXT_MAX}
          </span>
        </div>
        <input
          id="weights-input"
          type="text"
          className="text-input"
          dir="rtl"
          maxLength={WEIGHTS_TEXT_MAX}
          value={tab.text}
          placeholder="متن کوتاه…"
          onChange={(e) =>
            dispatch({
              type: 'set-text',
              tab: 'weights',
              text: Array.from(toSingleLine(e.target.value)).slice(0, WEIGHTS_TEXT_MAX).join(''),
            })
          }
        />
      </div>
      <div
        className="weights-stack panel"
        aria-label="هم‌پوشانی وزن فونت‌ها"
        style={{
          fontSize: `${px}px`,
          direction: tab.controls.direction,
          paddingBlock: `${Math.max(72, Math.round(px * 0.45))}px ${Math.max(40, Math.round(px * 0.25))}px`,
          paddingInline: `${Math.max(64, Math.round(px * 0.4))}px ${Math.max(32, Math.round(px * 0.2))}px`,
        }}
      >
        {fonts.map((font, index) => {
          const layer: CSSProperties = {
            fontFamily: `"${font.family}"`,
            fontWeight: font.weight,
            fontFeatureSettings: featureCSS(tab.controls.features, font.features),
            fontSynthesis: 'none',
            zIndex: index + 1,
          };
          return (
            <div
              className="weights-layer"
              key={font.id}
              style={layer}
              title={`${font.fileName} — #${index + 1} — ${percent}%`}
            >
              <span className="weights-layer-outline" aria-hidden>
                {text}
              </span>
              <span className="weights-layer-fill" style={{ color: fill }}>
                {text}
              </span>
            </div>
          );
        })}
      </div>
      <ul className="weights-legend">
        {fonts.map((font, index) => (
          <li key={font.id}>
            <span className="weights-legend-num" dir="ltr">
              {index + 1}
            </span>
            <span className="weights-legend-swatch" style={{ background: fill }} />
            <span className="weights-legend-name" title={font.fileName}>
              {font.name}
            </span>
            <span className="weights-legend-num" dir="ltr">
              {percent}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TestViews({
  tabId,
  tab,
  fonts,
  allFonts,
  texts,
  dispatch,
}: {
  tabId: TabId;
  /** Saved default content of the languages, characters and ZWNJ tabs. */
  texts: DefaultTexts;
  tab: TabSession;
  fonts: LoadedFont[];
  /** Every loaded font, active or not; the QA report compares family siblings. */
  allFonts: LoadedFont[];
  dispatch: Dispatch<WorkspaceAction>;
}) {
  const [playing, setPlaying] = useState(false);
  const { position, speed } = tab.typing;
  const setPosition = (value: number) =>
    dispatch({ type: 'set-typing', tab: tabId, patch: { position: value } });
  const setSpeed = (value: number) =>
    dispatch({ type: 'set-typing', tab: tabId, patch: { speed: value } });
  const [letter, setLetter] = useState('ب');
  const [diacriticLang, setDiacriticLang] = useState<'fa' | 'ar'>('fa');
  const [qaFilter, setQaFilter] = useState<QaFilter>('all');
  const liveInput = useRef<HTMLInputElement>(null);
  const [keyboard, setKeyboard] = useState<KeyboardId | null>(null);
  const keyboardLayout = keyboardLayouts.find(({ id }) => id === keyboard);
  // Insert at the caret (replacing any selection) and keep typing from there.
  // With `backspace`, an empty selection first grows to the code point before the caret.
  const insertText = (insert: string, backspace = false) => {
    const el = liveInput.current;
    let start = el?.selectionStart ?? tab.text.length;
    const end = el?.selectionEnd ?? tab.text.length;
    if (backspace && start === end && start > 0) {
      const low = tab.text.charCodeAt(start - 1);
      start -= low >= 0xdc00 && low <= 0xdfff && start > 1 ? 2 : 1;
    }
    dispatch({
      type: 'set-text',
      tab: tabId,
      text: tab.text.slice(0, start) + insert + tab.text.slice(end),
    });
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + insert.length, start + insert.length);
    });
  };
  const segments = useMemo(
    () =>
      Array.from(
        new Intl.Segmenter('fa', { granularity: 'grapheme' }).segment(tab.text),
        (part) => part.segment,
      ),
    [tab.text],
  );
  const finished = position >= segments.length;
  useEffect(() => {
    if (!playing || finished || fonts.length === 0) return;
    const timer = window.setInterval(
      () =>
        dispatch({
          type: 'set-typing',
          tab: tabId,
          patch: { position: Math.min(position + 1, segments.length) },
        }),
      1000 / speed,
    );
    return () => window.clearInterval(timer);
  }, [playing, finished, segments.length, speed, fonts.length, position, dispatch, tabId]);
  // Selecting fonts or changing the visible list restarts the auto-typing demo.
  const fontKey = fonts.map((font) => font.id).join('|');
  // A fresh demo (nothing typed yet) also starts on mount, e.g. after adding the first fonts.
  const previousFontKey = useRef(position === 0 ? '' : fontKey);
  useEffect(() => {
    if (tabId !== 'typing-test' || previousFontKey.current === fontKey) return;
    previousFontKey.current = fontKey;
    if (!fontKey) {
      setPlaying(false);
      return;
    }
    dispatch({ type: 'set-typing', tab: tabId, patch: { position: 0 } });
    setPlaying(true);
  }, [fontKey, tabId, dispatch]);
  const disabled = fonts.length === 0;
  return (
    <>
      {tabId === 'typing-test' && (
        <div className="typing-settings panel">
          <label className="field text-field">
            متن تایپ خودکار
            <input
              type="text"
              className="text-input"
              value={tab.text}
              onChange={(e) => {
                setPlaying(false);
                setPosition(0);
                dispatch({ type: 'set-text', tab: tabId, text: toSingleLine(e.target.value) });
              }}
            />
          </label>
          <div className="toolbar">
            <IconButton
              icon={playing && !finished ? 'pause' : 'play'}
              label={playing && !finished ? 'توقف تایپ' : 'شروع تایپ'}
              variant="primary"
              disabled={disabled || segments.length === 0}
              onClick={() => {
                if (finished) setPosition(0);
                setPlaying(!playing || finished);
              }}
            />
            <IconButton
              icon="reset"
              label="شروع مجدد"
              disabled={disabled || position === 0}
              onClick={() => {
                setPlaying(false);
                setPosition(0);
              }}
            />
            <label className="speed-field">
              <span>سرعت تایپ</span>
              <select
                aria-label="سرعت تایپ"
                value={speed}
                disabled={disabled}
                onChange={(e) => setSpeed(Number(e.target.value))}
              >
                {[1, 3, 5, 10, 20].map((n) => (
                  <option key={n} value={n}>
                    {n} حرف/ثانیه
                  </option>
                ))}
              </select>
              <Icon name="chevron" />
            </label>
            <span role="status" className="ms-auto text-[10px] text-muted">
              {position > 0 ? `${position} / ${segments.length}` : ''}
            </span>
          </div>
        </div>
      )}
      {tabId === 'live-typing' && (
        <div className="text-field panel mb-1">
          <label className="field">
            متن آزمایش
            <input
              ref={liveInput}
              type="text"
              className="text-input"
              value={tab.text}
              disabled={disabled}
              onChange={(e) =>
                dispatch({ type: 'set-text', tab: tabId, text: toSingleLine(e.target.value) })
              }
            />
          </label>
          <div className="insert-keys mt-2">
            <Button disabled={disabled} onClick={() => insertText('\u200c')}>
              نیم‌فاصله
            </Button>
            {insertKeyGroups.map((group) => (
              <div
                key={group.name}
                className="insert-key-group"
                role="group"
                aria-label={group.name}
              >
                {group.keys.map(({ char, label, title }) => (
                  <Button
                    key={char}
                    className="insert-key"
                    disabled={disabled}
                    title={`${title ?? group.name} (U+${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')})`}
                    // Keep the caret in the textarea while clicking.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertText(char)}
                  >
                    {label ?? char}
                  </Button>
                ))}
              </div>
            ))}
            <div className="insert-key-group" role="group" aria-label="صفحه‌کلید">
              {keyboardLayouts.map(({ id, name }) => (
                <Button
                  key={id}
                  className="keyboard-toggle"
                  aria-pressed={keyboard === id}
                  disabled={disabled}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setKeyboard(keyboard === id ? null : id)}
                >
                  ⌨ {name}
                </Button>
              ))}
            </div>
          </div>
          {keyboardLayout && (
            <OnScreenKeyboard
              key={keyboardLayout.id}
              layout={keyboardLayout}
              disabled={disabled}
              onInsert={(text) => insertText(text)}
              onBackspace={() => insertText('', true)}
            />
          )}
        </div>
      )}
      {tabId === 'connections' && (
        <div className="toolbar toolbar-joining panel">
          <div className="joining-letters" role="group" aria-label="حرف اتصال">
            {persianAlphabet.map((char) => (
              <Button
                key={char}
                className="joining-letter"
                aria-pressed={letter === char}
                disabled={disabled}
                onClick={() => setLetter(char)}
              >
                {char}
              </Button>
            ))}
          </div>
        </div>
      )}
      {tabId === 'qa-report' && fonts[0] && (
        <QaToolbar font={fonts[0]} allFonts={allFonts} filter={qaFilter} onFilter={setQaFilter} />
      )}
      {tabId === 'diacritics' && (
        <div className="toolbar panel">
          <div className="joining-letters" role="group" aria-label="زبان اعراب">
            {diacriticGroups.map((group) => (
              <Button
                key={group.id}
                className="joining-letter"
                aria-pressed={diacriticLang === group.id}
                disabled={disabled}
                onClick={() => setDiacriticLang(group.id)}
              >
                {group.title}
              </Button>
            ))}
          </div>
        </div>
      )}
      {disabled && (
        <div className="panel p-12 text-center text-muted">
          همه فونت‌های این تب غیرفعال‌اند. یک فونت را از نوار کناری فعال کنید.
        </div>
      )}
      {tabId === 'weights' && !disabled && (
        <WeightsOverlay tab={tab} fonts={fonts} dispatch={dispatch} />
      )}
      {tabId === 'metadata' && !disabled && <Metadata fonts={fonts} />}
      {(tabId === 'weights' || tabId === 'metadata' ? [] : fonts).map((font, index) => {
        const style = previewStyle(font, tab);
        return (
          <section
            className={
              // A single-font tab shows its one font bare: no card, no name heading.
              isSingleFont(tabId)
                ? `preview-bare ${tabId === 'diacritics' ? 'diacritics-sheet' : ''} ${tabId === 'glyphs' ? 'glyphs-sheet' : ''} ${tabId === 'qa-report' ? 'qa-sheet' : ''}`
                : `preview-card panel ${tabId === 'typing-test' || tabId === 'live-typing' ? 'preview-card-compact' : ''}`
            }
            key={font.id}
          >
            {!isSingleFont(tabId) && (
              <h2 className="preview-heading" title={font.name}>
                <span className="preview-heading-name">{font.fileName}</span>
                {tabId === 'live-typing' && (
                  <span className="preview-heading-count">{index + 1}</span>
                )}
              </h2>
            )}
            {(tabId === 'typing-test' || tabId === 'live-typing') &&
              (tabId === 'typing-test' ? (
                <div
                  className="preview-text preview-text-line"
                  style={style}
                  ref={(el) => {
                    // Keep the newest typed letter in view while typing.
                    if (!el || !playing) return;
                    const rtl = getComputedStyle(el).direction === 'rtl';
                    el.scrollLeft = rtl ? -el.scrollWidth : el.scrollWidth;
                  }}
                >
                  {segments.slice(0, position).join('')}
                </div>
              ) : (
                <div className="preview-text preview-text-compact" style={style}>
                  {tab.text}
                </div>
              ))}
            {tabId === 'languages' &&
              languageSheets
                .map((sheet) => ({ ...sheet, text: texts.languages[sheet.id] }))
                .map((sample) => (
                  <article key={sample.id} className="language-sample panel" lang={sample.lang}>
                    <h2 className="preview-heading">
                      <span className="preview-heading-name">{sample.title}</span>
                      <span className="preview-heading-count" dir="ltr">
                        {sample.id}
                      </span>
                    </h2>
                    <p className="language-sample-main" style={style}>
                      {sample.text}
                    </p>
                    <p
                      className="language-sample-reference"
                      title="نمایش با فونت رابط کاربری برای تشخیص کاراکترهای گمشده"
                    >
                      {sample.text}
                    </p>
                  </article>
                ))}
            {tabId === 'characters' && (
              <>
                <div className="char-grid" style={{ fontSize: style.fontSize }}>
                  {parseCharacters(texts.characters)
                    .map((char) => ({
                      char,
                      missing: font.parsed
                        ? Array.from(char).some((ch) => font.parsed!.charToGlyphIndex(ch) === 0)
                        : null,
                    }))
                    .filter(({ missing }) => tab.controls.showMissing || !missing)
                    .map(({ char, missing }) => (
                      <div
                        className={`char-cell ${missing ? 'char-cell-missing' : ''}`}
                        key={char}
                        title={`${missing ? 'پشتیبانی نمی‌شود — ' : ''}${codePoints(char)}`}
                      >
                        <span className="char-glyph" style={style}>
                          {char}
                        </span>
                        <span className="char-label">{char}</span>
                      </div>
                    ))}
                </div>
                {!font.parsed && <p className="p-3 text-muted">{font.inspectionWarning}</p>}
              </>
            )}
            {tabId === 'connections' && <ConnectionsGrid style={style} letter={letter} />}
            {tabId === 'zwnj' && (
              <table className="data-table zwnj-table">
                <thead>
                  <tr>
                    {['نیم‌فاصله U+200C', 'بدون فاصله', 'فاصله معمولی'].map((label) => (
                      <th key={label}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ...parseZwnjWords(texts.zwnjPersian).map((row) => ({ row, lang: 'fa' })),
                    ...parseZwnjWords(texts.zwnjArabic).map((row) => ({ row, lang: 'ar' })),
                  ].map(({ row, lang }, i) => (
                    <tr key={i} lang={lang}>
                      {row.map((text, j) => (
                        <td key={j} style={style}>
                          {text}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tabId === 'diacritics' && (
              <DiacriticsSheet font={font} style={style} lang={diacriticLang} />
            )}
            {tabId === 'glyphs' && <Glyphs font={font} />}
            {tabId === 'qa-report' && (
              <QaReport font={font} allFonts={allFonts} filter={qaFilter} />
            )}
          </section>
        );
      })}
    </>
  );
}

function codePoints(text: string): string {
  return Array.from(
    text,
    (ch) => `U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`,
  ).join(' ');
}
