-- 1. name_th and stock_history already exist from previous run or partial success
-- Commenting them out to avoid "duplicate column" or "already exists" errors.
-- ALTER TABLE products ADD COLUMN name_th TEXT;

/*
CREATE TABLE IF NOT EXISTS stock_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    admin_id TEXT,
    change_amount INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
*/

-- 2. Cleanup unused localization columns (D1 supports DROP COLUMN)
-- Run these one by one if they fail, or run this script.
ALTER TABLE products DROP COLUMN description_th;
ALTER TABLE products DROP COLUMN usage_th;
ALTER TABLE products DROP COLUMN use_for_th;
ALTER TABLE products DROP COLUMN varieties_th;
ALTER TABLE products DROP COLUMN sizes_th;
ALTER TABLE products DROP COLUMN colors_th;
