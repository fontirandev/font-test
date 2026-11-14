import { useEffect, useMemo, useState, type CSSProperties, type Dispatch } from 'react';
import type { TabId } from '../../shared/tabs';
import { featureCSS, variationCSS, type LoadedFont } from '../lib/fonts';
import {
  characterGroups,
  diacriticSamples,
  languageSamples,
  persianAlphabet,
  zwnjSamples,
} from '../lib/samples';
import { inspectFont } from '../lib/qa';
import type { TabSession, WorkspaceAction } from '../state/workspace';
import { Button, Icon, IconButton } from './ui';
import { Glyphs, Metadata } from './FontInspection';

function previewStyle(font: LoadedFont, tab: TabSession): CSSProperties {
  return {
    fontFamily: `"${font.family}"`,
    fontWeight: font.weight,
    fontSize: `${tab.controls.fontSize}pt`,
    lineHeight: tab.controls.lineHeight,
    letterSpacing: `${tab.controls.letterSpacing}px`,
    direction: tab.controls.direction,
    textAlign: tab.controls.alignment,
    fontFeatureSettings: featureCSS(tab.controls.features, font.features),
    fontVariationSettings: variationCSS(tab.controls.axes, font.axes),
    fontSynthesis: 'none',
  };
}
function downloadJson(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Width that fits four joining forms of one letter at the tab's font size (pt → px). */
function joiningCellWidth(tab: TabSession): number {
  return Math.ceil(tab.controls.fontSize * (4 / 3) * 10 + 16);
}

export function TestViews({
  tabId,
  tab,
  fonts,
  dispatch,
}: {
  tabId: TabId;
  tab: TabSession;
  fonts: LoadedFont[];
  dispatch: Dispatch<WorkspaceAction>;
}) {
  const [playing, setPlaying] = useState(false);
  const { position, speed } = tab.typing;
  const setPosition = (value: number) =>
    dispatch({ type: 'set-typing', tab: tabId, patch: { position: value } });
  const setSpeed = (value: number) =>
    dispatch({ type: 'set-typing', tab: tabId, patch: { speed: value } });
  const [letter, setLetter] = useState('ب');
  const [group, setGroup] = useState<keyof typeof characterGroups>('فارسی');
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
  const isCharacters = tabId === 'characters' || tabId === 'languages';
  const disabled = fonts.length === 0;
  return (
    <>
      {tabId === 'typing-test' && (
        <div className="toolbar panel">
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
      )}
      {tabId === 'live-typing' && (
        <div className="panel mb-4 p-4">
          <label className="field">
            متن آزمایش
            <textarea
              className="text-input min-h-24"
              value={tab.text}
              disabled={disabled}
              onChange={(e) => dispatch({ type: 'set-text', tab: tabId, text: e.target.value })}
            />
          </label>
          <Button
            className="mt-2"
            disabled={disabled}
            onClick={() => dispatch({ type: 'set-text', tab: tabId, text: tab.text + '\u200c' })}
          >
            درج نیم‌فاصله (U+200C)
          </Button>
        </div>
      )}
      {isCharacters && (
        <div className="toolbar panel">
          <Button
            aria-pressed={tabId === 'characters'}
            onClick={() => dispatch({ type: 'select-tab', tab: 'characters' })}
          >
            کاراکترها
          </Button>
          <Button
            aria-pressed={tabId === 'languages'}
            onClick={() => dispatch({ type: 'select-tab', tab: 'languages' })}
          >
            زبان‌ها
          </Button>
          {tabId === 'characters' && (
            <select
              className="text-input max-w-40"
              aria-label="گروه کاراکترها"
              value={group}
              disabled={disabled}
              onChange={(e) => setGroup(e.target.value as keyof typeof characterGroups)}
            >
              {Object.keys(characterGroups).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          )}
        </div>
      )}
      {tabId === 'connections' && (
        <div className="toolbar panel">
          <label className="field">
            حرف اتصال
            <select value={letter} disabled={disabled} onChange={(e) => setLetter(e.target.value)}>
              {persianAlphabet.map((char) => (
                <option key={char}>{char}</option>
              ))}
            </select>
          </label>
          <p className="text-muted">حالت‌های جدا، ابتدایی، میانی و پایانی را مقایسه کنید.</p>
        </div>
      )}
      {tabId === 'qa-report' && (
        <div className="toolbar panel">
          <Button
            disabled={disabled}
            onClick={() =>
              downloadJson(
                'font-desk-qa.json',
                fonts.map((font) => ({ fileName: font.fileName, checks: inspectFont(font) })),
              )
            }
          >
            دریافت گزارش JSON
          </Button>
          <p className="text-muted">
            بررسی ساختاری فونت؛ نتیجه شکل‌دهی را به‌صورت بصری هم بررسی کنید.
          </p>
        </div>
      )}
      {disabled && (
        <div className="panel p-12 text-center text-muted">
          همه فونت‌های این تب غیرفعال‌اند. یک فونت را از نوار کناری فعال کنید.
        </div>
      )}
      {fonts.map((font) => {
        const style = previewStyle(font, tab);
        return (
          <section className="preview-card panel" key={font.id}>
            <h2 className="preview-heading" title={font.name}>
              {font.fileName}
            </h2>
            {(tabId === 'typing-test' || tabId === 'live-typing') && (
              <div className="preview-text min-h-[132px]" style={style}>
                {tabId === 'typing-test' ? segments.slice(0, position).join('') : tab.text}
              </div>
            )}
            {tabId === 'weights' && (
              <div>
                {(font.axes.find((axis) => axis.tag === 'wght')
                  ? [
                      ...new Set([
                        font.axes.find((a) => a.tag === 'wght')!.min,
                        ...[100, 200, 300, 400, 500, 600, 700, 800, 900].filter((weight) => {
                          const axis = font.axes.find((a) => a.tag === 'wght')!;
                          return weight >= axis.min && weight <= axis.max;
                        }),
                        font.axes.find((a) => a.tag === 'wght')!.max,
                      ]),
                    ].sort((a, b) => a - b)
                  : [font.weight]
                ).map((weight) => (
                  <div className="flex items-center gap-6 border-b border-line p-4" key={weight}>
                    <span className="text-muted" dir="ltr">
                      {weight}
                    </span>
                    <p
                      style={{
                        ...style,
                        fontWeight: weight,
                        fontVariationSettings: font.axes.some((a) => a.tag === 'wght')
                          ? `"wght" ${weight}`
                          : 'normal',
                      }}
                    >
                      {tab.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {tabId === 'languages' &&
              languageSamples.map((sample) => (
                <div key={sample.lang} className="border-b border-line p-4">
                  <p className="mb-2 text-muted">{sample.name}</p>
                  <p lang={sample.lang} style={{ ...style, direction: sample.dir }}>
                    {sample.text}
                  </p>
                </div>
              ))}
            {tabId === 'characters' && (
              <>
                <div className="glyph-grid">
                  {characterGroups[group]
                    .filter(
                      (char) =>
                        tab.controls.showMissing ||
                        !font.parsed ||
                        font.parsed.charToGlyphIndex(char) > 0,
                    )
                    .map((char) => {
                      const missing = font.parsed ? font.parsed.charToGlyphIndex(char) === 0 : null;
                      return (
                        <div
                          className="glyph-cell"
                          key={char}
                          title={
                            missing === null
                              ? 'پوشش نامشخص'
                              : missing
                                ? 'گلیف موجود نیست'
                                : 'گلیف موجود است'
                          }
                        >
                          <span style={style}>{missing ? '□' : char}</span>
                          <small>U+{char.codePointAt(0)!.toString(16).toUpperCase()}</small>
                          {missing && <small className="!text-[var(--danger)]">ناموجود</small>}
                        </div>
                      );
                    })}
                </div>
                {!font.parsed && <p className="p-3 text-muted">{font.inspectionWarning}</p>}
              </>
            )}
            {tabId === 'connections' && (
              <div
                className="glyph-grid"
                // Four joining forms per cell stay on one line, so cells widen with the font size.
                style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${joiningCellWidth(tab)}px, 1fr))` }}
              >
                {persianAlphabet.map((char) => (
                  <div className="glyph-cell" key={char}>
                    <span className="joining-forms" style={style}>
                      {[char, `${char}${letter}`, `${letter}${char}${letter}`, `${letter}${char}`].map(
                        (form) => (
                          <span key={form}>{form}</span>
                        ),
                      )}
                    </span>
                    <small>{char}</small>
                  </div>
                ))}
              </div>
            )}
            {tabId === 'zwnj' && (
              <table className="data-table">
                <thead>
                  <tr>
                    {['نیم‌فاصله U+200C', 'بدون فاصله', 'فاصله معمولی'].map((label) => (
                      <th key={label}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {zwnjSamples.map((row, i) => (
                    <tr key={i}>
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
            {tabId === 'diacritics' &&
              diacriticSamples.map((text) => (
                <p className="preview-text border-b border-line" key={text} style={style}>
                  {text}
                </p>
              ))}
            {tabId === 'glyphs' && <Glyphs font={font} size={tab.controls.fontSize} />}
            {tabId === 'metadata' && <Metadata font={font} />}
            {tabId === 'qa-report' && (
              <table className="data-table">
                <tbody>
                  {inspectFont(font)
                    .filter((result) => !tab.controls.onlyIssues || result.status !== 'pass')
                    .map((result) => (
                      <tr key={result.title}>
                        <th>{result.title}</th>
                        <td
                          className={
                            result.status === 'fail'
                              ? 'text-[var(--danger)]'
                              : result.status === 'pass'
                                ? 'text-accent'
                                : 'text-muted'
                          }
                        >
                          {
                            {
                              pass: '✓ موجود',
                              warning: 'نیازمند بررسی',
                              fail: '✕ ناموجود',
                              unavailable: 'نامشخص',
                            }[result.status]
                          }
                        </td>
                        <td>{result.detail}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </section>
        );
      })}
      {tabId === 'typing-test' && fonts.length > 0 && (
        <details className="panel mt-4 p-4 text-muted">
          <summary className="cursor-pointer">ویرایش متن تایپ خودکار</summary>
          <textarea
            aria-label="متن تایپ خودکار"
            className="text-input mt-3 min-h-28"
            value={tab.text}
            onChange={(e) => {
              setPlaying(false);
              setPosition(0);
              dispatch({ type: 'set-text', tab: tabId, text: e.target.value });
            }}
          />
        </details>
      )}
    </>
  );
}
