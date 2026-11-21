import { z } from 'zod';
import { builtInTexts, type HardPhrase } from './built-in';

/**
 * Editable sample content for the text tabs. The built-in values live in
 * settings.json at the project root; a copy saved in the browser replaces them
 * (Settings → default content).
 */

export const toSingleLine = (text: string) => text.replace(/\s*[\r\n]+\s*/g, ' ');
export const WEIGHTS_TEXT_MAX = 32;

/** Language sheets; only each sheet's text is editable. First cards are Farsi then English. */
export const languageSheets = [
  { id: 'farsi', title: 'فارسی', lang: 'fa', dir: 'rtl' },
  { id: 'english', title: 'انگلیسی', lang: 'en', dir: 'ltr' },
  { id: 'arabic', title: 'عربی', lang: 'ar', dir: 'rtl' },
  { id: 'quran', title: 'قرآن', lang: 'ar', dir: 'rtl' },
  { id: 'urdu', title: 'اردو', lang: 'ur', dir: 'rtl' },
  { id: 'kurdish', title: 'کردی', lang: 'ckb', dir: 'rtl' },
] as const;
export type LanguageId = (typeof languageSheets)[number]['id'];
export type { HardPhrase };

/** Per field; keeps every text together well inside a browser's localStorage quota. */
export const TEXT_MAX = 3000;
const line = z.string().max(TEXT_MAX);
const phrase = z.strictObject({
  text: line,
  /** Shown under the sample in the UI font; may add a short note. */
  reference: line,
});
const languageTexts = builtInTexts.languages as Record<LanguageId, string>;

/** Older saves stored phrases as one newline-joined string; lift those to objects. */
function coerceHardPhrases(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return parseLines(value).map((text) => ({ text, reference: text }));
}

/** Fields missing from a payload (saved by an older version) take settings.json's text. */
export const textsSchema = z.strictObject({
  typingTest: line.default(builtInTexts.typingTest),
  paragraph: line.default(builtInTexts.paragraph),
  /** The short editable sample for the weight-overlay tab. */
  weights: z.string().max(WEIGHTS_TEXT_MAX).default(builtInTexts.weights),
  languages: z
    .strictObject(
      Object.fromEntries(
        languageSheets.map(({ id }) => [id, line.default(languageTexts[id])]),
      ) as Record<LanguageId, z.ZodDefault<z.ZodString>>,
    )
    .default(() => ({ ...languageTexts })),
  /** Characters to check, separated by spaces; a run like «الله» stays one cell. */
  characters: line.default(builtInTexts.characters),
  /** Difficult words, one per line (grid cards). */
  hardWords: line.default(builtInTexts.hardWords),
  /** Full-width عبارت cards: sample text plus a separate reference/note line. */
  hardPhrases: z.preprocess(
    coerceHardPhrases,
    z.array(phrase).default(() => structuredClone(builtInTexts.hardPhrases)),
  ),
});
export type DefaultTexts = z.infer<typeof textsSchema>;

export function createFactoryTexts(): DefaultTexts {
  return textsSchema.parse({});
}

/** Unique, space-separated character cells. */
export function parseCharacters(text: string): string[] {
  return [...new Set(text.split(/\s+/).filter(Boolean))];
}

/** Non-empty lines, trimmed. */
export function parseLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Pair phrase lines with reference lines (missing refs reuse the phrase). */
export function pairHardPhrases(texts: string, references: string): HardPhrase[] {
  const refs = parseLines(references);
  return parseLines(texts).map((text, i) => ({
    text,
    reference: refs[i] ?? text,
  }));
}
