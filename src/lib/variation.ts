import { useEffect, useMemo, useState } from 'react';
import opentype, { type BoundingBox, type Glyph } from 'opentype.js';
import type { Font as FkFont, Glyph as FkGlyph, PathCommand } from 'fontkit';
import type { LoadedFont } from './fonts';

/**
 * opentype.js draws only a font's default outlines. For any other axis values the
 * glyphs come from fontkit (gvar / CFF2 / HVAR aware), wrapped to look like
 * opentype.js glyphs so the glyph list and detail view need no second code path.
 */

/** fontkit is only needed for variable fonts away from their defaults; load it then. */
let fontkitModule: Promise<typeof import('fontkit')> | null = null;
const baseFonts = new WeakMap<LoadedFont, Promise<FkFont>>();

function fontkitFont(font: LoadedFont): Promise<FkFont> {
  let pending = baseFonts.get(font);
  if (!pending) {
    fontkitModule ??= import('fontkit');
    pending = fontkitModule.then(
      (fontkit) => fontkit.create(new Uint8Array(font.sfnt!) as never) as FkFont,
    );
    baseFonts.set(font, pending);
  }
  return pending;
}

/** Axis values clamped to the font's ranges, or null when every axis is at its default. */
function variationSettings(
  font: LoadedFont,
  values: Record<string, number>,
): Record<string, number> | null {
  if (!font.parsed || !font.sfnt) return null;
  const settings: Record<string, number> = {};
  let changed = false;
  for (const axis of font.axes) {
    const raw = values[axis.tag];
    const value = Number.isFinite(raw)
      ? Math.min(axis.max, Math.max(axis.min, raw!))
      : axis.defaultValue;
    settings[axis.tag] = value;
    if (value !== axis.defaultValue) changed = true;
  }
  return changed ? settings : null;
}

/** Replays fontkit path commands into an opentype.js path, mapping each point. */
function toPath(commands: PathCommand[], map: (x: number, y: number) => [number, number]) {
  const path = new opentype.Path();
  for (const { command, args } of commands) {
    const p = Array.from({ length: args.length / 2 }, (_, i) => map(args[i * 2]!, args[i * 2 + 1]!));
    if (command === 'moveTo') path.moveTo(...p[0]!);
    else if (command === 'lineTo') path.lineTo(...p[0]!);
    else if (command === 'quadraticCurveTo') path.quadraticCurveTo(...p[0]!, ...p[1]!);
    else if (command === 'bezierCurveTo') path.curveTo(...p[0]!, ...p[1]!, ...p[2]!);
    else if (command === 'closePath') path.close();
  }
  return path;
}

type TtContours = () => { x: number; y: number; onCurve: boolean }[][];

/**
 * An opentype.js glyph (names, unicodes, components) with fontkit's varied outline.
 * Everything is computed on first use, so a list only pays for what it draws.
 */
function variedGlyph(base: Glyph, varied: FkGlyph, unitsPerEm: number): Glyph {
  let path: opentype.Path | undefined;
  const outline = () => (path ??= toPath(varied.path.commands, (x, y) => [x, y]));
  const ttContours = (varied as FkGlyph & { _getContours?: TtContours })._getContours;
  return Object.create(base, {
    path: { get: outline },
    advanceWidth: { get: () => varied.advanceWidth },
    getBoundingBox: {
      value: () => {
        const { minX, minY, maxX, maxY } = varied.bbox;
        // fontkit reports an empty glyph as ±Infinity; opentype.js uses zeros.
        return Number.isFinite(minX)
          ? { x1: minX, y1: minY, x2: maxX, y2: maxY }
          : ({ x1: 0, y1: 0, x2: 0, y2: 0 } as BoundingBox);
      },
    },
    // Like opentype.js: scaled to `size` px and turned y-down at (x, y).
    getPath: {
      value: (x = 0, y = 0, size = 72) => {
        const scale = size / unitsPerEm;
        return toPath(varied.path.commands, (px, py) => [x + px * scale, y - py * scale]);
      },
    },
    // TrueType points, off-curve ones included; CFF2 glyphs are read from the path.
    getContours: {
      value: () =>
        ttContours
          ? ttContours
              .call(varied)
              .map((contour) => contour.map(({ x, y, onCurve }) => ({ x, y, onCurve })))
          : [],
    },
  }) as Glyph;
}

/**
 * Glyph lookup for `font` at the given axis values. Until fontkit has loaded (and
 * for static fonts or default values) the default outlines are returned. Building
 * a variation is cheap; drawing the glyphs is the cost, so callers should pass
 * deferred axis values and render glyphs in memoized children.
 */
export function useGlyphSource(
  font: LoadedFont,
  values: Record<string, number>,
): (index: number) => Glyph {
  const settings = variationSettings(font, values);
  const key = settings ? JSON.stringify(settings) : '';
  const wanted = settings !== null;
  const [loaded, setLoaded] = useState<{ font: LoadedFont; fk: FkFont } | null>(null);
  const base = loaded?.font === font ? loaded.fk : null;
  useEffect(() => {
    if (!wanted || base) return;
    let cancelled = false;
    fontkitFont(font)
      .then((fk) => {
        if (!cancelled) setLoaded({ font, fk });
      })
      .catch(() => {
        /* A font fontkit can't read keeps its default drawing. */
      });
    return () => {
      cancelled = true;
    };
  }, [font, wanted, base]);

  const parsed = font.parsed;
  return useMemo(() => {
    if (!parsed) return () => undefined as never;
    if (!base || !key) return (index) => parsed.glyphs.get(index);
    const fk = base.getVariation(JSON.parse(key) as Record<string, number>);
    const cache = new Map<number, Glyph>();
    return (index) => {
      let glyph = cache.get(index);
      if (!glyph) {
        glyph = variedGlyph(parsed.glyphs.get(index), fk.getGlyph(index), parsed.unitsPerEm);
        cache.set(index, glyph);
      }
      return glyph;
    };
  }, [parsed, base, key]);
}
