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
/** Arabic compounds that are written both joined and apart. */
export const zwnjArabicSamples = [
  ['عبد\u200cالله', 'عبدالله', 'عبد الله'],
  ['إن\u200cشاء\u200cالله', 'إنشاءالله', 'إن شاء الله'],
  ['عبد\u200cالرحمن', 'عبدالرحمن', 'عبد الرحمن'],
];
/** One diacritics test page: grids of letter + mark cells, then sample text blocks. */
export interface DiacriticSection {
  id: string;
  title: string;
  /** `grid` shows short items in cells; `block` shows whole sentences. */
  layout: 'grid' | 'block';
  items: { text: string; label: string }[];
}

const diacriticMarks = [
  { id: 'fatha', mark: '\u064E', name: 'فتحه' },
  { id: 'kasra', mark: '\u0650', name: 'کسره' },
  { id: 'damma', mark: '\u064F', name: 'ضمه' },
  { id: 'fathatan', mark: '\u064B', name: 'تنوین فتح' },
  { id: 'kasratan', mark: '\u064D', name: 'تنوین کسر' },
  { id: 'dammatan', mark: '\u064C', name: 'تنوین ضم' },
  { id: 'shadda', mark: '\u0651', name: 'تشدید' },
  { id: 'sukun', mark: '\u0652', name: 'سکون' },
  { id: 'superscript-alef', mark: '\u0670', name: 'الف بالا' },
];

const stackedMarks = [
  { id: 'shadda-fatha', marks: '\u0651\u064E', name: 'تشدید+فتحه' },
  { id: 'shadda-kasra', marks: '\u0651\u0650', name: 'تشدید+کسره' },
  { id: 'shadda-damma', marks: '\u0651\u064F', name: 'تشدید+ضمه' },
  { id: 'shadda-fathatan', marks: '\u0651\u064B', name: 'تشدید+تنوین فتح' },
  { id: 'shadda-kasratan', marks: '\u0651\u064D', name: 'تشدید+تنوین کسر' },
  { id: 'shadda-dammatan', marks: '\u0651\u064C', name: 'تشدید+تنوین ضم' },
];

function diacriticSections(bases: string[], lang: string): DiacriticSection[] {
  // Letters that commonly carry a shadda with a second mark stacked on it.
  const stackBases = bases.filter((b) => 'بتثجحخدذرزسشصضطظعغفقكلمنهيکگ'.includes(b)).slice(0, 12);
  return [
    ...diacriticMarks.map(({ id, mark, name }) => ({
      id: `${lang}-${id}`,
      title: name,
      layout: 'grid' as const,
      items: bases.map((base) => ({ text: base + mark, label: base })),
    })),
    {
      id: `${lang}-stacked`,
      title: 'تشدید ترکیبی (mark / mkmk)',
      layout: 'grid',
      items: stackedMarks.flatMap(({ marks, name }) =>
        stackBases.map((base) => ({ text: base + marks, label: name })),
      ),
    },
  ];
}

/** Diacritic (اعراب) mark-positioning tests, per language. */
export const diacriticGroups: { id: 'fa' | 'ar'; title: string; sections: DiacriticSection[] }[] = [
  {
    id: 'fa',
    title: 'فارسی',
    sections: [
      ...diacriticSections(Array.from('ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی'), 'fa'),
      {
        id: 'fa-samples',
        title: 'نمونه متن با اعراب',
        layout: 'block',
        items: [
          { text: 'بِسْمِ اللهِ الرَّحْمنِ الرَّحيمِ', label: 'بسمه' },
          { text: 'قُلْ هُوَ اللهُ أَحَدٌ', label: 'توحید' },
          { text: 'اَلْحَمْدُ لِلَّهِ رَبِّ الْعالَمينَ', label: 'حمد' },
          { text: 'كِتابٌ أَنْزَلْناهُ إِلَيْكَ مُبارَكٌ', label: 'آیه' },
          { text: 'مُحَمَّدٌ رَسُولُ اللهِ', label: 'شهادت' },
        ],
      },
    ],
  },
  {
    id: 'ar',
    title: 'عربی',
    sections: [
      ...diacriticSections(Array.from('ابتثجحخدذرزسشصضطظعغفقكلمنهويءآأؤإئىة'), 'ar'),
      {
        id: 'ar-quran',
        title: 'نمونه قرآنی / علامت‌گذاری',
        layout: 'block',
        items: [
          { text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', label: 'الفاتحة ١' },
          { text: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ', label: 'الفاتحة ٢' },
          { text: 'ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', label: 'الفاتحة ٣' },
          { text: 'مَٰلِكِ يَوْمِ ٱلدِّينِ', label: 'الفاتحة ٤' },
          { text: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', label: 'الفاتحة ٥' },
          { text: 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ', label: 'الفاتحة ٦' },
          {
            text: 'صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ',
            label: 'الفاتحة ٧',
          },
        ],
      },
    ],
  },
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
