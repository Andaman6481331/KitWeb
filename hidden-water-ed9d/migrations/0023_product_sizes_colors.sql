-- Sizes, colors and stock for the admin product editor. Additive only: no column the
-- storefront reads changes, nothing is deleted (removed sizes and colors are archived),
-- and there is no ON DELETE CASCADE. Apply with `wrangler d1 execute --remote --file`,
-- never `migrations apply` (see the deploy-workflow note).

CREATE TABLE IF NOT EXISTS product_sizes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    label TEXT NOT NULL,              -- "25 g", '4.5"'
    label_th TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    box_cost REAL,                    -- factory cost per BOX, staff-only, optional
    price_1 REAL, price_2 REAL, price_3 REAL, price_4 REAL, price_5 REAL,  -- per BOX
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
    hex TEXT,                         -- swatch, "#c0392b"
    sku TEXT,
    stock INTEGER NOT NULL DEFAULT 0, -- in PIECES
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

-- Every stock change, by hand or by an invoice. Replaces the never-applied stock_history.
CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    color_id INTEGER NOT NULL,
    change_amount INTEGER NOT NULL,   -- signed, pieces
    new_stock INTEGER NOT NULL,
    reason TEXT NOT NULL,             -- INITIAL | MANUAL_EDIT | INVOICE_PAID
    ref TEXT,                         -- invoice number for INVOICE_PAID
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (color_id) REFERENCES product_colors(id)
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_color ON stock_movements(color_id);
