import type { LoadedFont } from './fonts';
import { persianAlphabet } from './samples';

export interface QaResult {
  title: string;
  status: 'pass' | 'warning' | 'fail' | 'unavailable';
  detail: string;
}
export function inspectFont(font: LoadedFont): QaResult[] {
  if (!font.parsed)
    return [
      {
        title: 'تحلیل فایل',
        status: 'unavailable',
        detail: font.inspectionWarning ?? 'اطلاعات فونت در دسترس نیست.',
      },
    ];
  const parsed = font.parsed;
  const results: QaResult[] = [];
  for (const [title, characters] of [
    ['حروف فارسی', persianAlphabet.join('')],
    ['ارقام فارسی', '۰۱۲۳۴۵۶۷۸۹'],
    ['کاف و یای فارسی', 'کی'],
  ] as const) {
    const missing = Array.from(characters).filter(
      (character) => parsed.charToGlyphIndex(character) === 0,
    );
    results.push({
      title,
      status: missing.length ? 'fail' : 'pass',
      detail: missing.length
        ? `گلیف‌های ناموجود: ${missing.join(' ')}`
        : 'تمام کاراکترها در cmap وجود دارند.',
    });
  }
  for (const tag of ['init', 'medi', 'fina', 'mark', 'mkmk']) {
    const exists = font.features.includes(tag);
    results.push({
      title: `OpenType: ${tag}`,
      status: exists ? 'pass' : 'warning',
      detail: exists
        ? 'ویژگی در جدول فونت اعلام شده است؛ نتیجه بصری را در تب مربوط بررسی کنید.'
        : 'این ویژگی اعلام نشده است؛ نبود آن به‌تنهایی اثبات خرابی نمایش نیست.',
    });
  }
  for (const name of ['fontFamily', 'fontSubfamily', 'fullName', 'postScriptName'] as const) {
    const record = parsed.names[name];
    const text = record?.fa ?? record?.en ?? Object.values(record ?? {})[0];
    results.push({
      title: name,
      status: text ? 'pass' : 'warning',
      detail: text ?? 'نام ثبت نشده است.',
    });
  }
  results.push({
    title: 'Units per em',
    status: parsed.unitsPerEm > 0 ? 'pass' : 'fail',
    detail: String(parsed.unitsPerEm),
  });
  results.push({
    title: 'وزن OS/2',
    status: font.weight >= 1 && font.weight <= 1000 ? 'pass' : 'warning',
    detail: String(font.weight),
  });
  return results;
}
