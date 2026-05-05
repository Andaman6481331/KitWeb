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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Seed with some test data
INSERT INTO products (name, description, price, category, stock) 
VALUES ('Sample Product', 'This is a test product created by Antigravity', 99.99, 'Test', 10);
