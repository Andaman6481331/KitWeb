-- Migration to create tables for product variants and color links
CREATE TABLE IF NOT EXISTS product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    variant_name TEXT NOT NULL,      -- e.g. '4 inches', '6 inches'
    sku TEXT UNIQUE NOT NULL,        -- e.g. 'UK001-4IN'
    price_1 REAL DEFAULT 0.0,
    price_2 REAL DEFAULT 0.0,
    price_3 REAL DEFAULT 0.0,
    price_4 REAL DEFAULT 0.0,
    price_5 REAL DEFAULT 0.0,
    stock INTEGER DEFAULT 0,
    image_key TEXT,                  -- Optional: Uploaded image key if this variant has no colors
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS variant_colors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    variant_id INTEGER NOT NULL,
    color_name TEXT NOT NULL,        -- e.g. 'Red', 'Blue'
    image_key TEXT,                  -- Uploaded image key for this specific color link
    stock INTEGER DEFAULT 0,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
);
