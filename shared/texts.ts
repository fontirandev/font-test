import { z } from 'zod';

/**
 * Editable sample content for the text tabs. The built-in values below are the
 * app defaults; a saved copy replaces them (Settings → default content).
 */

/** Two-line sample the typing tabs start from (joined to one line there). */
export const sampleText =
  'به تماشای جهان بنشین؛ هر حرف، پنجره‌ای به دنیایی تازه است.\nطراحی حروف فارسی، پیوندی میان خوانایی و زیبایی است.';

/** Multi-line sample the paragraph tab starts from. */
export const paragraphText =
  'حروف، پیش از آنکه خوانده شوند، دیده می‌شوند. چشم خواننده در یک نگاه شکل کلمه را می‌گیرد و ذهن، معنا را از میان فاصله‌ها، اتصال‌ها و ریتم سطرها بیرون می‌کشد. اگر فاصله‌ی میان کلمات کمی بیشتر یا کمتر از اندازه باشد، یا دندانه‌ها و کشیدگی‌ها هماهنگ نباشند، خواندن کُند می‌شود بی‌آنکه خواننده بداند چرا.\n' +
  'یک فونت خوب در متن بلند خودش را نشان می‌دهد: در پاراگرافی که سطرهایش پشت سر هم می‌آیند، در اعداد ۱۲۳۴۵۶۷۸۹۰ و نشانه‌هایی مثل «»، ؛ و ؟، و در کلماتی که با نیم‌فاصله نوشته می‌شوند مثل می‌روم، خانه‌ها و بزرگ‌تر.';

export const toSingleLine = (text: string) => text.replace(/\s*[\r\n]+\s*/g, ' ');
export const weightsSampleText = 'آبشار وزن';
export const WEIGHTS_TEXT_MAX = 32;

/**
 * Characters checked for coverage, from the old tester's sample sheet:
 * digits, punctuation, math, currency and ligature marks. Each appears once;
 * «الله» stays whole because it is checked as a ligature.
 */
const builtInCharacters = [
  ...new Set([
    ...Array.from('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩0123456789@#$%^&*!?_-،؛:٭•/|\\۔.{}()[]«»+−×÷=√¦٫٬,€﷼٪﴾﴿۝ﷲ'),
    'الله',
  ]),
];

/** Language sheets from the old tester; only each sheet's text is editable. */
export const languageSheets = [
  { id: 'arabic', title: 'عربی', lang: 'ar' },
  { id: 'quran', title: 'قرآن', lang: 'ar' },
  { id: 'urdu', title: 'اردو', lang: 'ur' },
  { id: 'kurdish', title: 'کردی', lang: 'ckb' },
] as const;
export type LanguageId = (typeof languageSheets)[number]['id'];

const languageTexts: Record<LanguageId, string> = {
  arabic:
    'أَبْجَدِيَّةُ اللُّغَةِ العَرَبِيَّةِ تَضُمُّ جَمِيعَ الحُرُوفِ: أ ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن هـ و ي. كَتَبَ الأُسْتَاذُ: «هَلْ قَرَأْتَ النَّصَّ الجَدِيدَ؟» فَأَجَابَ الطَّالِبُ: نَعَمْ، قَرَأْتُهُ فِي عَامِ ٢٠٢٦، وَكَانَ سِعْرُهُ ١٢٣٫٤٥ ر.س، أَوْ 123.45. كما يَحْتَوِي عَلَى الرُّمُوزِ: ! ؟ ، ؛ : .',
  quran:
    'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ ١ ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ ٢ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ ٣ مَـٰلِكِ يَوْمِ ٱلدِّينِ ٤ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ٥ ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ ٦ صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ ٧',
  urdu: 'اُردو زبان کے تمام حروف اور علامات کی جانچ کے لیے یہ نمونہ متن تیار کیا گیا ہے۔ احمد نے کہا: \"کیا آپ نے نیا مضمون پڑھا؟\" فاطمہ نے جواب دیا: \"جی ہاں، میں نے اسے ۲۰۲۶ء میں پڑھا تھا، اور اُس کی قیمت ۱۲۳٫۴۵ روپے تھی۔\" اس متن میں مختلف اعراب، رموزِ اوقاف، اعداد، اور علامات شامل ہیں: ! ؟ ، ؛ : ۔',
  kurdish:
    'زمانی کوردی زمانێکی دەوڵەمەندە و بە پیتی جیاواز نووسراوە. ئارام وتی: «ئایا ئەم دەقە نوێیەت خوێندووەتەوە؟» ئاوات وەڵامی دایەوە: «بەڵێ، لە ساڵی ٢٠٢٦ خوێندمەوە و نرخەکەی ١٢٣٫٤٥ دۆلار بوو.» ئەم دەقە هەموو پیت و هێما گرنگەکان تاقی دەکات: ! ؟ ، ؛',
};

/** ZWNJ words, one per line; the joined and spaced columns are derived from them. */
const zwnjPersian = [
  'می\u200cروم',
  'خانه\u200cها',
  'نوشته\u200cاند',
  'بزرگ\u200cتر',
  'هم\u200cزمان',
  'بی\u200cنظیر',
];
/** Arabic compounds that are written both joined and apart. */
const zwnjArabic = ['عبد\u200cالله', 'إن\u200cشاء\u200cالله', 'عبد\u200cالرحمن'];

/** Per field; keeps every text together under the server's 64 KB request limit. */
export const TEXT_MAX = 3000;
const line = z.string().max(TEXT_MAX);
export const textsSchema = z.strictObject({
  typingTest: line.default(toSingleLine(sampleText)),
  liveTyping: line.default(toSingleLine(sampleText)),
  paragraph: line.default(paragraphText),
  /** The short editable sample for the weight-overlay tab. */
  weights: z.string().max(WEIGHTS_TEXT_MAX).default(weightsSampleText),
  languages: z
    .strictObject(
      Object.fromEntries(
        languageSheets.map(({ id }) => [id, line.default(languageTexts[id])]),
      ) as Record<LanguageId, z.ZodDefault<z.ZodString>>,
    )
    .default(() => ({ ...languageTexts })),
  /** Characters to check, separated by spaces; a run like «الله» stays one cell. */
  characters: line.default(builtInCharacters.join(' ')),
  zwnjPersian: line.default(zwnjPersian.join('\n')),
  zwnjArabic: line.default(zwnjArabic.join('\n')),
});
export type DefaultTexts = z.infer<typeof textsSchema>;

export function createFactoryTexts(): DefaultTexts {
  return textsSchema.parse({});
}

/** Unique, space-separated character cells. */
export function parseCharacters(text: string): string[] {
  return [...new Set(text.split(/\s+/).filter(Boolean))];
}

/** Each line is one word written with ZWNJ: [with ZWNJ, joined, with a space]. */
export function parseZwnjWords(text: string): [string, string, string][] {
  return text
    .split(/\r?\n/)
    .map((word) => word.trim())
    .filter(Boolean)
    .map((word) => [word, word.replace(/\u200c/g, ''), word.replace(/\u200c/g, ' ')]);
}
