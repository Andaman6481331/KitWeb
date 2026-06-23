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
    price_1 REAL,
    price_2 REAL,
    price_3 REAL,
    price_4 REAL,
    price_5 REAL,
    name_th TEXT,
    sku TEXT UNIQUE,
    moq TEXT,
    is_visible INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table for multiple images per product
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

-- Optional: Seed with some test data
-- INSERT INTO products (name, description, price, category, stock) 
-- VALUES ('Sample Product', 'This is a test product created by Antigravity', 99.99, 'Test', 10);

-- Table for orders
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT,
    total_amount REAL,
    status TEXT DEFAULT 'PENDING',
    payment_method TEXT,
    note TEXT,
    tracking_number TEXT,
    line_push_failed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table for order items
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

-- POS (in-store cash sale) tables, separate from the online orders pipeline
CREATE TABLE IF NOT EXISTS pos_orders (
    order_id TEXT PRIMARY KEY,
    total_amount REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pos_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT,
    product_type TEXT,
    input_price REAL,
    FOREIGN KEY (order_id) REFERENCES pos_orders(order_id) ON DELETE CASCADE
);

-- Table for stock history
CREATE TABLE IF NOT EXISTS stock_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    admin_id TEXT, -- user_id of the admin who made the change
    change_amount INTEGER NOT NULL, -- positive for increment, negative for decrement
    new_stock INTEGER NOT NULL,
    reason TEXT, -- e.g., 'MANUAL_ADJUSTMENT', 'ORDER_CHECKOUT'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
