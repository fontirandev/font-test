import opentype, { type Font } from 'opentype.js';
import type { FontIdentity } from '../state/workspace';
import { inferWeight } from './weight';

// crypto.randomUUID only exists in secure contexts (HTTPS or localhost), so the
// app breaks when served over plain HTTP; getRandomValues works everywhere.
function createId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

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
  /** Designer-given names for stylistic sets (ssXX), from GSUB FeatureParams + name table. */
  featureNames: Record<string, string>;
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

/** Table bytes by tag, from a raw TTF/OTF or a WOFF (zlib-compressed tables). */
async function readTable(bytes: ArrayBuffer, tag: string): Promise<DataView | null> {
  const view = new DataView(bytes);
  const tagAt = (offset: number) =>
    String.fromCharCode(...new Uint8Array(bytes, offset, 4));
  if (tagAt(0) === 'wOFF') {
    const count = view.getUint16(12);
    for (let i = 0; i < count; i++) {
      const record = 44 + i * 20;
      if (tagAt(record) !== tag) continue;
      const offset = view.getUint32(record + 4);
      const compLength = view.getUint32(record + 8);
      const origLength = view.getUint32(record + 12);
      const data = bytes.slice(offset, offset + compLength);
      if (compLength >= origLength) return new DataView(data);
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate'));
      return new DataView(await new Response(stream).arrayBuffer());
    }
    return null;
  }
  const count = view.getUint16(4);
  for (let i = 0; i < count; i++) {
    const record = 12 + i * 16;
    if (tagAt(record) !== tag) continue;
    const offset = view.getUint32(record + 8);
    return new DataView(bytes, offset, view.getUint32(record + 12));
  }
  return null;
}

/**
 * Stylistic set names: each ssXX feature may point (FeatureParams) at a name ID
 * whose string the designer wrote, e.g. "Farsi Numeral" for ss01.
 */
export async function readFeatureNames(
  sfnt: ArrayBuffer,
  font: Font,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const gsub = await readTable(sfnt, 'GSUB');
  if (!gsub) return result;
  const names = font.names as unknown as Record<string, Record<string, string> | undefined>;
  const featureList = gsub.getUint16(6);
  const count = gsub.getUint16(featureList);
  for (let i = 0; i < count; i++) {
    const record = featureList + 2 + i * 6;
    const tag = String.fromCharCode(
      gsub.getUint8(record),
      gsub.getUint8(record + 1),
      gsub.getUint8(record + 2),
      gsub.getUint8(record + 3),
    );
    if (!/^ss\d\d$/.test(tag) || tag in result) continue;
    const feature = featureList + gsub.getUint16(record + 4);
    const params = gsub.getUint16(feature);
    if (!params) continue;
    const nameId = gsub.getUint16(feature + params + 2);
    const value = names[String(nameId)];
    const name = value && (value.en ?? value.fa ?? Object.values(value)[0]);
    if (name) result[tag] = name;
  }
  return result;
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

const isWoff2 = (bytes: ArrayBuffer) =>
  bytes.byteLength >= 4 && new DataView(bytes).getUint32(0) === 0x774f4632; // 'wOF2'

/** opentype.js reads TTF, OTF and WOFF but not WOFF2, so WOFF2 is decompressed first. */
async function toSfnt(bytes: ArrayBuffer): Promise<ArrayBuffer> {
  return isWoff2(bytes) ? decompressWoff2(bytes.slice(0)) : bytes.slice(0);
}

function decompressWoff2(bytes: ArrayBuffer): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./woff2.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }: MessageEvent<ArrayBuffer | null>) => {
      worker.terminate();
      if (data) resolve(data);
      else reject(new Error('WOFF2 could not be decompressed'));
    };
    worker.onerror = () => {
      worker.terminate();
      reject(new Error('WOFF2 decoder failed to start'));
    };
    worker.postMessage(bytes, [bytes]);
  });
}

/** File bytes are read and rendered in this browser only. No upload endpoint exists. */
export async function loadFont(file: File, id = createId()): Promise<LoadedFont> {
  if (!/\.(otf|ttf|woff2?)$/i.test(file.name)) throw new Error('فرمت مجاز: OTF، TTF، WOFF و WOFF2');
  if (file.size > 50 * 1024 * 1024) throw new Error('حجم فایل باید کمتر از ۵۰ مگابایت باشد.');
  const bytes = await file.arrayBuffer();
  let parsed: Font | null = null;
  let featureNames: Record<string, string> = {};
  try {
    const sfnt = await toSfnt(bytes);
    parsed = opentype.parse(sfnt);
    featureNames = await readFeatureNames(sfnt, parsed).catch(() => ({}));
  } catch {
    /* Browser rendering may support formats the inspector does not. */
  }
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
  const names = parsed?.names as Record<string, Record<string, string> | undefined> | undefined;
  const sortWeight = inferWeight({
    typographicSubfamily: names?.typographicSubfamily?.en ?? names?.preferredSubfamily?.en,
    names: [names?.fullName?.en, names?.postScriptName?.en, file.name, names?.fullName?.fa],
    legacySubfamily: names?.fontSubfamily?.en,
    weightClass: Number(parsed?.tables.os2?.usWeightClass) || undefined,
    variableDefault: weightAxis?.defaultValue,
  });
  return {
    id,
    family,
    face,
    parsed,
    weight,
    sortWeight,
    axes,
    fileName: file.name,
    size: file.size,
    name:
      parsed?.names.fullName?.fa ?? parsed?.names.fullName?.en ?? file.name.replace(/\.[^.]+$/, ''),
    features: parsed ? readFeatures(parsed) : [],
    featureNames,
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
