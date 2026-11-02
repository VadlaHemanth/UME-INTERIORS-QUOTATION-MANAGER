-- One row per quotation/payment avoids a growing single-JSON-record size limit.
CREATE TABLE IF NOT EXISTS studio_runtime_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO studio_runtime_meta (id, version) VALUES (1, 0);
CREATE TABLE IF NOT EXISTS studio_runtime_records (
  record_key TEXT PRIMARY KEY,
  json_data TEXT NOT NULL
);
