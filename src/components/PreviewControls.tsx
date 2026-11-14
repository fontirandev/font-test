import { supportsControl, type TabId } from '../../shared/tabs';
import type { PreviewSettings } from '../../shared/settings';
import type { TabSession } from '../state/workspace';
import type { LoadedFont } from '../lib/fonts';
import { Slider, Toggle } from './ui';

const featureLabels: Record<string, string> = {
  liga: 'Standard ligatures',
  dlig: 'Rare ligatures',
  calt: 'Contextual alternates',
  kern: 'Kerning',
  mark: 'Mark positioning',
  mkmk: 'Mark to mark',
  rlig: 'Required ligatures',
};
export function featureLabel(tag: string): string {
  return /^ss\d\d$/.test(tag)
    ? `Stylistic set ${Number(tag.slice(2))}`
    : (featureLabels[tag] ?? tag);
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
  const features = [...new Set(active.flatMap((font) => font.features))];
  const axes = active.flatMap((font) =>
    font.axes.map((axis) => ({ ...axis, fontName: font.name })),
  );
  const uniqueAxes = [...new Map(axes.map((axis) => [axis.tag, axis])).values()];
  const c = tab.controls;
  const permitted = (key: keyof PreviewSettings) => supportsControl(tabId, key);
  return (
    <div dir="ltr">
      {permitted('fontSize') && (
        <div className="control-section min-h-[84px]">
          <Slider
            label="Font size"
            min={8}
            max={300}
            value={c.fontSize}
            unit="pt"
            disabled={disabled}
            onChange={(fontSize) => onChange({ fontSize })}
          />
        </div>
      )}
      {permitted('features') &&
        [false, true].map((stylistic) => {
          const tags = features.filter((tag) => /^ss\d\d$/.test(tag) === stylistic);
          return (
            tags.length > 0 && (
              <section className="control-section" key={String(stylistic)}>
                <h3>{stylistic ? 'Stylistic sets' : 'Letterforms'}</h3>
                {tags.map((tag) => (
                  <Toggle
                    key={tag}
                    label={featureLabel(tag)}
                    checked={
                      c.features[tag] ??
                      [
                        'liga',
                        'calt',
                        'kern',
                        'mark',
                        'mkmk',
                        'rlig',
                        'ccmp',
                        'locl',
                        'init',
                        'medi',
                        'fina',
                      ].includes(tag)
                    }
                    disabled={disabled}
                    onChange={(value) => onChange({ features: { ...c.features, [tag]: value } })}
                  />
                ))}
              </section>
            )
          );
        })}
      {permitted('axes') && uniqueAxes.length > 0 && (
        <section className="control-section">
          <h3>Variable</h3>
          <div className="space-y-4">
            {uniqueAxes.map((axis) => {
              const matching = axes.filter((a) => a.tag === axis.tag);
              const min = Math.min(...matching.map((a) => a.min));
              const max = Math.max(...matching.map((a) => a.max));
              return (
                <Slider
                  key={axis.tag}
                  label={axis.name}
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
      {permitted('lineHeight') && (
        <details className="control-section">
          <summary className="cursor-pointer text-muted">Text layout</summary>
          <div className="space-y-4 pt-4">
            <Slider
              label="Line height"
              min={0.8}
              max={4}
              step={0.1}
              value={c.lineHeight}
              disabled={disabled}
              onChange={(lineHeight) => onChange({ lineHeight })}
            />
            {permitted('letterSpacing') && (
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
            )}
            {permitted('direction') && (
              <label className="field">
                Direction
                <select
                  value={c.direction}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange({ direction: e.target.value as PreviewSettings['direction'] })
                  }
                >
                  <option value="rtl">Right to left</option>
                  <option value="ltr">Left to right</option>
                </select>
              </label>
            )}
            {permitted('alignment') && (
              <label className="field">
                Alignment
                <select
                  value={c.alignment}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange({ alignment: e.target.value as PreviewSettings['alignment'] })
                  }
                >
                  <option value="start">Start</option>
                  <option value="center">Center</option>
                  <option value="end">End</option>
                  <option value="justify">Justify</option>
                </select>
              </label>
            )}
          </div>
        </details>
      )}
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
      {permitted('onlyIssues') && (
        <div className="control-section">
          <Toggle
            label="Only warnings and failures"
            checked={c.onlyIssues}
            disabled={disabled}
            onChange={(onlyIssues) => onChange({ onlyIssues })}
          />
        </div>
      )}
    </div>
  );
}
