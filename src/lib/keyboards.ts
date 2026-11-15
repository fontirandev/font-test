/**
 * On-screen keyboard layouts for the live typing tab.
 *
 * Each row lists keys in physical order (` 1 2 … / q w e … / a s d … / z x c …),
 * as space-separated tokens; `shift` gives the Shift layer for the same keys.
 * "‌" is ZWNJ (U+200C). An empty slot is written as "_".
 */
export type KeyboardId = 'arabic' | 'persian' | 'kurdish';

export interface KeyboardLayout {
  id: KeyboardId;
  name: string;
  lang: string;
  rows: { base: string; shift: string }[];
}

export const keyboardLayouts: KeyboardLayout[] = [
  {
    // Arabic (101), as shipped with Windows and macOS.
    id: 'arabic',
    name: 'عربی',
    lang: 'ar',
    rows: [
      { base: 'ذ ١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩ ٠ - =', shift: 'ّ ! @ # $ % ^ & * ) ( _ +' },
      { base: 'ض ص ث ق ف غ ع ه خ ح ج د', shift: 'َ ً ُ ٌ لإ إ ‘ ÷ × ؛ < >' },
      { base: 'ش س ي ب ل ا ت ن م ك ط', shift: 'ِ ٍ ] [ لأ أ ـ ، / : "' },
      { base: 'ئ ء ؤ ر لا ى ة و ز ظ', shift: '~ ْ } { لآ آ ’ , . ؟' },
    ],
  },
  {
    // Persian standard (ISIRI 9147).
    id: 'persian',
    name: 'فارسی',
    lang: 'fa',
    rows: [
      { base: '‍ ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹ ۰ - =', shift: '÷ ! ٬ ٫ ﷼ ٪ × ، * ) ( ـ +' },
      { base: 'ض ص ث ق ف غ ع ه خ ح ج چ', shift: 'ْ ٌ ٍ ً ُ ِ َ ّ ] [ } {' },
      { base: 'ش س ی ب ل ا ت ن م ک گ', shift: 'ؤ ئ ي إ أ آ ة » « : ؛' },
      { base: 'ظ ط ز ر ذ د پ و . /', shift: 'ك ٓ ژ ٰ ‌ ٔ ء > < ؟' },
    ],
  },
  {
    // Central Kurdish (Sorani), Arabic script.
    id: 'kurdish',
    name: 'کوردی',
    lang: 'ckb',
    rows: [
      { base: '‍ ١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩ ٠ - =', shift: '÷ ! @ # $ ٪ × ، * ) ( ـ +' },
      { base: 'ق و ە ر ت ی ئ ح ۆ پ ] [', shift: '_ _ ي ڕ ط ێ ء ع ؤ ث } {' },
      { base: "ا س د ف گ ه ژ ک ل ؛ '", shift: 'آ ش ذ إ غ ‌ أ _ ڵ : "' },
      { base: 'ز خ ج ڤ ب ن م ، . /', shift: 'ض ص چ ظ ى ة ـ > < ؟' },
    ],
  },
];

/** Splits a row into keys; "_" marks a key with nothing on that layer. */
export function rowKeys(row: string): (string | null)[] {
  return row.split(' ').map((key) => (key === '_' ? null : key));
}

/** Combining marks (harakat etc.) can't stand alone, so show them on a dotted circle. */
export function keyLabel(key: string): string {
  if (key === '‌') return 'ZWNJ';
  if (key === '‍') return 'ZWJ';
  return /^\p{M}/u.test(key) ? '◌' + key : key;
}
