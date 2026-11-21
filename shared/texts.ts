import { z } from 'zod';
import { builtInTexts } from './built-in';

/**
 * Editable sample content for the text tabs. The built-in values live in
 * settings.json at the project root; a copy saved in the browser replaces them
 * (Settings → default content).
 */

export const toSingleLine = (text: string) => text.replace(/\s*[\r\n]+\s*/g, ' ');
export const WEIGHTS_TEXT_MAX = 32;

/** Language sheets from the old tester; only each sheet's text is editable. */
export const languageSheets = [
  { id: 'arabic', title: 'عربی', lang: 'ar' },
  { id: 'quran', title: 'قرآن', lang: 'ar' },
  { id: 'urdu', title: 'اردو', lang: 'ur' },
  { id: 'kurdish', title: 'کردی', lang: 'ckb' },
] as const;
export type LanguageId = (typeof languageSheets)[number]['id'];

/** The ZWNJ word shown, three ways, under the characters sheet. */
export const zwnjSample = 'می\u200cروم';

/** Per field; keeps every text together well inside a browser's localStorage quota. */
export const TEXT_MAX = 3000;
const line = z.string().max(TEXT_MAX);
const languageTexts = builtInTexts.languages as Record<LanguageId, string>;
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
  /** Difficult words or phrases, one per line. */
  hardWords: line.default(builtInTexts.hardWords),
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

/** A ZWNJ word written [with ZWNJ, joined, with a space]. */
export function zwnjForms(word: string): [string, string, string] {
  return [word, word.replace(/\u200c/g, ''), word.replace(/\u200c/g, ' ')];
}
