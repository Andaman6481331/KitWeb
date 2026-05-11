-- Migration to add multi-price columns and multi-image table
ALTER TABLE products ADD COLUMN price_1 REAL;
ALTER TABLE products ADD COLUMN price_2 REAL;
ALTER TABLE products ADD COLUMN price_3 REAL;
ALTER TABLE products ADD COLUMN price_4 REAL;
ALTER TABLE products ADD COLUMN price_5 REAL;

CREATE TABLE IF NOT EXISTS product_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    image_key TEXT NOT NULL,
    attribute_type TEXT, -- 'variety', 'color', 'size', or 'gallery'
    attribute_value TEXT, -- e.g., 'Blue', 'XL'
    is_main BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
