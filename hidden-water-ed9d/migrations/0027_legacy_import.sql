-- Read-only history imported from the old Access database (KIT Base.accdb), last year of sales.
-- Kept apart from invoices / customers / products: Access lines are free text with units
-- (dozen, roll, pack), no product ids and no price levels, so they do not fit those tables.
-- No foreign keys to products. Rows are never deleted by the app (no delete route); the
-- loader uses INSERT OR IGNORE so running it twice adds nothing.
-- Additive only: new tables and indexes. Safe to run twice.
-- Apply with `wrangler d1 execute product-db --remote --file=migrations/0027_legacy_import.sql`.

CREATE TABLE IF NOT EXISTS legacy_customers (
  id TEXT PRIMARY KEY,                 -- 'LC-<Access CustomerID>'
  access_ref TEXT NOT NULL UNIQUE,     -- Access CustomerID
  name TEXT NOT NULL,                  -- Customers.Name, the name sales rows use
  code_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  province TEXT,
  tax_id TEXT,
  vat_name TEXT,
  branch TEXT,
  transport TEXT,
  -- Access LINEid holds labels such as "LINE Official", not LINE ids, so it is only a note.
  line_note TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (status IN ('unverified','confirmed','merged','archived')),
  merged_into TEXT,
  imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_legacy_customers_name ON legacy_customers(name);

CREATE TABLE IF NOT EXISTS legacy_products (
  id TEXT PRIMARY KEY,                 -- 'LP-<n>'
  access_ref TEXT NOT NULL UNIQUE,     -- Access s_GUID
  code_name TEXT,
  name TEXT NOT NULL,
  group_name TEXT,                     -- Access VatName, e.g. "ริบบิ้น - ซาติน"
  unit TEXT,
  cost REAL,
  price_1 REAL, price_2 REAL, price_3 REAL, price_4 REAL,   -- reference only, never billed from
  on_sell INTEGER NOT NULL DEFAULT 1,
  note TEXT
);
CREATE INDEX IF NOT EXISTS idx_legacy_products_name ON legacy_products(name);

CREATE TABLE IF NOT EXISTS legacy_invoices (
  id TEXT PRIMARY KEY,                 -- 'LI-<OrderNo>-<yyyymmdd>-<n>'
  order_no TEXT NOT NULL,
  customer_id TEXT,                    -- NULL when the name is unmatched or ambiguous
  customer_name TEXT NOT NULL,         -- snapshot of the name typed in Access
  sold_on TEXT NOT NULL,               -- YYYY-MM-DD
  paid INTEGER NOT NULL DEFAULT 0,
  access_type TEXT,                    -- Order / Adm / Base / User
  vat_bill_no TEXT,
  total REAL NOT NULL DEFAULT 0,
  line_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE (order_no, customer_name, sold_on)
);
CREATE INDEX IF NOT EXISTS idx_legacy_invoices_sold_on ON legacy_invoices(sold_on);
CREATE INDEX IF NOT EXISTS idx_legacy_invoices_customer ON legacy_invoices(customer_id);

CREATE TABLE IF NOT EXISTS legacy_invoice_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  access_id INTEGER NOT NULL,          -- Sell Transection.ID; Access reuses these across orders, so not unique
  invoice_id TEXT NOT NULL,
  line_no INTEGER NOT NULL,
  product_name TEXT NOT NULL,          -- exactly as typed in Access (trimmed)
  unit TEXT,
  qty REAL NOT NULL,
  unit_price REAL NOT NULL,
  line_total REAL NOT NULL,
  line_kind TEXT NOT NULL DEFAULT 'product' CHECK (line_kind IN ('product','adjustment')),
  paid INTEGER NOT NULL DEFAULT 0,
  legacy_product_id TEXT,              -- only on an exact, unique name match
  UNIQUE (invoice_id, line_no),
  FOREIGN KEY (invoice_id) REFERENCES legacy_invoices(id)
);
CREATE INDEX IF NOT EXISTS idx_legacy_lines_invoice ON legacy_invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_legacy_lines_product ON legacy_invoice_lines(legacy_product_id);
