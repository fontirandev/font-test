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
import { WEIGHTS_TEXT_MAX, type TabSession, type WorkspaceAction } from '../state/workspace';
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

/** Fill share per layer: 50% for one or two fonts, otherwise split evenly. */
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
      <div className="weights-input-head">
        <label htmlFor="weights-input">متن کوتاه برای مقایسه وزن‌ها</label>
        <span className="weights-count" dir="ltr">
          {Array.from(tab.text).length}/{WEIGHTS_TEXT_MAX}
        </span>
      </div>
      <textarea
        id="weights-input"
        className="text-input weights-input panel"
        rows={2}
        dir="rtl"
        maxLength={WEIGHTS_TEXT_MAX}
        value={tab.text}
        placeholder="متن کوتاه…"
        onChange={(e) =>
          dispatch({
            type: 'set-text',
            tab: 'weights',
            text: Array.from(e.target.value.replace(/\n/g, '')).slice(0, WEIGHTS_TEXT_MAX).join(''),
          })
        }
      />
      <div
        className="weights-stack panel"
        aria-label="هم‌پوشانی وزن فونت‌ها"
        style={{
          fontSize: `${px}px`,
          lineHeight: tab.controls.lineHeight,
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
      {tabId === 'weights' && !disabled && (
        <WeightsOverlay tab={tab} fonts={fonts} dispatch={dispatch} />
      )}
      {(tabId === 'weights' ? [] : fonts).map((font) => {
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
                style={{
                  gridTemplateColumns: `repeat(auto-fill, minmax(${joiningCellWidth(tab)}px, 1fr))`,
                }}
              >
                {persianAlphabet.map((char) => (
                  <div className="glyph-cell" key={char}>
                    <span className="joining-forms" style={style}>
                      {[
                        char,
                        `${char}${letter}`,
                        `${letter}${char}${letter}`,
                        `${letter}${char}`,
                      ].map((form) => (
                        <span key={form}>{form}</span>
                      ))}
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
