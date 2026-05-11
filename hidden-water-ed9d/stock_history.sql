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
