-- Complete schema for product-db
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
    price_1 REAL DEFAULT 0,
    price_2 REAL DEFAULT 0,
    price_3 REAL DEFAULT 0,
    price_4 REAL DEFAULT 0,
    price_5 REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    default_usage TEXT,
    default_use_for TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT,
    total_amount REAL,
    status TEXT DEFAULT 'PENDING',
    payment_method TEXT,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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

-- Insert default categories if empty
INSERT INTO categories (name, path) SELECT 'Knitting Yarn', 'knitting-yarn' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE path = 'knitting-yarn');
INSERT INTO categories (name, path) SELECT 'Crochet Thread', 'crochet-thread' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE path = 'crochet-thread');
INSERT INTO categories (name, path) SELECT 'Beads & Sequins', 'beads-sequins' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE path = 'beads-sequins');
