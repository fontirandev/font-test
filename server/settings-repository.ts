import { DatabaseSync } from 'node:sqlite';
import { createFactoryDefaults, normalizeDefaults, type AppDefaults } from '../shared/settings';

/** SQLite stores a single versioned defaults document; no font data reaches this layer. */
export class SettingsRepository {
  private readonly database: DatabaseSync;

  constructor(path: string) {
    this.database = new DatabaseSync(path);
    this.database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS app_defaults (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        schema_version INTEGER NOT NULL,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  read(): AppDefaults {
    const row = this.database.prepare('SELECT payload FROM app_defaults WHERE id = 1').get();
    if (!row) return createFactoryDefaults();
    // Invalid or future data is surfaced to the caller, never silently overwritten.
    return normalizeDefaults(JSON.parse(String(row.payload)));
  }

  save(input: unknown): AppDefaults {
    const defaults = normalizeDefaults(input);
    this.database
      .prepare(
        `
      INSERT INTO app_defaults (id, schema_version, payload) VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        schema_version = excluded.schema_version,
        payload = excluded.payload,
        updated_at = CURRENT_TIMESTAMP
    `,
      )
      .run(defaults.version, JSON.stringify(defaults));
    return defaults;
  }

  close(): void {
    this.database.close();
  }
}
