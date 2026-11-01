-- Cloudflare D1 Schema Migration 0001_init.sql for UME Interiors Quotation Studio (umeinteriors.com)
CREATE TABLE IF NOT EXISTS published_quotations (
  public_id TEXT PRIMARY KEY,
  quote_number TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  previous_public_id TEXT,
  superseded_by_public_id TEXT,
  customer_name TEXT NOT NULL,
  site_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Sent',
  catalogue_version TEXT NOT NULL,
  draft_json TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  selection_json TEXT NOT NULL,
  approved_discount_rupees INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TEXT,
  published_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quotes_number ON published_quotations(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON published_quotations(status);

CREATE TABLE IF NOT EXISTS payment_ledger (
  id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL,
  quote_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  revision INTEGER NOT NULL,
  selected_package_label TEXT NOT NULL,
  amount_rupees INTEGER NOT NULL,
  method TEXT NOT NULL,
  utr_reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'Payment submitted',
  submitted_at TEXT NOT NULL,
  verified_at TEXT,
  rejection_reason TEXT,
  FOREIGN KEY (public_id) REFERENCES published_quotations(public_id)
);
