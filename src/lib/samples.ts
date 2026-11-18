export const persianAlphabet = Array.from('اآبپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی');

/** Letters that never join the letter after them (they have no initial or medial form). */
const rightJoiningOnly = new Set(Array.from('اآأإدذرزژوؤء'));
const joinsNext = (ch: string) => !rightJoiningOnly.has(ch);
/** Kashida: a neutral joiner for when neither letter can join the one after it. */
const tatweel = '\u0640';

/**
 * Every way `letter` and `other` can meet, for checking kerning: `letter` alone,
 * then each order of the two (letter–other, other–letter) with the first one at a
 * word start or mid-word, and the second at a word end or mid-word. Fillers come
 * from the two letters themselves where they can join, so with ج and ب this is
 * ج جب بجب جبج بجبج جبجب بج.
 */
export function kerningForms(letter: string, other: string): string[] {
  const contexts = (first: string, second: string) => {
    // A joiner before `first` puts it mid-word (or in its final form if it never joins on).
    const before = joinsNext(second) ? second : joinsNext(first) ? first : tatweel;
    // Something after `second` only changes its shape if `second` joins on.
    const after = joinsNext(second) ? first : null;
    return {
      plain: first + second,
      before: before + first + second,
      after: after === null ? null : first + second + after,
      both: after === null ? null : before + first + second + after,
    };
  };
  const forward = contexts(letter, other);
  const backward = contexts(other, letter);
  const forms = [
    letter,
    forward.plain,
    forward.before,
    forward.after,
    forward.both,
    backward.both,
    backward.before,
    backward.after,
    backward.plain,
  ];
  // Contexts of one order often double as the other's (بجب is both); keep each once.
  return [...new Set(forms.filter((form): form is string => form !== null))];
}

/** A diacritic (or a stack of them) the kerning tab can put on every letter. */
export interface KerningMark {
  id: string;
  /** The combining mark(s), in typing order. */
  marks: string;
  name: string;
}

/** Diacritics for the kerning tab, grouped for the button rows. */
export const kerningMarkGroups: { id: string; title: string; marks: KerningMark[] }[] = [
  {
    id: 'common',
    title: 'فارسی و عربی',
    marks: [
      { id: 'fatha', marks: '\u064E', name: 'فتحه' },
      { id: 'kasra', marks: '\u0650', name: 'کسره' },
      { id: 'damma', marks: '\u064F', name: 'ضمه' },
      { id: 'fathatan', marks: '\u064B', name: 'تنوین فتح' },
      { id: 'kasratan', marks: '\u064D', name: 'تنوین کسر' },
      { id: 'dammatan', marks: '\u064C', name: 'تنوین ضم' },
      { id: 'shadda', marks: '\u0651', name: 'تشدید' },
      { id: 'sukun', marks: '\u0652', name: 'سکون' },
      // Persian writes the ezafe on ه with it (خانهٔ); Arabic seats hamza with it.
      { id: 'hamza-above', marks: '\u0654', name: 'همزه بالا' },
      { id: 'superscript-alef', marks: '\u0670', name: 'الف بالا' },
    ],
  },
  {
    id: 'arabic',
    title: 'عربی',
    marks: [
      { id: 'maddah', marks: '\u0653', name: 'مد' },
      { id: 'hamza-below', marks: '\u0655', name: 'همزه پایین' },
      { id: 'subscript-alef', marks: '\u0656', name: 'الف پایین' },
      { id: 'inverted-damma', marks: '\u0657', name: 'ضمه وارونه' },
    ],
  },
  {
    id: 'stacked',
    title: 'ترکیبی',
    marks: [
      { id: 'shadda-fatha', marks: '\u0651\u064E', name: 'تشدید + فتحه' },
      { id: 'shadda-kasra', marks: '\u0651\u0650', name: 'تشدید + کسره' },
      { id: 'shadda-damma', marks: '\u0651\u064F', name: 'تشدید + ضمه' },
      { id: 'shadda-fathatan', marks: '\u0651\u064B', name: 'تشدید + تنوین فتح' },
      { id: 'shadda-kasratan', marks: '\u0651\u064D', name: 'تشدید + تنوین کسر' },
      { id: 'shadda-dammatan', marks: '\u0651\u064C', name: 'تشدید + تنوین ضم' },
      { id: 'shadda-superscript-alef', marks: '\u0651\u0670', name: 'تشدید + الف بالا' },
      { id: 'hamza-fatha', marks: '\u0654\u064E', name: 'همزه + فتحه' },
      { id: 'hamza-damma', marks: '\u0654\u064F', name: 'همزه + ضمه' },
      { id: 'hamza-sukun', marks: '\u0654\u0652', name: 'همزه + سکون' },
      { id: 'hamza-below-kasra', marks: '\u0655\u0650', name: 'همزه پایین + کسره' },
    ],
  },
];

/** Puts `marks` after every letter of `text`; a kashida filler stays bare. */
export function withMarks(text: string, marks: string): string {
  if (!marks) return text;
  return Array.from(text, (ch) => (ch === tatweel ? ch : ch + marks)).join('');
}
