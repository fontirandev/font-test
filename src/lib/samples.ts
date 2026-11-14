export const persianAlphabet = Array.from('اآبپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی');
export const characterGroups = {
  فارسی: [...persianAlphabet, ...Array.from('۰۱۲۳۴۵۶۷۸۹،؛؟٪٫٬')],
  عربی: Array.from('ابتثجحخدذرزسشصضطظعغفقكلمنهويءأإآؤئىة٠١٢٣٤٥٦٧٨٩'),
  لاتین: Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'),
};
export const languageSamples = [
  {
    name: 'فارسی',
    lang: 'fa',
    dir: 'rtl' as const,
    text: 'سپیده که سر می‌زند، پنجره‌های شهر به روی روشنایی باز می‌شوند.',
  },
  {
    name: 'العربية',
    lang: 'ar',
    dir: 'rtl' as const,
    text: 'في كل حرف حكاية، وفي كل كلمة نافذة تطلّ على عالم جميل.',
  },
  {
    name: 'اردو',
    lang: 'ur',
    dir: 'rtl' as const,
    text: 'ہر حرف کی اپنی پہچان ہے اور ہر لفظ ایک نئی کہانی سناتا ہے۔',
  },
  {
    name: 'کوردی',
    lang: 'ckb',
    dir: 'rtl' as const,
    text: 'زمان و نووسین پردێکن بۆ پەیوەندی لە نێوان مرۆڤەکان.',
  },
  {
    name: 'English',
    lang: 'en',
    dir: 'ltr' as const,
    text: 'Every letter has a rhythm. Pack my box with five dozen liquor jugs. 0123456789',
  },
];
export const zwnjSamples = [
  ['می\u200cروم', 'میروم', 'می روم'],
  ['خانه\u200cها', 'خانهها', 'خانه ها'],
  ['نوشته\u200cاند', 'نوشتهاند', 'نوشته اند'],
  ['بزرگ\u200cتر', 'بزرگتر', 'بزرگ تر'],
  ['هم\u200cزمان', 'همزمان', 'هم زمان'],
  ['بی\u200cنظیر', 'بینظیر', 'بی نظیر'],
];
export const diacriticSamples = [
  'بَ بِ بُ بً بٍ بٌ بْ بّ بّٰ',
  'سَلَامٌ عَلَيْكُمْ',
  'اَلْعَرَبِيَّةُ وَالْفَارِسِيَّةُ',
  'آ أ إ ؤ ئ ۀ ة',
  '«نقل‌قول» (پرانتز) [کروشه] — … ! ؟ ، ؛',
];
