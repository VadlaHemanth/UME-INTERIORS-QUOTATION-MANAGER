import { emptyState, type StudioState } from './routes';
import type { StateStore } from './api';

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
}
export interface StudioDatabase {
  prepare(sql: string): D1Statement;
  batch(statements: D1Statement[]): Promise<Array<{ meta: { changes: number } }>>;
}

function records(state: StudioState): Map<string, string> {
  const entries: Array<[string, string]> = [
    ['catalogue', JSON.stringify(state.catalogue)],
    ['auth', JSON.stringify({ owner: state.owner, loginAttempts: state.loginAttempts || {} })],
    ...state.quotes.map((value): [string, string] => [`quote:${value.publicId}`, JSON.stringify(value)]),
    ...state.ledger.map((value): [string, string] => [`payment:${value.id}`, JSON.stringify(value)]),
  ];
  return new Map(entries);
}

export class D1StateStore implements StateStore {
  private previous = new Map<string, string>();
  constructor(private db: StudioDatabase) {}

  async load(): Promise<{ state: StudioState; version: number }> {
    const result = await this.db.prepare('SELECT r.record_key, r.json_data, m.version FROM studio_runtime_meta m LEFT JOIN studio_runtime_records r ON 1=1 WHERE m.id = 1').all<{ record_key: string | null; json_data: string | null; version: number }>();
    const state = emptyState();
    this.previous = new Map();
    for (const row of result.results) {
      if (!row.record_key || !row.json_data) continue;
      this.previous.set(row.record_key, row.json_data);
      const value = JSON.parse(row.json_data);
      if (row.record_key === 'catalogue') state.catalogue = value;
      if (row.record_key === 'auth') { state.owner = value.owner; state.loginAttempts = value.loginAttempts; }
      if (row.record_key.startsWith('quote:')) state.quotes.push(value);
      if (row.record_key.startsWith('payment:')) state.ledger.push(value);
    }
    return { state, version: result.results[0]?.version || 0 };
  }

  async save(state: StudioState, expectedVersion: number): Promise<boolean> {
    const next = records(state);
    const statements: D1Statement[] = [];
    for (const [key, data] of next) {
      if (this.previous.get(key) === data) continue;
      statements.push(this.db.prepare('INSERT INTO studio_runtime_records (record_key, json_data) SELECT ?, ? WHERE (SELECT version FROM studio_runtime_meta WHERE id = 1) = ? ON CONFLICT(record_key) DO UPDATE SET json_data = excluded.json_data').bind(key, data, expectedVersion));
    }
    for (const key of this.previous.keys()) if (!next.has(key)) statements.push(this.db.prepare('DELETE FROM studio_runtime_records WHERE record_key = ? AND (SELECT version FROM studio_runtime_meta WHERE id = 1) = ?').bind(key, expectedVersion));
    statements.push(this.db.prepare('UPDATE studio_runtime_meta SET version = version + 1 WHERE id = 1 AND version = ?').bind(expectedVersion));
    // D1 batches commit atomically; a stale version makes every statement a no-op.
    const result = await this.db.batch(statements);
    return result.at(-1)?.meta.changes === 1;
  }
}
