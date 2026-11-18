import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Font, Glyph } from 'opentype.js';
import { Button, Modal } from './ui';

interface Point {
  x: number;
  y: number;
  onCurve: boolean;
}

/** One closed outline: its points in drawing order, and the handle lines between them. */
interface Contour {
  points: Point[];
  handles: [Point, Point][];
}

const round = (n: number) => Math.round(n * 100) / 100;
const hex = (code: number) => `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;

/**
 * Contours with on/off-curve points. TrueType glyphs keep their real points
 * (including off-curve ones the path loses); CFF glyphs are read from the path.
 */
function readContours(glyph: Glyph): Contour[] {
  try {
    const raw = glyph.getContours() as unknown as Point[][];
    if (Array.isArray(raw) && raw.length > 0 && raw.every(Array.isArray)) {
      return raw.map((points) => {
        const list = points.map((p) => ({ x: p.x, y: p.y, onCurve: p.onCurve !== false }));
        const handles: [Point, Point][] = [];
        list.forEach((p, i) => {
          const next = list[(i + 1) % list.length]!;
          if (!p.onCurve || !next.onCurve) handles.push([p, next]);
        });
        return { points: list, handles };
      });
    }
  } catch {
    // CFF glyphs have no TrueType points; fall through to the path.
  }
  const contours: Contour[] = [];
  let current: Contour | null = null;
  let last: Point | null = null;
  for (const cmd of glyph.path.commands) {
    if (cmd.type === 'M') {
      current = { points: [], handles: [] };
      contours.push(current);
      last = { x: cmd.x, y: cmd.y, onCurve: true };
      current.points.push(last);
    } else if (current && last && cmd.type !== 'Z') {
      const end = { x: cmd.x, y: cmd.y, onCurve: true };
      if (cmd.type === 'Q') {
        const c = { x: cmd.x1, y: cmd.y1, onCurve: false };
        current.points.push(c);
        current.handles.push([last, c], [c, end]);
      } else if (cmd.type === 'C') {
        const c1 = { x: cmd.x1, y: cmd.y1, onCurve: false };
        const c2 = { x: cmd.x2, y: cmd.y2, onCurve: false };
        current.points.push(c1, c2);
        current.handles.push([last, c1], [c2, end]);
      }
      // A closing segment back to the start repeats the first point; skip it.
      const first = current.points[0]!;
      if (!(cmd.type === 'L' && end.x === first.x && end.y === first.y)) current.points.push(end);
      last = end;
    }
  }
  return contours;
}

function fontLines(font: Font) {
  const os2 = font.tables.os2 as { sxHeight?: number; sCapHeight?: number } | undefined;
  return {
    ascender: font.ascender,
    capHeight: os2?.sCapHeight || 0,
    xHeight: os2?.sxHeight || 0,
    descender: font.descender,
  };
}

/** A standalone SVG of the glyph outline, in font units, y-up turned y-down. */
function glyphSvg(font: Font, glyph: Glyph) {
  const { ascender, descender } = fontLines(font);
  const width = glyph.advanceWidth || font.unitsPerEm;
  const d = glyph.getPath(0, 0, font.unitsPerEm).toPathData(2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${-ascender} ${width} ${ascender - descender}"><path d="${d}"/></svg>`;
}

type Layer = 'fill' | 'points' | 'metrics';
const layerLabels: Record<Layer, string> = { fill: 'رنگ', points: 'نقاط', metrics: 'خطوط متریک' };

function Preview({ font, glyph, layers }: { font: Font; glyph: Glyph; layers: Set<Layer> }) {
  const model = useMemo(() => {
    const lines = fontLines(font);
    const advance = glyph.advanceWidth ?? 0;
    const box = glyph.getBoundingBox();
    const empty = !(box.x2 > box.x1);
    const upm = font.unitsPerEm || 1000;
    const pad = upm * 0.12;
    const left = Math.min(0, empty ? 0 : box.x1) - pad;
    const right = Math.max(advance, empty ? 0 : box.x2, upm * 0.3) + pad;
    const top = Math.max(lines.ascender, empty ? 0 : box.y2) + pad;
    const bottom = Math.min(lines.descender, empty ? 0 : box.y1) - pad;
    return {
      ...lines,
      advance,
      box,
      empty,
      left,
      right,
      top,
      bottom,
      width: right - left,
      height: top - bottom,
      d: glyph.path.toPathData(2),
      contours: readContours(glyph),
    };
  }, [font, glyph]);
  const span = Math.max(model.width, model.height);
  const r = span * 0.0065;
  const label = span * 0.022;
  const guides = [
    { name: 'Ascender', y: model.ascender },
    { name: 'Cap height', y: model.capHeight },
    { name: 'x-height', y: model.xHeight },
    { name: 'Baseline', y: 0 },
    { name: 'Descender', y: model.descender },
    // Fonts without OS/2 cap or x-height report 0; leave those lines out.
  ].filter((line) => line.y !== 0 || line.name === 'Baseline');
  return (
    <svg
      className="glyph-detail-svg"
      viewBox={`${model.left} ${-model.top} ${model.width} ${model.height}`}
      role="img"
      aria-label={glyph.name ?? `glyph ${glyph.index}`}
    >
      {layers.has('metrics') && (
        <g>
          {guides.map((line) => (
            <g key={line.name}>
              <line
                className={line.y === 0 ? 'glyph-guide glyph-guide-baseline' : 'glyph-guide'}
                x1={model.left}
                x2={model.right}
                y1={-line.y}
                y2={-line.y}
              />
              <text
                className="glyph-guide-label"
                // x-height sits close to cap height, so its label goes on the right.
                x={line.name === 'x-height' ? model.right - label * 0.4 : model.left + label * 0.4}
                textAnchor={line.name === 'x-height' ? 'end' : 'start'}
                y={-line.y - label * 0.35}
                fontSize={label}
              >
                {line.name} {round(line.y)}
              </text>
            </g>
          ))}
          <line className="glyph-advance" x1={0} x2={0} y1={-model.top} y2={-model.bottom} />
          <line
            className="glyph-advance"
            x1={model.advance}
            x2={model.advance}
            y1={-model.top}
            y2={-model.bottom}
          />
          <text
            className="glyph-guide-label"
            x={model.advance / 2}
            y={-model.bottom - label * 0.5}
            fontSize={label}
            textAnchor="middle"
          >
            ← {round(model.advance)} →
          </text>
          {!model.empty && (
            <rect
              className="glyph-bbox"
              x={model.box.x1}
              y={-model.box.y2}
              width={model.box.x2 - model.box.x1}
              height={model.box.y2 - model.box.y1}
            />
          )}
        </g>
      )}
      <g transform="scale(1,-1)">
        {model.d && (
          <path
            className={layers.has('fill') ? 'glyph-outline glyph-outline-filled' : 'glyph-outline'}
            d={model.d}
          />
        )}
        {layers.has('points') &&
          model.contours.map((contour, c) => (
            <g key={c}>
              {contour.handles.map(([a, b], i) => (
                <line key={i} className="glyph-handle" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
              ))}
              {contour.points.map((p, i) =>
                i === 0 ? (
                  <polygon
                    key={i}
                    className="glyph-start"
                    points={`${p.x},${p.y + r * 2} ${p.x - r * 1.8},${p.y - r * 1.4} ${p.x + r * 1.8},${p.y - r * 1.4}`}
                  />
                ) : (
                  <circle
                    key={i}
                    className={p.onCurve ? 'glyph-point' : 'glyph-point glyph-point-off'}
                    cx={p.x}
                    cy={p.y}
                    r={r}
                  />
                ),
              )}
            </g>
          ))}
      </g>
    </svg>
  );
}

export function GlyphDetail({
  font,
  glyphAt,
  index,
  order,
  onSelect,
  onClose,
}: {
  font: Font;
  /** The glyph for an id, drawn at the current axis values. */
  glyphAt: (index: number) => Glyph;
  /** Glyph id being shown. */
  index: number;
  /** Glyph ids in the order the list shows them, for previous / next. */
  order: number[];
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  const glyph = glyphAt(index);
  const [layers, setLayers] = useState<Set<Layer>>(() => new Set(['fill', 'points', 'metrics']));
  const [copied, setCopied] = useState<string | null>(null);
  const position = order.indexOf(index);
  const prev = position > 0 ? order[position - 1]! : null;
  const next = position >= 0 && position < order.length - 1 ? order[position + 1]! : null;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest('input, textarea')) return;
      // The list is left-to-right, so arrows follow it regardless of page direction.
      if (event.key === 'ArrowLeft' && prev !== null) onSelect(prev);
      if (event.key === 'ArrowRight' && next !== null) onSelect(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next, onSelect]);

  const contours = useMemo(() => readContours(glyph), [glyph]);
  const box = glyph.getBoundingBox();
  const empty = !(box.x2 > box.x1);
  const advance = glyph.advanceWidth ?? 0;
  const lsb = empty ? 0 : box.x1;
  const rsb = empty ? 0 : advance - box.x2;
  const pointCount = contours.reduce((sum, c) => sum + c.points.length, 0);
  const offCount = contours.reduce((sum, c) => sum + c.points.filter((p) => !p.onCurve).length, 0);
  const components = (
    glyph as Glyph & {
      isComposite?: boolean;
      components?: { glyphIndex: number; dx: number; dy: number }[];
    }
  ).components;
  const unicodes = glyph.unicodes ?? [];
  const char = unicodes[0] ? String.fromCodePoint(unicodes[0]) : '';
  const outline = font.outlinesFormat === 'cff' ? 'CFF (cubic)' : 'TrueType (quadratic)';

  const rows: [string, ReactNode][] = [
    ['Name', glyph.name || `glyph${index}`],
    ['Glyph ID', index],
    ['Unicode', unicodes.length ? unicodes.map(hex).join(' ') : 'Unencoded'],
    ['Character', char ? <span className="glyph-detail-char">{char}</span> : '—'],
    ['Advance width', round(advance)],
    ['Left side bearing', round(lsb)],
    ['Right side bearing', round(rsb)],
    ['xMin / xMax', empty ? '—' : `${round(box.x1)} / ${round(box.x2)}`],
    ['yMin / yMax', empty ? '—' : `${round(box.y1)} / ${round(box.y2)}`],
    ['Width × height', empty ? '—' : `${round(box.x2 - box.x1)} × ${round(box.y2 - box.y1)}`],
    ['Contours', contours.length],
    ['Points', `${pointCount} (${pointCount - offCount} on, ${offCount} off)`],
    ['Outline', outline],
    ['Units per em', font.unitsPerEm],
  ];

  const copy = async (what: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied((current) => (current === what ? null : current)), 1500);
    } catch {
      setCopied(null);
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([glyphSvg(font, glyph)], { type: 'image/svg+xml' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${glyph.name || `glyph${index}`}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal title={`گلیف ${index}: ${glyph.name ?? ''}`} onClose={onClose} className="modal-wide">
      <div className="glyph-detail" dir="ltr">
        <div className="glyph-detail-stage">
          <div className="glyph-detail-toolbar">
            <Button disabled={prev === null} onClick={() => prev !== null && onSelect(prev)}>
              قبلی
            </Button>
            <span className="text-muted">
              {position + 1} / {order.length}
            </span>
            <Button disabled={next === null} onClick={() => next !== null && onSelect(next)}>
              بعدی
            </Button>
            <span className="glyph-detail-spacer" />
            <div className="glyph-layer-group" role="group" aria-label="لایه‌های نمایش" dir="rtl">
              {(Object.keys(layerLabels) as Layer[]).map((layer) => (
                <button
                  key={layer}
                  type="button"
                  className="glyph-layer-toggle"
                  aria-pressed={layers.has(layer)}
                  onClick={() =>
                    setLayers((current) => {
                      const nextLayers = new Set(current);
                      if (nextLayers.has(layer)) nextLayers.delete(layer);
                      else nextLayers.add(layer);
                      return nextLayers;
                    })
                  }
                >
                  {layerLabels[layer]}
                </button>
              ))}
            </div>
          </div>
          <div className="glyph-detail-preview">
            <Preview font={font} glyph={glyph} layers={layers} />
          </div>
          <div className="glyph-detail-legend text-muted">
            <span>
              <i className="legend-on" /> on-curve
            </span>
            <span>
              <i className="legend-off" /> off-curve
            </span>
            <span>
              <i className="legend-start" /> contour start
            </span>
          </div>
        </div>
        <div className="glyph-detail-info">
          <dl className="glyph-props">
            {rows.map(([key, value]) => (
              <div key={key} className="glyph-prop">
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {components && components.length > 0 && (
            <section>
              <h3 className="glyph-detail-heading">Components</h3>
              <ul className="glyph-components">
                {components.map((part, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className="glyph-component-link"
                      onClick={() => onSelect(part.glyphIndex)}
                    >
                      {font.glyphs.get(part.glyphIndex).name || `glyph${part.glyphIndex}`} #
                      {part.glyphIndex}
                    </button>
                    <span className="text-muted">
                      {' '}
                      offset {round(part.dx)}, {round(part.dy)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <div className="glyph-detail-actions">
            {char && (
              <Button onClick={() => copy('char', char)}>
                {copied === 'char' ? 'کپی شد' : 'کپی کاراکتر'}
              </Button>
            )}
            <Button onClick={() => copy('svg', glyphSvg(font, glyph))}>
              {copied === 'svg' ? 'کپی شد' : 'کپی SVG'}
            </Button>
            <Button onClick={download}>دریافت SVG</Button>
          </div>
          <section>
            <h3 className="glyph-detail-heading">Contours data</h3>
            <pre className="glyph-contour-data">
              {contours.length === 0
                ? '(empty)'
                : contours
                    .map(
                      (contour, c) =>
                        `# contour ${c + 1} (${contour.points.length} points)\n` +
                        contour.points
                          .map(
                            (p, i) =>
                              `${String(i).padStart(3)}  x=${round(p.x)}  y=${round(p.y)}${p.onCurve ? '' : '  off'}`,
                          )
                          .join('\n'),
                    )
                    .join('\n\n')}
            </pre>
          </section>
        </div>
      </div>
    </Modal>
  );
}
