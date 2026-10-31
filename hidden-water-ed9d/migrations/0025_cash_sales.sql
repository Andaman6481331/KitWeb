-- Walk-in cash sales from the admin Cash Sale page, one row per sale plus one row per line.
-- Separate from pos_orders / pos_order_items, which are left exactly as they were: those
-- rows hold one row per piece and no names that could be analysed, because the types sold
-- here are free text and not products.
-- Rows are never deleted by the app (no ON DELETE CASCADE, no delete route).
-- Additive only: new tables and indexes. Safe to run twice.
-- Apply with `wrangler d1 execute product-db --remote --file=migrations/0025_cash_sales.sql`.

CREATE TABLE IF NOT EXISTS cash_sales (
  id TEXT PRIMARY KEY,
  -- Sent by the page once per sale, so a retried save can't record the sale twice.
  client_id TEXT NOT NULL UNIQUE,
  invoice_ref TEXT NOT NULL UNIQUE,
  -- ISO 8601 UTC, set by the Worker.
  sold_at TEXT NOT NULL,
  total_amount REAL NOT NULL,
  line_count INTEGER NOT NULL,
  piece_count INTEGER NOT NULL,
  -- Cash the customer handed over, when the cashier typed it (NULL otherwise).
  received_amount REAL,
  note TEXT,
  -- Language of the customer copy that was printed: 'th' or 'en'.
  copy_lang TEXT NOT NULL DEFAULT 'th'
);

CREATE INDEX IF NOT EXISTS idx_cash_sales_sold_at ON cash_sales(sold_at);

CREATE TABLE IF NOT EXISTS cash_sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id TEXT NOT NULL,
  line_no INTEGER NOT NULL,
  -- The Thai type name as the cashier chose or typed it.
  name TEXT NOT NULL,
  -- The English name printed on the customer copy, when one is set.
  name_en TEXT,
  unit_price REAL NOT NULL,
  quantity INTEGER NOT NULL,
  line_total REAL NOT NULL,
  -- 1 when the name was typed in as a new product name (not in the page's type list).
  is_custom INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (sale_id) REFERENCES cash_sales(id)
);

CREATE INDEX IF NOT EXISTS idx_cash_sale_items_sale ON cash_sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_cash_sale_items_name ON cash_sale_items(name);
