import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { SettingsRepository } from '../server/settings-repository';
import { handleSettingsApi } from '../server/settings-api';
import { createFactoryDefaults } from '../shared/settings';

test('SQLite round trip persists only validated defaults across connections', () => {
  const folder = mkdtempSync(join(tmpdir(), 'font-desk-test-'));
  const file = join(folder, 'settings.sqlite');
  const repository = new SettingsRepository(file);
  const defaults = createFactoryDefaults();
  defaults.theme = 'dark';
  defaults.tabs.connections.controls.fontSize = 44;
  repository.save(defaults);
  assert.throws(() => repository.save({ ...defaults, fontBytes: [1, 2, 3] }));
  repository.close();
  const reopened = new SettingsRepository(file);
  try {
    assert.deepEqual(reopened.read(), defaults);
  } finally {
    reopened.close();
    rmSync(folder, { recursive: true });
  }
});

test('settings API enforces same-origin, rejects malformed/session payloads, and saves valid defaults', async () => {
  const repository = new SettingsRepository(':memory:');
  const server = createServer((request, response) => {
    void handleSettingsApi(request, response, repository);
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No server address');
  const origin = `http://127.0.0.1:${address.port}`;
  const defaults = createFactoryDefaults();
  defaults.theme = 'dark';
  const save = (body: string, from = origin, type = 'application/json') =>
    fetch(origin, { method: 'PUT', headers: { Origin: from, 'Content-Type': type }, body });
  try {
    assert.equal((await save(JSON.stringify(defaults), 'https://example.com')).status, 403);
    assert.equal((await save('{broken')).status, 400);
    assert.equal((await save(JSON.stringify({ ...defaults, fonts: [] }))).status, 400);
    assert.equal((await save(JSON.stringify(defaults), origin, 'text/plain')).status, 415);
    assert.equal((await save('x'.repeat(70 * 1024))).status, 413);
    assert.equal(repository.read().theme, 'light');
    assert.equal((await save(JSON.stringify(defaults))).status, 200);
    assert.equal((await (await fetch(origin)).json()).theme, 'dark');
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    repository.close();
  }
});

test('only loopback and explicitly configured hosts are allowed', async () => {
  const { allowedHosts, isAllowedHost } = await import('../server/settings-api');
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
  const { normalizeDefaults } = await import('../shared/settings');
  const { createFactoryTexts, parseCharacters, parseZwnjWords, TEXT_MAX } =
    await import('../shared/texts');
  // A payload saved before texts existed (like the test server's) still loads.
  const legacy = createFactoryDefaults() as Partial<ReturnType<typeof createFactoryDefaults>>;
  delete legacy.texts;
  assert.deepEqual(normalizeDefaults(legacy).texts, createFactoryTexts());
  // Edited texts are kept.
  const defaults = createFactoryDefaults();
  defaults.texts.typingTest = 'سلام';
  defaults.texts.languages.urdu = 'اردو';
  const repository = new SettingsRepository(':memory:');
  try {
    repository.save(defaults);
    assert.equal(repository.read().texts.typingTest, 'سلام');
    assert.equal(repository.read().texts.languages.urdu, 'اردو');
    // Unknown text keys and oversized texts are rejected.
    assert.throws(() =>
      repository.save({ ...defaults, texts: { ...defaults.texts, weights: 'x' } }),
    );
    assert.throws(() =>
      repository.save({
        ...defaults,
        texts: { ...defaults.texts, characters: 'x'.repeat(TEXT_MAX + 1) },
      }),
    );
  } finally {
    repository.close();
  }
  // Every field at its limit still fits the server's 64 KB request limit.
  const full = createFactoryDefaults();
  const big = 'ب'.repeat(TEXT_MAX);
  full.texts = {
    typingTest: big,
    liveTyping: big,
    languages: { arabic: big, quran: big, urdu: big, kurdish: big },
    characters: big,
    zwnjPersian: big,
    zwnjArabic: big,
  };
  assert.ok(Buffer.byteLength(JSON.stringify(full)) < 64 * 1024);
  // Parsing helpers.
  assert.deepEqual(parseCharacters(' ۱  ۲\nالله ۱ '), ['۱', '۲', 'الله']);
  assert.deepEqual(parseZwnjWords('می‌روم\n\n  هم‌زمان '), [
    ['می‌روم', 'میروم', 'می روم'],
    ['هم‌زمان', 'همزمان', 'هم زمان'],
  ]);
});
