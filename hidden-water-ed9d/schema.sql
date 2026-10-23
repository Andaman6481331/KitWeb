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
    attribute_type TEXT, -- 'gallery' or 'variant_link'
    attribute_value TEXT, -- free-text label for variant_link images, e.g. 'Red / L'
    is_main BOOLEAN DEFAULT 0,
    price_1 REAL, -- per-image price override, NULL = use product's base price
    price_2 REAL,
    price_3 REAL,
    price_4 REAL,
    price_5 REAL,
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
    contact_confirmed_at DATETIME,
    contact_confirmed_via TEXT,
    delivery_fee REAL,
    view_key TEXT,
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

-- Admin login sessions (token hash -> expiry in epoch ms)
CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL
);

-- Sizes, colors and stock (migration 0023)
CREATE TABLE IF NOT EXISTS product_sizes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    label_th TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    box_cost REAL,
    price_1 REAL, price_2 REAL, price_3 REAL, price_4 REAL, price_5 REAL,
    archived_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_sizes_label
    ON product_sizes(product_id, label) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS product_colors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    size_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    name_th TEXT,
    hex TEXT,
    sku TEXT,
    stock INTEGER NOT NULL DEFAULT 0,
    is_visible INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    archived_at TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (size_id) REFERENCES product_sizes(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_colors_sku
    ON product_colors(sku) WHERE sku IS NOT NULL AND archived_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_colors_name
    ON product_colors(size_id, name) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    color_id INTEGER NOT NULL,
    change_amount INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reason TEXT NOT NULL,
    ref TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (color_id) REFERENCES product_colors(id)
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_color ON stock_movements(color_id);
