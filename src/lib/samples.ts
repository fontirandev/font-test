export const persianAlphabet = Array.from('اآبپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی');
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
