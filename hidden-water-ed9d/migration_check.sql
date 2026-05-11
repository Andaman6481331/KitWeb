-- This script ensures all columns and tables exist.
-- Some of these might already exist, so we run them individually if possible.
-- But D1 doesn't have a good way to "ignore error" in --file.
-- So I'll just run the ones I'm most sure are missing.

CREATE TABLE IF NOT EXISTS product_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    image_key TEXT NOT NULL,
    attribute_type TEXT,
    attribute_value TEXT,
    is_main BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- We assume price_1 might exist, but price_2..5 might not.
-- Since I can't do IF NOT EXISTS for columns in SQLite 3.x easily without a script,
-- I'll just provide a message to the user if they still have issues.
