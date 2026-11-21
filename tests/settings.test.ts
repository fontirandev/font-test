import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createFactoryDefaults,
  normalizeDefaults,
  parseSettingsFile,
  tabDefaultsSchema,
} from '../shared/settings';
import { tabIds } from '../shared/tabs';
import { loadDefaults, saveDefaults } from '../src/lib/defaults-client';

const KEY = 'font-desk-defaults-v1';

/** Runs `body` against an in-memory localStorage; `blocked` makes every access throw. */
function withStorage(body: (memory: Map<string, string>) => void, blocked = false) {
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const memory = new Map<string, string>();
  const guard = <T>(run: () => T) => {
    if (blocked) throw new Error('storage disabled');
    return run();
  };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => guard(() => memory.get(key) ?? null),
      setItem: (key: string, value: string) => guard(() => memory.set(key, value)),
      removeItem: (key: string) => guard(() => memory.delete(key)),
    },
  });
  try {
    body(memory);
  } finally {
    if (saved) Object.defineProperty(globalThis, 'localStorage', saved);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  }
}

test('settings.json lists only overrides and expands to the full built-in defaults', () => {
  const file = JSON.parse(readFileSync(new URL('../settings.json', import.meta.url), 'utf8'));
  const defaults = createFactoryDefaults();
  assert.deepEqual(parseSettingsFile(file), defaults);
  // Tabs left out of the file take the schema defaults plus the shared `controls`.
  const listed = new Set(Object.keys(file.tabs));
  for (const id of tabIds) {
    if (listed.has(id)) continue;
    assert.deepEqual(defaults.tabs[id], tabDefaultsSchema.parse({ controls: file.controls }), id);
  }
  // List fields are joined one item per line.
  assert.equal(defaults.texts.hardWords, file.texts.hardWords.join('\n'));
  assert.deepEqual(defaults.texts.hardPhrases, file.texts.hardPhrases);
  assert.equal(defaults.texts.paragraph, file.texts.paragraph.join('\n'));
  // Each call is a fresh copy: changing one never changes the built-in defaults.
  const copy = createFactoryDefaults();
  copy.texts.typingTest = 'x';
  copy.tabs.paragraph.controls.fontSize = 99;
  assert.deepEqual(createFactoryDefaults(), defaults);
});

test('controls in settings.json apply to every tab, and a tab entry wins', () => {
  const file = JSON.parse(readFileSync(new URL('../settings.json', import.meta.url), 'utf8'));
  const parsed = parseSettingsFile({
    ...file,
    controls: { fontSize: 36 },
    tabs: { connections: { controls: { fontSize: 72 } } },
  });
  for (const id of tabIds) {
    assert.equal(parsed.tabs[id].controls.fontSize, id === 'connections' ? 72 : 36, id);
  }
  // Without the block, the schema's own default applies.
  const { controls: _, ...withoutControls } = file;
  assert.equal(parseSettingsFile(withoutControls).tabs.paragraph.controls.fontSize, 48);
});

test('mistakes in settings.json are reported with what and where', () => {
  const file = JSON.parse(readFileSync(new URL('../settings.json', import.meta.url), 'utf8'));
  const fails = (change: Record<string, unknown>, message: RegExp) =>
    assert.throws(() => parseSettingsFile({ ...structuredClone(file), ...change }), message);
  fails({ tabs: { charcters: {} } }, /unknown tab "charcters"/);
  fails(
    { tabs: { paragraph: { controls: { fontsize: 30 } } } },
    /"fontsize"[\s\S]*tabs\.paragraph\.controls/,
  );
  fails(
    { tabs: { paragraph: { controls: { lineHeight: 9 } } } },
    /tabs\.paragraph\.controls\.lineHeight/,
  );
  fails({ theme: 'blue' }, /at theme/);
  fails({ controls: { fontSize: 500 } }, /at controls\.fontSize/);
  fails({ controls: { size: 30 } }, /"size"[\s\S]*at controls/);
  fails({ texts: { ...file.texts, hardWords: ['a', 1] } }, /texts\.hardWords/);
  fails({ texts: { ...file.texts, weights: 'x'.repeat(40) } }, /texts\.weights/);
  // Plain strings still work for the list fields.
  const strings = { ...file.texts, hardWords: 'a\nb', paragraph: 'p' };
  assert.equal(parseSettingsFile({ ...file, texts: strings }).texts.hardWords, 'a\nb');
});

test("a user's defaults live in localStorage on top of settings.json", () => {
  withStorage((memory) => {
    assert.deepEqual(loadDefaults(), createFactoryDefaults());
    const defaults = createFactoryDefaults();
    defaults.texts.typingTest = 'سلام';
    defaults.tabs['typing-test'].controls.fontSize = 44;
    saveDefaults(defaults);
    assert.deepEqual(loadDefaults(), defaults);
    // Session data never gets in.
    assert.throws(() => saveDefaults({ ...defaults, fontBytes: [1, 2, 3] } as never));
    assert.deepEqual(loadDefaults(), defaults);
    // Resetting the texts and saving leaves no copy behind, whatever the theme.
    saveDefaults({ ...createFactoryDefaults(), theme: 'dark' });
    assert.equal(memory.has(KEY), false);
    // A corrupt or tampered copy falls back to settings.json.
    memory.set(KEY, '{broken');
    assert.deepEqual(loadDefaults(), createFactoryDefaults());
    memory.set(KEY, JSON.stringify({ ...defaults, fonts: [] }));
    assert.deepEqual(loadDefaults(), createFactoryDefaults());
  });
});

test('blocked browser storage still loads settings.json and reports a failed save', () => {
  withStorage(() => {
    assert.deepEqual(loadDefaults(), createFactoryDefaults());
    assert.throws(() => saveDefaults(createFactoryDefaults()), /ذخیره/);
  }, true);
});

test('only loopback and explicitly configured hosts are allowed', async () => {
  const { allowedHosts, isAllowedHost } = await import('../server/hosts');
  const hosts = allowedHosts(8030, ' 203.0.113.5:8030 , Fonts.Example.com ');
  const request = (host?: string) => ({ headers: { host } }) as never;
  assert.ok(isAllowedHost(request('localhost:8030'), hosts));
  assert.ok(isAllowedHost(request('203.0.113.5:8030'), hosts));
  assert.ok(isAllowedHost(request('fonts.example.com'), hosts));
  assert.equal(isAllowedHost(request('203.0.113.5:9999'), hosts), false);
  assert.equal(isAllowedHost(request('evil.example'), hosts), false);
  assert.equal(isAllowedHost(request(undefined), hosts), false);
  assert.equal(allowedHosts(8030).size, 2);
});

test('default texts: old payloads get the built-in texts, saved texts survive a round trip', async () => {
  const { createFactoryTexts, parseCharacters, parseLines, TEXT_MAX } =
    await import('../shared/texts');
  // A payload saved before texts existed (like the test server's) still loads.
  const legacy = createFactoryDefaults() as Partial<ReturnType<typeof createFactoryDefaults>>;
  delete legacy.texts;
  assert.deepEqual(normalizeDefaults(legacy).texts, createFactoryTexts());
  // Edited texts are kept.
  const defaults = createFactoryDefaults();
  defaults.texts.typingTest = 'سلام';
  defaults.texts.weights = 'وزن نمونه';
  defaults.texts.languages.urdu = 'اردو';
  assert.deepEqual(normalizeDefaults(structuredClone(defaults)).texts, defaults.texts);
  // Unknown text keys and oversized texts are rejected.
  assert.throws(() =>
    normalizeDefaults({ ...defaults, texts: { ...defaults.texts, unknown: 'x' } }),
  );
  assert.throws(() =>
    normalizeDefaults({
      ...defaults,
      texts: { ...defaults.texts, characters: 'x'.repeat(TEXT_MAX + 1) },
    }),
  );
  // Every field at its limit stays small next to a browser's localStorage quota.
  const full = createFactoryDefaults();
  const big = 'ب'.repeat(TEXT_MAX);
  full.texts = {
    typingTest: big,
    paragraph: big,
    weights: 'ب'.repeat(32),
    languages: {
      farsi: big,
      english: big,
      arabic: big,
      quran: big,
      urdu: big,
      kurdish: big,
    },
    characters: big,
    hardWords: big,
    hardPhrases: [{ text: big, reference: big }],
  };
  // Six language sheets and phrase objects still leave a small defaults document.
  assert.ok(Buffer.byteLength(JSON.stringify(full)) < 128 * 1024);
  // Parsing helpers.
  assert.deepEqual(parseCharacters(' ۱  ۲\nالله ۱ '), ['۱', '۲', 'الله']);
  assert.deepEqual(parseLines('گنجشکک\n\n  شستشو '), ['گنجشکک', 'شستشو']);
  // Texts of removed tabs (live typing, ZWNJ sheet) are dropped from old payloads.
  const old = JSON.parse(JSON.stringify(createFactoryDefaults()));
  Object.assign(old.texts, { liveTyping: 'x', zwnjPersian: 'y', zwnjArabic: 'z' });
  assert.deepEqual(normalizeDefaults(old).texts, createFactoryTexts());
});
