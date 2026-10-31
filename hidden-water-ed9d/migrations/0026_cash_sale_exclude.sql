-- Lets staff tag a cash sale as excluded ("void", "test", "entered wrong") without deleting it.
-- The row and its lines stay exactly as saved; excluded_at / exclude_reason only mark it, so
-- the sale can be filtered out (or looked at again) when the sales are validated later.
-- Additive only: two nullable columns. Apply once (SQLite has no ADD COLUMN IF NOT EXISTS):
-- `wrangler d1 execute product-db --remote --file=migrations/0026_cash_sale_exclude.sql`.

-- ISO 8601 UTC of when it was tagged; NULL means the sale counts as normal.
ALTER TABLE cash_sales ADD COLUMN excluded_at TEXT;
ALTER TABLE cash_sales ADD COLUMN exclude_reason TEXT;
