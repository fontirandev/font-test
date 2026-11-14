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
    assert.equal(repository.read().theme, 'system');
    assert.equal((await save(JSON.stringify(defaults))).status, 200);
    assert.equal((await (await fetch(origin)).json()).theme, 'dark');
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    repository.close();
  }
});
