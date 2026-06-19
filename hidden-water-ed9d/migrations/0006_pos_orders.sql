-- POS (in-store cash sale) tables, separate from the online orders pipeline.
CREATE TABLE IF NOT EXISTS pos_orders (
    order_id     TEXT PRIMARY KEY,
    total_amount REAL,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pos_order_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id     TEXT,
    product_type TEXT,
    input_price  REAL,
    FOREIGN KEY (order_id) REFERENCES pos_orders(order_id) ON DELETE CASCADE
);
