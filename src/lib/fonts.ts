import opentype, { type Font } from 'opentype.js';
import type { FontIdentity } from '../state/workspace';

export interface VariationAxis {
  tag: string;
  name: string;
  min: number;
  max: number;
  defaultValue: number;
}
export interface LoadedFont extends FontIdentity {
  fileName: string;
  size: number;
  family: string;
  face: FontFace;
  parsed: Font | null;
  features: string[];
  axes: VariationAxis[];
  inspectionWarning: string | null;
}

export function readFeatures(font: Font): string[] {
  const tables = [font.tables.gsub, font.tables.gpos] as Array<
    { features?: Array<{ tag: string }> } | undefined
  >;
  return [
    ...new Set(tables.flatMap((table) => table?.features?.map((feature) => feature.tag) ?? [])),
  ].sort();
}

export function readAxes(font: Font): VariationAxis[] {
  const fvar = font.tables.fvar as
    | {
        axes?: Array<{
          tag: string;
          name: Record<string, string>;
          minValue: number;
          maxValue: number;
          defaultValue: number;
        }>;
      }
    | undefined;
  return (fvar?.axes ?? []).map((axis) => ({
    tag: axis.tag,
    name: axis.name.fa ?? axis.name.en ?? axis.tag,
    min: axis.minValue,
    max: axis.maxValue,
    defaultValue: axis.defaultValue,
  }));
}

/** File bytes are read and rendered in this browser only. No upload endpoint exists. */
export async function loadFont(file: File): Promise<LoadedFont> {
  if (!/\.(otf|ttf|woff2?)$/i.test(file.name)) throw new Error('فرمت مجاز: OTF، TTF، WOFF و WOFF2');
  if (file.size > 50 * 1024 * 1024) throw new Error('حجم فایل باید کمتر از ۵۰ مگابایت باشد.');
  const bytes = await file.arrayBuffer();
  let parsed: Font | null = null;
  try {
    parsed = opentype.parse(bytes.slice(0));
  } catch {
    /* Browser rendering may support formats the inspector does not. */
  }
  const id = crypto.randomUUID();
  const family = `font-desk-${id}`;
  const axes = parsed ? readAxes(parsed) : [];
  const weightAxis = axes.find((axis) => axis.tag === 'wght');
  const weight = Number(parsed?.tables.os2?.usWeightClass) || 400;
  const face = new FontFace(family, bytes, {
    weight: weightAxis ? `${weightAxis.min} ${weightAxis.max}` : String(weight),
  });
  try {
    await face.load();
  } catch {
    throw new Error(`فایل «${file.name}» قابل نمایش نیست.`);
  }
  document.fonts.add(face);
  return {
    id,
    family,
    face,
    parsed,
    weight,
    axes,
    fileName: file.name,
    size: file.size,
    name:
      parsed?.names.fullName?.fa ?? parsed?.names.fullName?.en ?? file.name.replace(/\.[^.]+$/, ''),
    features: parsed ? readFeatures(parsed) : [],
    inspectionWarning: parsed
      ? null
      : 'نمایش فونت ممکن است، اما تحلیل این فایل پشتیبانی نمی‌شود. برای بررسی گلیف و متادیتا نسخه TTF یا OTF را باز کنید.',
  };
}

export function unloadFont(font: LoadedFont): void {
  document.fonts.delete(font.face);
}

/** Explicit false values must disable a feature; omitting them restores browser defaults. */
export function featureCSS(features: Record<string, boolean>, allowed: string[]): string {
  return (
    Object.entries(features)
      .filter(([tag]) => allowed.includes(tag) && /^[\w ]{4}$/.test(tag))
      .map(([tag, enabled]) => `"${tag}" ${enabled ? 1 : 0}`)
      .join(', ') || 'normal'
  );
}

export function variationCSS(values: Record<string, number>, axes: VariationAxis[]): string {
  return (
    axes
      .filter((axis) => Number.isFinite(values[axis.tag]))
      .map((axis) => `"${axis.tag}" ${Math.min(axis.max, Math.max(axis.min, values[axis.tag]!))}`)
      .join(', ') || 'normal'
  );
}
