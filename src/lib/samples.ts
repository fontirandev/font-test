export const persianAlphabet = Array.from('اآبپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی');
/**
 * Characters checked for coverage, from the old tester's sample sheet:
 * digits, punctuation, math, currency and ligature marks. Each appears once;
 * «الله» stays whole because it is checked as a ligature.
 */
export const characterSamples = [
  ...new Set([
    ...Array.from('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩0123456789@#$%^&*!?_-،؛:٭•/|\\۔.{}()[]«»+−×÷=√¦٫٬,€﷼٪﴾﴿۝ﷲ'),
    'الله',
  ]),
];
/**
 * Language sheets from the old tester. Each one is shown in the tested font and
 * again in the UI font, so a missing or wrong glyph stands out by comparison.
 */
export const languageSamples = [
  {
    id: 'arabic',
    title: 'عربی',
    lang: 'ar',
    text: 'أَبْجَدِيَّةُ اللُّغَةِ العَرَبِيَّةِ تَضُمُّ جَمِيعَ الحُرُوفِ: أ ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن هـ و ي. كَتَبَ الأُسْتَاذُ: «هَلْ قَرَأْتَ النَّصَّ الجَدِيدَ؟» فَأَجَابَ الطَّالِبُ: نَعَمْ، قَرَأْتُهُ فِي عَامِ ٢٠٢٦، وَكَانَ سِعْرُهُ ١٢٣٫٤٥ ر.س، أَوْ 123.45. كما يَحْتَوِي عَلَى الرُّمُوزِ: ! ؟ ، ؛ : .',
  },
  {
    id: 'quran',
    title: 'قرآن',
    lang: 'ar',
    text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ ١ ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ ٢ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ ٣ مَـٰلِكِ يَوْمِ ٱلدِّينِ ٤ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ٥ ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ ٦ صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ ٧',
  },
  {
    id: 'urdu',
    title: 'اردو',
    lang: 'ur',
    text: 'اُردو زبان کے تمام حروف اور علامات کی جانچ کے لیے یہ نمونہ متن تیار کیا گیا ہے۔ احمد نے کہا: \"کیا آپ نے نیا مضمون پڑھا؟\" فاطمہ نے جواب دیا: \"جی ہاں، میں نے اسے ۲۰۲۶ء میں پڑھا تھا، اور اُس کی قیمت ۱۲۳٫۴۵ روپے تھی۔\" اس متن میں مختلف اعراب، رموزِ اوقاف، اعداد، اور علامات شامل ہیں: ! ؟ ، ؛ : ۔',
  },
  {
    id: 'kurdish',
    title: 'کردی',
    lang: 'ckb',
    text: 'زمانی کوردی زمانێکی دەوڵەمەندە و بە پیتی جیاواز نووسراوە. ئارام وتی: «ئایا ئەم دەقە نوێیەت خوێندووەتەوە؟» ئاوات وەڵامی دایەوە: «بەڵێ، لە ساڵی ٢٠٢٦ خوێندمەوە و نرخەکەی ١٢٣٫٤٥ دۆلار بوو.» ئەم دەقە هەموو پیت و هێما گرنگەکان تاقی دەکات: ! ؟ ، ؛',
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

/** On-screen keys for the live typing tab; `label` is what the key shows when it differs. */
export const insertKeyGroups: {
  name: string;
  keys: { char: string; label?: string; title?: string }[];
}[] = [
  {
    name: 'اعداد فارسی',
    keys: Array.from({ length: 10 }, (_, i) => ({ char: String.fromCodePoint(0x06f0 + i) })),
  },
  {
    name: 'اعداد عربی',
    keys: Array.from({ length: 10 }, (_, i) => ({ char: String.fromCodePoint(0x0660 + i) })),
  },
  {
    name: 'اعراب',
    // Combining marks are shown on a dotted circle so the key isn't blank.
    keys: (
      [
        ['َ', 'فتحه'],
        ['ِ', 'کسره'],
        ['ُ', 'ضمه'],
        ['ً', 'تنوین نصب'],
        ['ٍ', 'تنوین جر'],
        ['ٌ', 'تنوین رفع'],
        ['ْ', 'سکون'],
        ['ّ', 'تشدید'],
        ['ٰ', 'الف خنجری'],
        ['ٓ', 'مد'],
        ['ٔ', 'همزه بالا'],
        ['ٕ', 'همزه پایین'],
      ] as [string, string][]
    ).map(([char, title]) => ({ char, title, label: '◌' + char })),
  },
];
