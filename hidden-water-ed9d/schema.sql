-- Initial schema for products
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL DEFAULT 0.0,
    image_key TEXT,
    category TEXT,
    stock INTEGER DEFAULT 0,
    usage TEXT,
    use_for TEXT,
    varieties TEXT,
    sizes TEXT,
    colors TEXT,
    price_1 REAL,
    price_2 REAL,
    price_3 REAL,
    price_4 REAL,
    price_5 REAL,
    name_th TEXT,
    sku TEXT UNIQUE,
    moq TEXT,
    is_visible INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table for multiple images per product
CREATE TABLE IF NOT EXISTS product_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    image_key TEXT NOT NULL,
    attribute_type TEXT, -- 'gallery' or 'variant_link'
    attribute_value TEXT, -- free-text label for variant_link images, e.g. 'Red / L'
    is_main BOOLEAN DEFAULT 0,
    price_1 REAL, -- per-image price override, NULL = use product's base price
    price_2 REAL,
    price_3 REAL,
    price_4 REAL,
    price_5 REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Optional: Seed with some test data
-- INSERT INTO products (name, description, price, category, stock) 
-- VALUES ('Sample Product', 'This is a test product created by Antigravity', 99.99, 'Test', 10);

-- Table for orders
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT,
    total_amount REAL,
    status TEXT DEFAULT 'PENDING',
    payment_method TEXT,
    note TEXT,
    tracking_number TEXT,
    line_push_failed INTEGER DEFAULT 0,
    contact_confirmed_at DATETIME,
    contact_confirmed_via TEXT,
    delivery_fee REAL,
    view_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table for order items
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT,
    product_id INTEGER,
    product_name TEXT,
    size TEXT,
    color TEXT,
    quantity INTEGER,
    price REAL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- POS (in-store cash sale) tables, separate from the online orders pipeline
CREATE TABLE IF NOT EXISTS pos_orders (
    order_id TEXT PRIMARY KEY,
    total_amount REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pos_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT,
    product_type TEXT,
    input_price REAL,
    FOREIGN KEY (order_id) REFERENCES pos_orders(order_id) ON DELETE CASCADE
);

-- Table for stock history
CREATE TABLE IF NOT EXISTS stock_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    admin_id TEXT, -- user_id of the admin who made the change
    change_amount INTEGER NOT NULL, -- positive for increment, negative for decrement
    new_stock INTEGER NOT NULL,
    reason TEXT, -- e.g., 'MANUAL_ADJUSTMENT', 'ORDER_CHECKOUT'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Admin login sessions (token hash -> expiry in epoch ms)
CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL
);

-- Sizes, colors and stock (migration 0023)
CREATE TABLE IF NOT EXISTS product_sizes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    label_th TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    box_cost REAL,
    price_1 REAL, price_2 REAL, price_3 REAL, price_4 REAL, price_5 REAL,
    archived_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_sizes_label
    ON product_sizes(product_id, label) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS product_colors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    size_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    name_th TEXT,
    hex TEXT,
    sku TEXT,
    stock INTEGER NOT NULL DEFAULT 0,
    is_visible INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    archived_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (size_id) REFERENCES product_sizes(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_colors_sku
    ON product_colors(sku) WHERE sku IS NOT NULL AND archived_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_colors_name
    ON product_colors(size_id, name) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    color_id INTEGER NOT NULL,
    change_amount INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reason TEXT NOT NULL,
    ref TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (color_id) REFERENCES product_colors(id)
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_color ON stock_movements(color_id);

-- Walk-in cash sales from the admin Cash Sale page (migrations/0025_cash_sales.sql).
CREATE TABLE IF NOT EXISTS cash_sales (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL UNIQUE,
    invoice_ref TEXT NOT NULL UNIQUE,
    sold_at TEXT NOT NULL,
    total_amount REAL NOT NULL,
    line_count INTEGER NOT NULL,
    piece_count INTEGER NOT NULL,
    received_amount REAL,
    note TEXT,
    copy_lang TEXT NOT NULL DEFAULT 'th',
    -- migrations/0026: a tag, not a delete. NULL = counts as normal.
    excluded_at TEXT,
    exclude_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_cash_sales_sold_at ON cash_sales(sold_at);
CREATE TABLE IF NOT EXISTS cash_sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id TEXT NOT NULL,
    line_no INTEGER NOT NULL,
    name TEXT NOT NULL,
    name_en TEXT,
    unit_price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    line_total REAL NOT NULL,
    is_custom INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (sale_id) REFERENCES cash_sales(id)
);
CREATE INDEX IF NOT EXISTS idx_cash_sale_items_sale ON cash_sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_cash_sale_items_name ON cash_sale_items(name);

-- Read-only history imported from the old Access database (migrations/0027_legacy_import.sql).
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
