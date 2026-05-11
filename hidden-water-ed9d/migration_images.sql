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
