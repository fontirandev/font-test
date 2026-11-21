import file from '../settings.json';
import { tabIds } from './tabs';

/**
 * settings.json is written by hand, so it is kept short:
 * - `controls` sets controls for every tab at once (e.g. the shared font size).
 * - `tabs` lists only what differs per tab; it wins over `controls`. Missing tabs and
 *   controls take the schema defaults.
 * - `paragraph` and `hardWords` may be lists, one item per line.
 * - `hardPhrases` is a list of `{ text, reference }` (or a plain string that fills both).
 * - `version` is implied.
 * This module expands it to the stored-defaults shape. A misspelled tab name fails
 * here by name instead of being silently dropped; the schema catches the rest.
 */

export type HardPhrase = { text: string; reference: string };
export type BuiltInTexts = {
  typingTest: string;
  paragraph: string;
  weights: string;
  languages: Record<string, string>;
  characters: string;
  hardWords: string;
  hardPhrases: HardPhrase[];
};

function invalid(message: string): never {
  throw new Error(`settings.json: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function joinLines(value: unknown, field: string): unknown {
  if (Array.isArray(value)) {
    if (!value.every((item) => typeof item === 'string'))
      invalid(`texts.${field} must be text or a list of texts`);
    return (value as string[]).join('\n');
  }
  return value;
}

/** Accept `{ text, reference }`, or a plain string that fills both fields. */
function expandHardPhrases(value: unknown): HardPhrase[] {
  if (!Array.isArray(value)) invalid('texts.hardPhrases must be a list');
  return value.map((item, index) => {
    if (typeof item === 'string') {
      const text = item.trim();
      if (!text) invalid(`texts.hardPhrases[${index}] must not be empty`);
      return { text, reference: text };
    }
    if (!isRecord(item) || typeof item.text !== 'string')
      invalid(`texts.hardPhrases[${index}] must be text or { text, reference }`);
    const text = item.text.trim();
    if (!text) invalid(`texts.hardPhrases[${index}].text must not be empty`);
    const reference =
      typeof item.reference === 'string' && item.reference.trim()
        ? item.reference.trim()
        : text;
    return { text, reference };
  });
}

/** A settings.json document in the full stored-defaults shape, before schema validation. */
export function expandSettingsFile(input: unknown): Record<string, unknown> {
  if (!isRecord(input)) invalid('must be a JSON object');
  const tabs = input.tabs ?? {};
  if (!isRecord(tabs)) invalid('"tabs" must be an object');
  for (const id of Object.keys(tabs)) {
    if (!(tabIds as readonly string[]).includes(id))
      invalid(`unknown tab "${id}". Tabs are: ${tabIds.join(', ')}`);
  }
  const shared = input.controls ?? {};
  if (!isRecord(shared)) invalid('"controls" must be an object');
  const texts = input.texts;
  if (!isRecord(texts)) invalid('"texts" must be an object');
  const { controls: _shared, ...rest } = input;
  return structuredClone({
    version: 1,
    ...rest,
    tabs: Object.fromEntries(
      tabIds.map((id) => {
        const tab = tabs[id] ?? {};
        if (!isRecord(tab)) invalid(`tabs.${id} must be an object`);
        const own = tab.controls ?? {};
        if (!isRecord(own)) invalid(`tabs.${id}.controls must be an object`);
        return [id, { ...tab, controls: { ...shared, ...own } }];
      }),
    ),
    texts: {
      ...texts,
      paragraph: joinLines(texts.paragraph, 'paragraph'),
      hardWords: joinLines(texts.hardWords, 'hardWords'),
      hardPhrases: expandHardPhrases(texts.hardPhrases),
    },
  });
}

/** The project's settings.json, expanded. The schema in settings.ts validates it. */
export const builtInFile = expandSettingsFile(file);
export const builtInTexts = builtInFile.texts as BuiltInTexts;
