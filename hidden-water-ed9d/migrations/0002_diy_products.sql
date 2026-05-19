-- Migration to create the diy_products table
CREATE TABLE IF NOT EXISTS diy_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_th TEXT,
    price_1 REAL DEFAULT 0.0,
    price_2 REAL DEFAULT 0.0,
    price_3 REAL DEFAULT 0.0,
    description TEXT,
    images TEXT, -- JSON array of image keys uploaded to the kit-image bucket
    stock INTEGER DEFAULT 0,
    sku TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
