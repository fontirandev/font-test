import { supportsControl, type TabId } from '../../shared/tabs';
import type { PreviewSettings } from '../../shared/settings';
import type { TabSession } from '../state/workspace';
import type { LoadedFont } from '../lib/fonts';
import { Button, IconButton, Slider, Toggle } from './ui';
import { useGlyphView } from '../lib/glyph-view';

const displayModes: { id: PreviewSettings['display']; label: string }[] = [
  { id: 'solid', label: 'Solid' },
  { id: 'outline', label: 'Outline' },
];

/** One-click font sizes (pt) under the size slider. */
const sizePresets = [16, 24, 48, 64, 124, 248];

/**
 * Optional (discretionary) OpenType features a designer turns on or off while testing.
 * Required shaping features (ccmp, locl, init, medi, fina, rlig, mark, mkmk, …) are
 * always applied by the browser, so they are not offered as toggles.
 */
const featureLabels: Record<string, string> = {
  liga: 'Standard ligatures',
  dlig: 'Rare ligatures',
  calt: 'Contextual alternates',
  kern: 'Kerning',
  salt: 'Stylistic alternates',
  swsh: 'Swash',
  frac: 'Fractions',
  lnum: 'Lining figures',
  onum: 'Oldstyle figures',
  pnum: 'Proportional figures',
  tnum: 'Tabular figures',
  zero: 'Slashed zero',
  sups: 'Superscript',
  subs: 'Subscript',
  ordn: 'Ordinals',
  case: 'Case-sensitive forms',
  smcp: 'Small capitals',
  c2sc: 'Capitals to small capitals',
};
/** Features browsers enable unless told otherwise. */
const onByDefault = new Set(['liga', 'calt', 'kern', 'clig']);
const isStylisticSet = (tag: string) => /^ss\d\d$/.test(tag);
const isCharacterVariant = (tag: string) => /^cv\d\d$/.test(tag);

export function isToggleableFeature(tag: string): boolean {
  return tag in featureLabels || isStylisticSet(tag) || isCharacterVariant(tag);
}

export function featureLabel(tag: string, names: Record<string, string> = {}): string {
  if (names[tag]) return names[tag];
  if (isStylisticSet(tag)) return `Stylistic set ${Number(tag.slice(2))}`;
  if (isCharacterVariant(tag)) return `Character variant ${Number(tag.slice(2))}`;
  return featureLabels[tag] ?? tag;
}

/** Logical alignments: with right-to-left text, Start is the right edge. */
const alignments: { id: PreviewSettings['alignment']; label: string }[] = [
  { id: 'start', label: 'Start' },
  { id: 'center', label: 'Center' },
  { id: 'end', label: 'End' },
  { id: 'justify', label: 'Justify' },
];

/**
 * Line height, letter spacing and alignment. Only the paragraph tab offers them,
 * and it shows them above its text box rather than in the sidebar.
 */
export function TextLayoutBar({
  controls: c,
  defaults,
  onChange,
  disabled = false,
}: {
  controls: PreviewSettings;
  /** The tab's saved defaults; the reset button restores these three from them. */
  defaults: PreviewSettings;
  onChange: (patch: Partial<PreviewSettings>) => void;
  disabled?: boolean;
}) {
  const initial = {
    lineHeight: defaults.lineHeight,
    letterSpacing: defaults.letterSpacing,
    alignment: defaults.alignment,
  };
  const atDefaults = (Object.keys(initial) as (keyof typeof initial)[]).every(
    (key) => c[key] === initial[key],
  );
  return (
    <div className="text-layout-bar" dir="ltr">
      <Slider
        label="Line height"
        min={0.8}
        max={4}
        step={0.05}
        value={c.lineHeight}
        disabled={disabled}
        onChange={(lineHeight) => onChange({ lineHeight })}
      />
      <Slider
        label="Letter spacing"
        min={-10}
        max={30}
        step={0.1}
        unit="px"
        value={c.letterSpacing}
        disabled={disabled}
        onChange={(letterSpacing) => onChange({ letterSpacing })}
      />
      <div>
        <div className="control-label" id="alignment-label">
          Text alignment
        </div>
        <div className="alignment-modes" role="group" aria-labelledby="alignment-label">
          {alignments.map(({ id, label }) => (
            <Button
              key={id}
              className="alignment-mode"
              aria-pressed={c.alignment === id}
              disabled={disabled}
              onClick={() => onChange({ alignment: id })}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      <IconButton
        icon="reset"
        label="بازنشانی ارتفاع خط، فاصلهٔ حروف و چینش"
        className="text-layout-reset"
        disabled={disabled || atDefaults}
        onClick={() => onChange(initial)}
      />
    </div>
  );
}

export function PreviewControls({
  tabId,
  tab,
  fonts,
  onChange,
  disabled = false,
}: {
  tabId: TabId;
  tab: TabSession;
  fonts: LoadedFont[];
  onChange: (patch: Partial<PreviewSettings>) => void;
  disabled?: boolean;
}) {
  const active = fonts.filter((font) => tab.active[font.id]);
  const features = [...new Set(active.flatMap((font) => font.features))].filter(
    isToggleableFeature,
  );
  const featureNames = Object.assign({}, ...active.map((font) => font.featureNames ?? {}));
  const axes = active.flatMap((font) =>
    font.axes.map((axis) => ({ ...axis, fontName: font.name })),
  );
  const uniqueAxes = [...new Map(axes.map((axis) => [axis.tag, axis])).values()];
  const c = tab.controls;
  const glyphView = useGlyphView();
  const permitted = (key: keyof PreviewSettings) =>
    supportsControl(tabId, key) &&
    // The glyph grid draws every glyph at one fixed size; only the row view takes these.
    !(tabId === 'glyphs' && glyphView === 'grid' && (key === 'fontSize' || key === 'display'));
  return (
    <div dir="ltr">
      {permitted('display') && (
        <div className="control-section">
          <div className="control-label" id="display-label">
            Display
          </div>
          <div className="display-modes" role="group" aria-labelledby="display-label">
            {displayModes.map(({ id, label }) => (
              <Button
                key={id}
                className="display-mode"
                aria-pressed={c.display === id}
                disabled={disabled}
                onClick={() => onChange({ display: id })}
              >
                <span className={`display-swatch display-swatch-${id}`} aria-hidden="true" />
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}
      {permitted('fontSize') && (
        <div className="control-section size-section">
          <Slider
            label="Font size"
            min={8}
            max={300}
            value={c.fontSize}
            unit="pt"
            disabled={disabled}
            onChange={(fontSize) => onChange({ fontSize })}
          />
          <div className="size-presets" role="group" aria-label="Font size presets">
            {sizePresets.map((size) => (
              <Button
                key={size}
                className="size-preset"
                aria-pressed={c.fontSize === size}
                title={`${size} pt`}
                disabled={disabled}
                onClick={() => onChange({ fontSize: size })}
              >
                {size}
              </Button>
            ))}
          </div>
        </div>
      )}
      {permitted('axes') && uniqueAxes.length > 0 && (
        <section className="control-section">
          <h3>Variable</h3>
          <div className="axis-list">
            {uniqueAxes.map((axis) => {
              const matching = axes.filter((a) => a.tag === axis.tag);
              const min = Math.min(...matching.map((a) => a.min));
              const max = Math.max(...matching.map((a) => a.max));
              return (
                <Slider
                  key={axis.tag}
                  label={axis.name}
                  compact
                  min={min}
                  max={max}
                  step={0.1}
                  value={c.axes[axis.tag] ?? axis.defaultValue}
                  disabled={disabled}
                  onChange={(value) => onChange({ axes: { ...c.axes, [axis.tag]: value } })}
                />
              );
            })}
          </div>
        </section>
      )}
      {permitted('features') &&
        [false, true].map((stylistic) => {
          const tags = features.filter((tag) => isStylisticSet(tag) === stylistic);
          return (
            tags.length > 0 && (
              <section className="control-section" key={String(stylistic)}>
                <h3>{stylistic ? 'Stylistic sets' : 'Letterforms'}</h3>
                {tags.map((tag) => (
                  <Toggle
                    key={tag}
                    label={featureLabel(tag, featureNames)}
                    checked={c.features[tag] ?? onByDefault.has(tag)}
                    disabled={disabled}
                    onChange={(value) => onChange({ features: { ...c.features, [tag]: value } })}
                  />
                ))}
              </section>
            )
          );
        })}
      {permitted('showMissing') && (
        <div className="control-section">
          <Toggle
            label="Show missing characters"
            checked={c.showMissing}
            disabled={disabled}
            onChange={(showMissing) => onChange({ showMissing })}
          />
        </div>
      )}
    </div>
  );
}
