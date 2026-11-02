import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { D1StateStore, type StudioDatabase } from './d1-store';

function sqliteD1() {
  const database = new DatabaseSync(':memory:');
  database.exec(readFileSync(new URL('../migrations/0001_init.sql', import.meta.url), 'utf8'));
  database.exec(readFileSync(new URL('../migrations/0002_runtime_store.sql', import.meta.url), 'utf8'));
  class Statement {
    private values: any[] = [];
    constructor(private sql: string) {}
    bind(...values: any[]) { this.values = values; return this; }
    async first<T>() { return (database.prepare(this.sql).get(...this.values) || null) as T | null; }
    async all<T>() { return { results: database.prepare(this.sql).all(...this.values) as T[] }; }
    run() { return { meta: { changes: Number(database.prepare(this.sql).run(...this.values).changes) } }; }
  }
  const adapter = {
    prepare(sql: string) { return new Statement(sql); },
    async batch(statements: Statement[]) {
      database.exec('BEGIN');
      try {
        const result = statements.map((statement) => statement.run());
        database.exec('COMMIT');
        return result;
      } catch (error) { database.exec('ROLLBACK'); throw error; }
    },
  };
  return { database, adapter: adapter as StudioDatabase };
}

test('D1 SQL preserves concurrent changes with atomic version checks and reloads persisted data', async () => {
  const { database, adapter } = sqliteD1();
  try {
    const first = new D1StateStore(adapter);
    const second = new D1StateStore(adapter);
    const a = await first.load();
    const b = await second.load();
    assert.equal(a.version, 0);
    assert.equal(a.state.quotes.length, 0);
    a.state.catalogue.version = 'first-edit';
    b.state.catalogue.version = 'stale-edit';
    assert.equal(await first.save(a.state, a.version), true);
    assert.equal(await second.save(b.state, b.version), false);
    const persisted = await new D1StateStore(adapter).load();
    assert.equal(persisted.state.catalogue.version, 'first-edit');
    assert.equal(persisted.version, 1);
    const reloaded = await second.load();
    reloaded.state.catalogue.version = 'reviewed-second-edit';
    assert.equal(await second.save(reloaded.state, reloaded.version), true);
    assert.equal((await new D1StateStore(adapter).load()).state.catalogue.version, 'reviewed-second-edit');
    assert.equal(database.prepare('SELECT COUNT(*) AS total FROM studio_runtime_records').get()!.total, 2);
  } finally { database.close(); }
});
