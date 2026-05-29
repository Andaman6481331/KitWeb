-- Multi-category support: junction table + Thai category names
-- Safe for existing data: only adds a new table/column and backfills from products.category

CREATE TABLE IF NOT EXISTS product_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    category_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(product_id, category_path)
);

-- Backfill existing single-category products (does not modify products.category)
INSERT OR IGNORE INTO product_categories (product_id, category_path)
SELECT id, category FROM products WHERE category IS NOT NULL AND TRIM(category) != '';

-- Thai display name for categories (nullable; existing rows unchanged)
ALTER TABLE categories ADD COLUMN name_th TEXT;
