import type { Font } from 'opentype.js';
import type { LoadedFont } from './fonts';

export type QaStatus = 'pass' | 'warn' | 'fail';

export interface QaCheck {
  group: string;
  title: string;
  detail: string;
  status: QaStatus;
}

export const qaStatusLabel: Record<QaStatus, string> = {
  pass: 'قبول',
  warn: 'هشدار',
  fail: 'رد',
};

const ZWNJ = '‌';
const persianSpecific = ['گ', 'چ', 'پ', 'ژ'];
const persianKehYeh = ['ک', 'ی'];
const arabicKehYeh = ['ك', 'ي'];
const persianDigits = Array.from('۰۱۲۳۴۵۶۷۸۹');
const arabicDigits = Array.from('٠١٢٣٤٥٦٧٨٩');
const arabicExtra = ['ة', 'ى', 'ئ', 'ؤ', 'أ', 'إ', 'آ', 'ء'];
const joiningFeatures = ['init', 'medi', 'fina'];
const markFeatures = ['mark', 'mkmk'];

const weightNameHints: Array<{ pattern: RegExp; expected: number }> = [
  { pattern: /thin|مویی/i, expected: 100 },
  { pattern: /extra[\s_-]*light|ultra[\s_-]*light/i, expected: 200 },
  { pattern: /light|نازک|لایت/i, expected: 300 },
  { pattern: /regular|normal|book|roman|عادی|معمولی/i, expected: 400 },
  { pattern: /medium|مدیوم/i, expected: 500 },
  { pattern: /semi[\s_-]*bold|demi[\s_-]*bold/i, expected: 600 },
  { pattern: /extra[\s_-]*bold|ultra[\s_-]*bold/i, expected: 800 },
  { pattern: /bold|ضخیم|بولد/i, expected: 700 },
  { pattern: /black|heavy|کلفت|سیاه/i, expected: 900 },
];

type NameRecord = Record<string, string> | undefined;

function pickName(record: NameRecord): string | null {
  if (!record) return null;
  const value =
    record.fa?.trim() || record.en?.trim() || Object.values(record).find((v) => v?.trim());
  return value?.trim() || null;
}

function names(parsed: Font): Record<string, NameRecord> {
  return parsed.names as unknown as Record<string, NameRecord>;
}

function coverage(
  parsed: Font,
  group: string,
  title: string,
  chars: string[],
  failIfMissing: boolean,
): QaCheck {
  const missing = chars.filter((ch) => parsed.charToGlyphIndex(ch) === 0);
  if (!missing.length)
    return { group, title, detail: `همهٔ موارد موجود (${chars.length})`, status: 'pass' };
  return {
    group,
    title,
    detail: `کمبود: ${missing.map((c) => (c === ZWNJ ? 'ZWNJ' : c)).join('، ')}`,
    status: failIfMissing ? 'fail' : 'warn',
  };
}

function singleFontChecks(font: LoadedFont): QaCheck[] {
  const parsed = font.parsed;
  if (!parsed)
    return [
      {
        group: 'فایل',
        title: 'خواندن OpenType',
        detail: font.inspectionWarning ?? 'پارس فونت ممکن نیست.',
        status: 'fail',
      },
    ];
  const tags = new Set(font.features);
  const checks: QaCheck[] = [
    coverage(parsed, 'پوشش فارسی', 'حروف ویژه فارسی (گ چ پ ژ)', persianSpecific, true),
    coverage(parsed, 'پوشش فارسی', 'کاف و یای فارسی (ک ی)', persianKehYeh, true),
    coverage(parsed, 'پوشش فارسی', 'ارقام فارسی ۰–۹', persianDigits, true),
    coverage(parsed, 'پوشش فارسی', 'کاراکتر ZWNJ (نیم‌فاصله)', [ZWNJ], true),
    coverage(parsed, 'پوشش عربی', 'کاف و یای عربی (ك ي)', arabicKehYeh, false),
    coverage(parsed, 'پوشش عربی', 'ارقام عربی-هندی ٠–٩', arabicDigits, false),
    coverage(parsed, 'پوشش عربی', 'حروف عربی تکمیلی (ة ى ئ أ إ آ ء …)', arabicExtra, false),
  ];

  const features = 'ویژگی‌های OpenType';
  const missingJoining = joiningFeatures.filter((t) => !tags.has(t));
  checks.push({
    group: features,
    title: 'اتصال: init / medi / fina',
    detail: missingJoining.length ? `کمبود: ${missingJoining.join(', ')}` : 'موجود',
    status: missingJoining.length ? 'fail' : 'pass',
  });
  checks.push({
    group: features,
    title: 'شکل جدا (isol)',
    detail: tags.has('isol') ? 'موجود' : 'اعلام نشده',
    status: tags.has('isol') ? 'pass' : 'warn',
  });
  const ligatures = ['liga', 'rlig'].filter((t) => tags.has(t));
  checks.push({
    group: features,
    title: 'لیگاتور (liga یا rlig)',
    detail: ligatures.length ? ligatures.join(' + ') : 'هیچ‌کدام اعلام نشده',
    status: ligatures.length ? 'pass' : 'warn',
  });
  for (const tag of markFeatures)
    checks.push({
      group: features,
      title: `جایگذاری علامت (${tag})`,
      detail: tags.has(tag) ? 'موجود' : 'اعلام نشده — اعراب ممکن است جابه‌جا شود',
      status: tags.has(tag) ? 'pass' : 'fail',
    });

  const naming = 'نام‌گذاری';
  const n = names(parsed);
  const subfamily = pickName(n.fontSubfamily);
  const fullName = pickName(n.fullName);
  for (const [key, missingStatus] of [
    ['fontFamily', 'fail'],
    ['fontSubfamily', 'fail'],
    ['fullName', 'warn'],
    ['postScriptName', 'fail'],
  ] as const) {
    const value = pickName(n[key]);
    checks.push({
      group: naming,
      title: key,
      detail: value ?? 'خالی',
      status: value ? 'pass' : missingStatus,
    });
  }

  const usWeight = (parsed.tables.os2 as { usWeightClass?: number } | undefined)?.usWeightClass;
  const nameForWeight = [subfamily, fullName, font.name, font.fileName].filter(Boolean).join(' ');
  const expected = weightNameHints.find(({ pattern }) => pattern.test(nameForWeight))?.expected;
  if (typeof usWeight === 'number' && usWeight > 0) {
    if (expected != null) {
      const delta = Math.abs(usWeight - expected);
      checks.push({
        group: naming,
        title: 'usWeightClass با نام وزن',
        detail: `OS/2=${usWeight}، از نام≈${expected}${delta <= 50 ? '' : ' — ناسازگار'}`,
        status: delta <= 50 ? 'pass' : delta <= 150 ? 'warn' : 'fail',
      });
    } else {
      checks.push({
        group: naming,
        title: 'usWeightClass',
        detail: String(usWeight),
        status: 'pass',
      });
    }
  } else {
    checks.push({
      group: naming,
      title: 'usWeightClass',
      detail: 'در جدول OS/2 نیست',
      status: 'warn',
    });
  }
  return checks;
}

function familyKey(font: LoadedFont): string {
  const n = font.parsed ? names(font.parsed) : {};
  return pickName(n.preferredFamily) ?? pickName(n.fontFamily) ?? font.family;
}

/** Metric consistency between `font` and the other loaded fonts of its family. */
function familyChecks(font: LoadedFont, allFonts: LoadedFont[]): QaCheck[] {
  if (!font.parsed) return [];
  const family = familyKey(font);
  const members = allFonts.filter((f) => f.parsed && familyKey(f) === family);
  if (members.length < 2) return [];
  const group = 'یکنواختی خانواده';
  const metric = (title: string, read: (f: Font) => number): QaCheck => {
    const values = new Set(members.map((f) => read(f.parsed!)));
    return {
      group,
      title: `${title} — ${family}`,
      detail: members.map((f) => `${f.fileName}: ${read(f.parsed!)}`).join('، '),
      status: values.size === 1 ? 'pass' : 'fail',
    };
  };
  const weights = new Set(members.map((f) => f.sortWeight ?? f.weight));
  return [
    metric('unitsPerEm', (f) => f.unitsPerEm),
    metric('ascender', (f) => f.ascender),
    metric('descender', (f) => f.descender),
    {
      group,
      title: `وزن‌های متمایز — ${family}`,
      detail:
        weights.size === members.length
          ? `${members.length} وزن متمایز`
          : 'بعضی وزن‌ها تکراری یا مبهم‌اند',
      status: weights.size === members.length ? 'pass' : 'warn',
    },
  ];
}

/** Marketplace QA checks for one font; `allFonts` supplies its family siblings. */
export function inspectFont(font: LoadedFont, allFonts: LoadedFont[] = [font]): QaCheck[] {
  return [...singleFontChecks(font), ...familyChecks(font, allFonts)];
}

export function summarizeQa(checks: QaCheck[]): Record<QaStatus, number> {
  const summary = { pass: 0, warn: 0, fail: 0 };
  for (const check of checks) summary[check.status] += 1;
  return summary;
}
